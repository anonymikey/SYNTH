from __future__ import annotations

import os
import re
import tempfile
from pathlib import Path
from typing import Any, Literal
from urllib.parse import parse_qs, urlsplit

# Agent-Reach reads GitHub credentials from the environment and from
# ~/.agent-reach/config.yaml. Give this isolated service a fresh, private HOME
# before importing it, and remove credential variables so the API backend is
# always unauthenticated. The directory is ephemeral in Vercel Functions.
_PRIVATE_HOME = Path(tempfile.mkdtemp(prefix="synth-agent-reach-", dir="/tmp"))
os.environ["HOME"] = str(_PRIVATE_HOME)
os.environ["XDG_CONFIG_HOME"] = str(_PRIVATE_HOME / ".config")
for _credential_name in ("GH_TOKEN", "GITHUB_TOKEN"):
    os.environ.pop(_credential_name, None)

from fastapi import FastAPI, HTTPException  # noqa: E402
from pydantic import BaseModel, ConfigDict, Field  # noqa: E402

from agent_reach.channels.github import GitHubChannel  # noqa: E402
from agent_reach.channels.youtube import YouTubeChannel  # noqa: E402
from agent_reach.runtime.dispatch import run_action  # noqa: E402

_TIMEOUT_SECONDS = 9.0
_MAX_ITEMS = 5
_MAX_CONTENT_CHARS = 9_000
_MAX_QUERY_CHARS = 160
_MAX_TARGET_CHARS = 300
_ALLOWED_ACTIONS = {
    ("github", "search"): "github-api",
    ("github", "read"): "github-api",
    ("youtube", "search"): "yt-dlp",
    ("youtube", "read"): "yt-dlp",
    ("youtube", "subtitle"): "yt-dlp",
}
_ERROR_CODES = {
    "BAD_INPUT",
    "NEED_LOGIN",
    "NEED_SETUP",
    "NOT_FOUND",
    "PLATFORM_BLOCKED",
    "RATE_LIMITED",
    "TIMEOUT",
    "UPSTREAM_BROKEN",
}
_CHANNELS = {"github": GitHubChannel(), "youtube": YouTubeChannel()}

app = FastAPI(title="SYNTH Public Sources", docs_url=None, redoc_url=None, openapi_url=None)


class ExecuteRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    channel: Literal["github", "youtube"]
    action: str = Field(min_length=1, max_length=24)
    params: dict[str, Any] = Field(default_factory=dict)


def _required_text(params: dict[str, Any], key: str, limit: int) -> str:
    value = params.get(key)
    if not isinstance(value, str):
        raise HTTPException(status_code=400, detail="Invalid public-source request.")
    value = value.strip()
    if not value or len(value) > limit or any(ord(char) < 32 or ord(char) == 127 for char in value):
        raise HTTPException(status_code=400, detail="Invalid public-source request.")
    return value


def _validate_github_target(value: str) -> str:
    if re.fullmatch(r"[A-Za-z0-9_.-]{1,39}/[A-Za-z0-9_.-]{1,100}", value):
        owner, repo = value.split("/", 1)
        if owner not in {".", ".."} and repo not in {".", ".."}:
            return value
    candidate = value if "://" in value else f"https://github.com/{value}"
    try:
        parsed = urlsplit(candidate)
        host = (parsed.hostname or "").lower().rstrip(".")
        port = parsed.port
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid public-source request.") from None
    path_ok = re.fullmatch(r"/[A-Za-z0-9_.-]{1,39}/[A-Za-z0-9_.-]{1,100}(?:/(?:issues|pull)/[1-9][0-9]*)?/?", parsed.path)
    if parsed.scheme != "https" or host not in {"github.com", "www.github.com"} or parsed.username or parsed.password or port not in {None, 443} or not path_ok or parsed.query or parsed.fragment:
        raise HTTPException(status_code=400, detail="Invalid public-source request.")
    return f"https://github.com{parsed.path}"


def _validate_youtube_target(value: str) -> str:
    if re.fullmatch(r"[A-Za-z0-9_-]{11}", value):
        return f"https://www.youtube.com/watch?v={value}"
    candidate = value if "://" in value else f"https://{value}"
    try:
        parsed = urlsplit(candidate)
        host = (parsed.hostname or "").lower().rstrip(".")
        port = parsed.port
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid public-source request.") from None
    allowed = host in {"youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be", "www.youtu.be"}
    if parsed.scheme != "https" or parsed.username or parsed.password or port not in {None, 443} or not allowed:
        raise HTTPException(status_code=400, detail="Invalid public-source request.")

    video_id = None
    if host in {"youtu.be", "www.youtu.be"}:
        segments = [part for part in parsed.path.split("/") if part]
        if len(segments) == 1:
            video_id = segments[0]
    elif parsed.path.rstrip("/") == "/watch":
        ids = parse_qs(parsed.query).get("v", [])
        if len(ids) == 1:
            video_id = ids[0]
    else:
        segments = [part for part in parsed.path.split("/") if part]
        if len(segments) == 2 and segments[0] in {"shorts", "embed", "live"}:
            video_id = segments[1]
    if not isinstance(video_id, str) or not re.fullmatch(r"[A-Za-z0-9_-]{11}", video_id):
        raise HTTPException(status_code=400, detail="Invalid public-source request.")
    return f"https://www.youtube.com/watch?v={video_id}"


