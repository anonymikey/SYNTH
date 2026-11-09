from __future__ import annotations

import os
import unittest
from pathlib import Path
from unittest.mock import patch

from fastapi import HTTPException

import app


class PublicSourcesAdapterTests(unittest.TestCase):
    def test_only_the_five_approved_public_actions_are_callable(self):
        self.assertEqual(
            set(app._ALLOWED_ACTIONS),
            {
                ("github", "search"),
                ("github", "read"),
                ("youtube", "search"),
                ("youtube", "read"),
                ("youtube", "subtitle"),
            },
        )
        for channel, action in (("youtube", "transcribe"), ("github", "write")):
            with self.subTest(channel=channel, action=action):
                payload = app.ExecuteRequest(channel=channel, action=action, params={})
                with self.assertRaises(HTTPException) as error:
                    app.execute_request(payload)
                self.assertEqual(error.exception.status_code, 400)

    def test_github_reader_accepts_only_public_repository_issue_and_pull_urls(self):
        for target in (
            "Panniantong/Agent-Reach",
            "https://github.com/Panniantong/Agent-Reach",
            "https://github.com/Panniantong/Agent-Reach/issues/1",
            "https://github.com/Panniantong/Agent-Reach/pull/2",
        ):
            with self.subTest(target=target):
                payload = app.ExecuteRequest(channel="github", action="read", params={"target": target})
                with patch.object(app, "run_action", return_value={"ok": True, "items": []}):
                    self.assertEqual(app.execute_request(payload), {"ok": True, "items": []})
        for target in (
            "http://github.com/owner/repo",
            "https://github.com.evil.example/owner/repo",
            "https://api.github.com/repos/owner/repo",
            "https://github.com/owner/repo?redirect=https://example.org",
            "https://user:pass@github.com/owner/repo",
        ):
            with self.subTest(target=target):
                payload = app.ExecuteRequest(channel="github", action="read", params={"target": target})
                with self.assertRaises(HTTPException):
                    app.execute_request(payload)

    def test_github_calls_are_forced_to_unauthenticated_public_rest_with_a_deadline(self):
        payload = app.ExecuteRequest(channel="github", action="search", params={"query": "agent reach", "limit": 2})
        envelope = {"ok": True, "items": []}
        with patch.object(app, "run_action", return_value=envelope) as run:
            self.assertEqual(app.execute_request(payload), {"ok": True, "items": []})
        run.assert_called_once_with(app._CHANNELS["github"], "search", {"query": "agent reach", "limit": 2}, timeout=9.0, only_backend="github-api")

    def test_youtube_subtitle_uses_only_ytdlp_and_rejects_non_youtube_urls(self):
        valid = app.ExecuteRequest(channel="youtube", action="subtitle", params={"target": "https://www.youtube.com/watch?v=jNQXAC9IVRw", "lang": "en,en-orig"})
        with patch.object(app, "run_action", return_value={"ok": True, "items": []}) as run:
            app.execute_request(valid)
        run.assert_called_once_with(app._CHANNELS["youtube"], "subtitle", {"target": "https://www.youtube.com/watch?v=jNQXAC9IVRw", "lang": "en,en-orig"}, timeout=9.0, only_backend="yt-dlp")

        invalid = app.ExecuteRequest(channel="youtube", action="read", params={"target": "https://example.org/video"})
        with self.assertRaises(HTTPException):
            app.execute_request(invalid)

    def test_youtube_targets_are_canonical_public_video_urls_only(self):
        canonical = "https://www.youtube.com/watch?v=jNQXAC9IVRw"
        for target in (
            "jNQXAC9IVRw",
            canonical,
            "https://youtu.be/jNQXAC9IVRw?t=17",
            "https://www.youtube.com/shorts/jNQXAC9IVRw?feature=share",
        ):
            with self.subTest(target=target):
                self.assertEqual(app._validate_youtube_target(target), canonical)
        for target in (
            "http://www.youtube.com/watch?v=jNQXAC9IVRw",
            "https://www.youtube.com/redirect?url=https://example.org",
            "https://www.youtube.com/playlist?list=PL123",
            "https://www.youtube.com/channel/UC123",
            "https://user:pass@www.youtube.com/watch?v=jNQXAC9IVRw",
        ):
            with self.subTest(target=target), self.assertRaises(HTTPException):
                app._validate_youtube_target(target)

    def test_result_normalization_discards_raw_fields_and_bounds_content(self):
        result = app._normalize_result({
            "ok": True,
            "backend": "github-api",
            "meta": {"elapsed_ms": 12},
            "items": [{
                "title": "Public repository",
                "url": "https://github.com/example/project",
                "author": "maintainer",
                "published_at": "2026-01-01",
                "text": "x" * 20_000,
                "raw": {"secret": "must not escape"},
            }],
        }, "github")
        self.assertTrue(result["ok"])
        self.assertEqual(len(result["items"]), 1)
        item = result["items"][0]
        self.assertEqual(set(item), {"title", "url", "author", "publishedAt", "text", "snippet"})
        self.assertEqual(len(item["text"]), app._MAX_CONTENT_CHARS)
        self.assertEqual(len(item["snippet"]), 360)
        self.assertNotIn("raw", item)

    def test_non_public_source_urls_and_credentialed_urls_are_dropped(self):
        for channel, url in (
            ("github", "https://github.com.evil.example/project"),
            ("github", "https://user:pass@github.com/project/repo"),
            ("youtube", "https://youtube.com.evil.example/watch?v=123"),
            ("youtube", "https://www.youtube.com/redirect?url=https://example.org"),
            ("youtube", "http://127.0.0.1/private"),
        ):
            with self.subTest(channel=channel, url=url):
                self.assertIsNone(app._safe_public_url(url, channel))

    def test_upstream_failure_is_reduced_to_a_code_only(self):
        result = app._normalize_result({
            "ok": False,
            "error": {"code": "RATE_LIMITED", "message": "private implementation detail", "hint": "internal"},
        }, "github")
        self.assertEqual(result, {"ok": False, "code": "RATE_LIMITED"})
        self.assertNotIn("message", str(result))

    def test_service_uses_an_empty_private_temporary_home_and_removes_tokens(self):
        self.assertTrue(Path(app._PRIVATE_HOME).is_relative_to(Path("/tmp")))
        self.assertEqual(Path(app._PRIVATE_HOME).stat().st_mode & 0o777, 0o700)
        self.assertNotIn("GH_TOKEN", os.environ)
        self.assertNotIn("GITHUB_TOKEN", os.environ)
        self.assertIsNone(app.app.openapi_url)


if __name__ == "__main__":
    unittest.main()
