import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseInline, parseMarkdown } from '../lib/markdown.js';
import { makeSource, sanitizeSources } from '../lib/sources.js';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');

test('headings with valid ATX markers render as heading blocks while literal hashes remain text', () => {
  const blocks = parseMarkdown('### Key result\nA line under the heading.\n#literal is not a heading.');
  assert.deepEqual(blocks.map((block) => block.type), ['heading', 'paragraph']);
  assert.equal(blocks[0].level, 3);
  assert.equal(blocks[0].content.map((token) => token.value).join(''), 'Key result');
  assert.equal(blocks[1].lines[1][0].value, '#literal is not a heading.');
});

test('unordered and ordered lists are recognized even when adjacent to paragraphs and headings', () => {
  const blocks = parseMarkdown('Intro\n- first\n* second\n2. third\n3) fourth\n## Next');
  assert.deepEqual(blocks.map((block) => block.type), ['paragraph', 'list', 'list', 'heading']);
  assert.equal(blocks[1].ordered, false);
  assert.deepEqual(blocks[1].items.map((item) => item[0].value), ['first', 'second']);
  assert.equal(blocks[2].ordered, true);
  assert.deepEqual(blocks[2].items.map((item) => item[0].value), ['third', 'fourth']);
  assert.equal(blocks[3].level, 2);
});

test('blockquotes, fenced code, emphasis and links retain their content without rendering raw block markers', () => {
  const blocks = parseMarkdown('> quoted text\n\n**bold** and *italic* with [source](https://example.org/path).\n\n```ts\nconst x = 1;\n```');
  assert.deepEqual(blocks.map((block) => block.type), ['quote', 'paragraph', 'code']);
  assert.equal(blocks[0].lines[0][0].value, 'quoted text');
  assert.equal(blocks[1].lines[0].find((part) => part.type === 'strong').value, 'bold');
  assert.equal(blocks[1].lines[0].find((part) => part.type === 'em').value, 'italic');
  assert.equal(blocks[1].lines[0].find((part) => part.type === 'link').href, 'https://example.org/path');
  assert.equal(blocks[2].language, 'ts');
  assert.equal(blocks[2].value, 'const x = 1;');
});

test('inline links accept only credential-free HTTP(S) destinations', () => {
  const unsafe = parseInline('[bad](javascript:alert(1))');
  const credentialed = parseInline('[bad](https://user:pass@example.org/)');
  const local = parseInline('[bad](http://127.0.0.1/private)');
  assert.equal(unsafe.some((part) => part.type === 'link'), false);
  assert.equal(credentialed.some((part) => part.type === 'link'), false);
  assert.equal(local.some((part) => part.type === 'link'), false);
});

test('source cards reject unsafe URLs, normalize display fields, deduplicate and cap metadata', () => {
  assert.equal(makeSource('javascript:alert(1)', 'bad', 'bad'), null);
  assert.equal(makeSource('http://localhost/private', 'bad', 'bad'), null);
  assert.equal(makeSource('http://192.168.1.2/private', 'bad', 'bad'), null);
  const sources = sanitizeSources([
    { url: 'https://www.example.org/article#section', title: '<b>Example</b> &amp; more', snippet: '  One\nshort excerpt.  ' },
    { url: 'https://www.example.org/article', title: 'Duplicate', snippet: 'Ignored' },
    { url: 'https://another.org/page', title: 'Another', excerpt: 'Useful details' },
  ]);
  assert.equal(sources.length, 2);
  assert.equal(sources[0].host, 'example.org');
  assert.equal(sources[0].title, 'Example & more');
  assert.equal(sources[0].snippet, 'One short excerpt.');
  assert.equal(sanitizeSources(Array.from({ length: 20 }, (_, i) => ({ url: `https://site${i}.org/`, title: `Site ${i}` }))).length, 12);
});

test('website sources flow through the existing SSE events into the answer disclosure without history persistence', () => {
  const agent = read('../lib/agent.js');
  const tools = read('../lib/tools.js');
  const stream = read('../lib/stream.js');
  const chat = read('../components/Chat.js');
  const toolRuns = read('../components/ToolRuns.js');
  const route = read('../app/api/chat/route.js');
  const css = read('../app/globals.css');
  assert.match(tools, /Array\.isArray\(out\.sources\)/);
  assert.match(tools, /id: 'github#search'/);
  assert.match(agent, /const sources = sanitizeSources\(r\.sources, 8\)/);
  assert.match(agent, /\.\.\.\(sources\.length \? \{ sources \} : \{\}\)/);
  assert.match(stream, /onEvent\(j\.synth\)/);
  assert.match(chat, /<SourcesDisclosure sources=\{message\.tools/);
  assert.match(chat, /tool\.sources\?\.length/);
  assert.match(toolRuns, /t\.sources\?\.length \? <SourceCards/);
  assert.match(route, /new Response\(r\.stream/);
  assert.match(chat, /reply: full/);
  assert.doesNotMatch(chat, /sources:\s*message\.tools/);
  assert.ok(css.indexOf('.source-preview-cards{display:grid;grid-template-columns:repeat(2') < css.lastIndexOf('@media(max-width:560px){.source-preview-cards{grid-template-columns:1fr}'));
});