def _validated_params(channel: str, action: str, params: dict[str, Any]) -> dict[str, Any]:
    if (channel, action) not in _ALLOWED_ACTIONS:
        raise HTTPException(status_code=400, detail="Unsupported public-source action.")
    if not isinstance(params, dict):
        raise HTTPException(status_code=400, detail="Invalid public-source request.")

    if action == "search":
        allowed = {"query", "limit"}
        if set(params) - allowed:
            raise HTTPException(status_code=400, detail="Invalid public-source request.")
        query = _required_text(params, "query", _MAX_QUERY_CHARS)
        limit = params.get("limit", 5)
        if type(limit) is not int or not 1 <= limit <= _MAX_ITEMS:
            raise HTTPException(status_code=400, detail="Invalid public-source request.")
        return {"query": query, "limit": limit}

    allowed = {"target"} if action == "read" else {"target", "lang"}
    if set(params) - allowed:
        raise HTTPException(status_code=400, detail="Invalid public-source request.")
    target = _required_text(params, "target", _MAX_TARGET_CHARS)
    if channel == "youtube":
        target = _validate_youtube_target(target)
    elif action == "read":
        target = _validate_github_target(target)
    if action != "subtitle":
        return {"target": target}

    lang = params.get("lang", "en,en-orig,sw")
    if not isinstance(lang, str) or len(lang) > 80 or not re.fullmatch(r"[A-Za-z0-9-]{1,20}(?:,[A-Za-z0-9-]{1,20}){0,5}", lang):
        raise HTTPException(status_code=400, detail="Invalid public-source request.")
    return {"target": target, "lang": lang}


def _safe_public_url(value: Any, channel: str) -> str | None:
    if not isinstance(value, str) or len(value) > 2_048 or any(ord(char) < 32 or ord(char) == 127 for char in value):
        return None
    if channel == "youtube":
        try:
            return _validate_youtube_target(value)
        except HTTPException:
            return None
    try:
        parsed = urlsplit(value)
        host = (parsed.hostname or "").lower().rstrip(".")
        port = parsed.port
    except ValueError:
        return None
    allowed_hosts = {"github.com", "www.github.com"} if channel == "github" else {"youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be", "www.youtu.be"}
    allowed = host in allowed_hosts
    if parsed.scheme != "https" or parsed.username or parsed.password or port not in {None, 443} or not allowed:
        return None
    return value


def _bounded_text(value: Any, limit: int) -> str:
    raw = str(value or "").replace("\r\n", "\n").replace("\r", "\n")
    raw = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]", " ", raw).strip()
    return raw[:limit]


def _normalize_result(result: Any, channel: str) -> dict[str, Any]:
    if not isinstance(result, dict) or not isinstance(result.get("ok"), bool):
        return {"ok": False, "code": "UPSTREAM_BROKEN"}
    if not result["ok"]:
        code = ((result.get("error") or {}).get("code") if isinstance(result.get("error"), dict) else None)
        return {"ok": False, "code": code if isinstance(code, str) and code in _ERROR_CODES else "UPSTREAM_BROKEN"}

    normalized = []
    items = result.get("items")
    for item in items[:_MAX_ITEMS] if isinstance(items, list) else []:
        if not isinstance(item, dict):
            continue
        url = _safe_public_url(item.get("url"), channel)
        if not url:
            continue
        content = _bounded_text(item.get("text"), _MAX_CONTENT_CHARS)
        snippet = re.sub(r"\s+", " ", content).strip()[:360]
        title = re.sub(r"\s+", " ", _bounded_text(item.get("title"), 200)).strip()
        author = re.sub(r"\s+", " ", _bounded_text(item.get("author"), 120)).strip()
        published_at = _bounded_text(item.get("published_at"), 40)
        normalized.append({
            "title": title or url,
            "url": url,
            "author": author,
            "publishedAt": published_at,
            "text": content,
            "snippet": snippet,
        })
    return {"ok": True, "items": normalized}


def execute_request(payload: ExecuteRequest) -> dict[str, Any]:
    params = _validated_params(payload.channel, payload.action, payload.params)
    backend = _ALLOWED_ACTIONS[(payload.channel, payload.action)]
    try:
        result = run_action(
            _CHANNELS[payload.channel],
            payload.action,
            params,
            timeout=_TIMEOUT_SECONDS,
            only_backend=backend,
        )
    except Exception:
        return {"ok": False, "code": "UPSTREAM_BROKEN"}
    return _normalize_result(result, payload.channel)


@app.get("/health", include_in_schema=False)
def health() -> dict[str, bool]:
    return {"ok": True}


@app.post("/execute", include_in_schema=False)
def execute(payload: ExecuteRequest) -> dict[str, Any]:
    return execute_request(payload)
