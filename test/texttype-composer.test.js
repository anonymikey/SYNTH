import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');

test('animated textarea keeps the real controlled input and configured TextType effect', () => {
  const wrapper = read('../components/AnimatedTextarea.js');
  assert.match(wrapper, /forwardRef/);
  assert.match(wrapper, /\{\.\.\.props\}/);
  assert.match(wrapper, /value=\{value\}/);
  assert.match(wrapper, /placeholder=\{placeholder\}/);
  assert.match(wrapper, /aria-hidden="true"/);
  assert.match(wrapper, /setFocused\(true\)/);
  assert.match(wrapper, /setFocused\(false\)/);

  for (const prop of [
    /typingSpeed=\{75\}/,
    /pauseDuration=\{1500\}/,
    /deletingSpeed=\{50\}/,
    /deleteMode="backspace"/,
    /typeEffect="fade"/,
    /mistakes=\{0\.2\}/,
    /cursorStyle="bar"/,
    /cursorGlide/,
    /showCursor/,
  ]) assert.match(wrapper, prop);
});

test('Assistant and SYNTHCODE cover their composer modes with context-specific text cycles', () => {
  const chat = read('../components/Chat.js');
  const builder = read('../components/Builder.js');

  assert.match(chat, /ASSISTANT_TEXT_PROMPTS/);
  assert.match(chat, /ASSISTANT_IMAGE_PROMPTS/);
  assert.match(chat, /typingTexts=\{imageMode \? ASSISTANT_IMAGE_PROMPTS : ASSISTANT_TEXT_PROMPTS\}/);
  assert.match(chat, /onPaste=\{!imageMode \? a\.onPaste : undefined\}/);

  assert.equal((builder.match(/<AnimatedTextarea/g) || []).length, 2);
  for (const promptSet of ['BUILDER_WELCOME_PROMPTS', 'BUILDER_EDIT_PROMPTS', 'BUILDER_QUEUE_PROMPTS', 'BUILDER_CLARIFICATION_PROMPTS']) {
    assert.ok(builder.includes(promptSet), `missing SYNTHCODE prompt set ${promptSet}`);
  }
  assert.match(builder, /builderPlaceholderPrompts\(busy, last, hasFiles\)/);
  assert.match(builder, /onPaste=\{a\.onPaste\}/);
  assert.match(builder, /onKeyDown=\{\(e\) => \{ if \(e\.key === 'Enter' && !e\.shiftKey\)/);
});

test('copied TextType source retains its third-party license notice', () => {
  const license = read('../licenses/reactbits-texttype.md');
  assert.match(license, /MIT \+ Commons Clause License Condition v1\.0/);
  assert.match(license, /Copyright \(c\) 2026 David Haz/);
  assert.match(license, /The above copyright notice and this permission notice shall be included/);
  assert.match(license, /not sell, sublicense, or redistribute the components themselves/);
});

test('TextType respects reduced motion and the composer overlay remains non-interactive', () => {
  const textType = read('../components/TextType.jsx');
  const textTypeCss = read('../components/TextType.css');
  const workspaceCss = read('../app/globals.css');
  const packageJson = JSON.parse(read('../package.json'));

  assert.match(textType, /prefers-reduced-motion: reduce/);
  assert.match(read('../components/AnimatedTextarea.js'), /new IntersectionObserver/);
  assert.match(read('../components/AnimatedTextarea.js'), /entry\.intersectionRatio >= 0\.1/);
  assert.match(textTypeCss, /text-type__cursor--bar/);
  assert.match(workspaceCss, /composer-placeholder-overlay[^\n]*pointer-events:none/);
  assert.match(workspaceCss, /data-typing-placeholder="true"\] textarea::placeholder\{color:transparent\}/);
  assert.match(packageJson.dependencies.gsap, /^\^3\.\d+\.\d+$/);
  const installedMinor = Number(packageJson.dependencies.gsap.match(/^\^3\.(\d+)\./)?.[1]);
  assert.ok(Number.isFinite(installedMinor) && installedMinor >= 13, 'GSAP must satisfy React Bits’ ^3.13.0 requirement');
});
