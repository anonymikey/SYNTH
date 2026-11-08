import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const chat = readFileSync(new URL('../components/Chat.js', import.meta.url), 'utf8');
const css = readFileSync(new URL('../app/globals.css', import.meta.url), 'utf8');

test('empty Assistant presents the SYNTH logo, concise guidance, composer, then actionable starter prompts', () => {
  const logo = chat.indexOf('className="welcome-logo"');
  const headline = chat.indexOf('<h2>Ready when you are.</h2>');
  const composer = chat.indexOf('className="welcome-composer"');
  const starters = chat.indexOf('className="welcome-starters"');
  assert.ok(logo >= 0 && headline > logo && composer > headline && starters > composer);
  assert.match(chat, /Ask a question, share an image, or record a voice note/);
  assert.match(chat, /IDEAS\.map\(\(text\) => <button[^>]*onClick=\{\(\) => send\(text\)\}/);
  assert.match(chat, /Explain neural networks simply/);
});

test('Assistant reuses one composer implementation and keeps existing attachment, voice, image and chat actions', () => {
  assert.match(chat, /function renderComposer\(\)/);
  assert.match(chat, /<AttachButton a=\{a\} \/>/);
  assert.match(chat, /<VoiceInput onText=/);
  assert.match(chat, /onPaste=\{!imageMode \? a\.onPaste : undefined\}/);
  assert.match(chat, /Generate an image with SYNTH Image Master/);
  assert.match(chat, /imageMode \? generateImage\(\) : send\(\)/);
  assert.match(chat, /aria-label="Stop response"/);
  assert.match(chat, /<ResponseToolbar/);
  assert.match(chat, /<ToolRuns/);
  assert.match(chat, /onClick=\{clearChat\}>Clear chat/);
  assert.match(chat, /Optional image and voice tools use connected services/);
  assert.equal((chat.match(/\{renderComposer\(\)\}/g) || []).length, 2);
});

test("empty welcome styling preserves SYNTH's palette and adapts prompt cards to phones and short screens", () => {
  assert.match(css, /\.chat\.chat-empty\{max-width:1000px/);
  assert.match(css, /\.chat-empty \.welcome-logo\{width:clamp/);
  assert.match(css, /\.chat-empty \.welcome-composer\{width:min\(100%,860px\)/);
  assert.match(css, /\.chat-empty \.chips\{display:grid;grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(css, /@media\(max-width:560px\)\{[\s\S]*?\.chat-empty \.chips\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(css, /@media\(max-width:380px\)\{[\s\S]*?\.chat-empty \.chips\{grid-template-columns:1fr\}/);
  assert.match(css, /\.chat-empty \.welcome\{padding-top:8px;padding-bottom:10px\}/);
  assert.match(css, /\.chat-empty \.welcome-logo\{width:54px;margin-bottom:2px\}/);
  assert.match(css, /\.chat-empty \.welcome-composer\{margin-top:8px\}/);
  assert.match(css, /@media\(max-height:650px\) and \(max-width:900px\)/);
  assert.match(css, /env\(safe-area-inset-bottom\)/);
});
