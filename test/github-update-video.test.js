import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, statSync } from 'node:fs';

const player = readFileSync(new URL('../components/GitHubUpdateVideo.js', import.meta.url), 'utf8');
const listing = readFileSync(new URL('../app/dev-updates/page.js', import.meta.url), 'utf8');
const article = readFileSync(new URL('../app/dev-updates/[slug]/page.js', import.meta.url), 'utf8');
const landing = readFileSync(new URL('../components/landing/Landing.js', import.meta.url), 'utf8');
const styles = readFileSync(new URL('../app/globals.css', import.meta.url), 'utf8');
const landingStyles = readFileSync(new URL('../app/landing.css', import.meta.url), 'utf8');
const asset = new URL('../public/videos/synth-github-update.mp4', import.meta.url);

test('the supplied GitHub walkthrough is saved unchanged in project static assets', () => {
  assert.ok(statSync(asset).size > 0);
  const digest = createHash('sha256').update(readFileSync(asset)).digest('hex');
  assert.equal(digest, '0a46166dcf15c40c06a2a1036d853826d52104abf9c56eb0909ab6ee89c8ce0b');
  assert.match(player, /VIDEO_SRC = '\/videos\/synth-github-update\.mp4'/);
});

test('GitHub update uses a full-width native 16:9 player on its listing and detail entry', () => {
  assert.match(player, /<video controls playsInline preload="metadata"/);
  assert.match(listing, /synthcode-github-repository-workflow' && <GitHubUpdateVideoPlayer/);
  assert.match(article, /u\.slug === 'synthcode-github-repository-workflow'/);
  assert.match(article, /<GitHubUpdateVideoPlayer \/>/);
  assert.match(styles, /\.gh-update-video\{[^}]*width:100%[^}]*aspect-ratio:16\/9[^}]*border-radius:/);
  assert.match(styles, /\.gh-update-video video\{[^}]*width:100%[^}]*height:100%/);
});

test('Read more opens an accessible modal with playback and a link to the full GitHub update', () => {
  assert.match(listing, /<GitHubUpdateReadMore href=\{`\/dev-updates\/\$\{u\.slug\}`\}/);
  assert.match(player, /onClick=\{\(\) => setOpen\(true\)\}/);
  assert.match(player, /<dialog/);
  assert.match(player, /dialog\.showModal\(\)/);
  assert.match(player, /className="gh-update-dialog-close"[^>]*aria-label="Close video"/);
  assert.match(player, /<GitHubUpdateVideoPlayer className="gh-update-modal-player" \/>/);
  assert.match(player, /Read the full update/);
});

test('landing page features the newest GitHub-in-SYNTHCODE implementation and links to the update', () => {
  assert.match(landing, /className="sec gh-release"/);
  assert.match(landing, /LATEST IMPLEMENTATION · SYNTHCODE/);
  assert.match(landing, /<GitHubUpdateVideoPlayer className="gh-release-player" \/>/);
  assert.match(landing, /href="\/dev-updates\/synthcode-github-repository-workflow"/);
  assert.match(landingStyles, /\.ld \.gh-release \.gh-release-card\{[^}]*display:grid/);
  assert.match(landingStyles, /@media\(max-width:900px\)\{\.ld \.gh-release \.gh-release-card\{grid-template-columns:1fr/);
});
