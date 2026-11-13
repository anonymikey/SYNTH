import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { BUILDER_TEMPLATE_CATEGORIES, BUILDER_TEMPLATES, BUILDER_TEMPLATE_PAGE_SIZE, getBuilderTemplatePage } from '../components/builder-templates.js';
import { BUILDER_TEMPLATE_EXTRAS } from '../components/builder-template-extras.js';

const builder = readFileSync(new URL('../components/Builder.js', import.meta.url), 'utf8');
const css = readFileSync(new URL('../app/globals.css', import.meta.url), 'utf8');
const catalog = [...BUILDER_TEMPLATES, ...BUILDER_TEMPLATE_EXTRAS];
const getPage = (category, index) => getBuilderTemplatePage(category, index, catalog);

test('template categories match the requested order and labels', () => {
  assert.deepEqual(BUILDER_TEMPLATE_CATEGORIES.map(({ label }) => label), [
    'Featured', 'All', 'Landing pages', 'Stores', 'Portfolio', 'Games', 'SaaS', 'Starters',
  ]);
});

test('Featured shows six reference-matched templates and arrows page through every result', () => {
  assert.equal(BUILDER_TEMPLATE_PAGE_SIZE, 6);
  const featured = getPage('featured', 0);
  assert.deepEqual(featured.templates.map(({ title }) => title), [
    'Crosscut', 'Retro terminal', 'Creative agency', 'Look Out Below', 'Climate data story', 'Fusion energy',
  ]);
  assert.equal(featured.total, 12);
  assert.equal(featured.pageCount, 2);
  const nextFeatured = getPage('featured', 1);
  assert.equal(nextFeatured.templates.length, 6);
  assert.equal(nextFeatured.page, 1);
  const allFirst = getPage('all', 0);
  const allLast = getPage('all', 99);
  assert.equal(allFirst.pageCount, 4);
  assert.equal(allFirst.total, 24);
  assert.equal(allLast.page, 3);
  assert.equal(allLast.templates.length, 6);
});

test('each category filters to matching cards with detailed, distinct starter prompts', () => {
  const categories = BUILDER_TEMPLATE_CATEGORIES.filter(({ id }) => !['featured', 'all'].includes(id));
  for (const category of categories) {
    const page = getPage(category.id, 0);
    assert.ok(page.templates.length > 0, `${category.label} should have templates`);
    assert.ok(page.templates.every((item) => item.category === category.id));
    assert.ok(page.templates.every((item) => item.prompt.length > 200));
  }
  assert.equal(new Set(catalog.map(({ id }) => id)).size, catalog.length);
  assert.ok(catalog.every(({ accent, title, prompt }) => accent.startsWith('#') && title && prompt));
});

test('welcome screen places accessible template filters and cards directly after the existing composer', () => {
  const welcome = builder.split('if (welcome) {')[1]?.split("\n  return (\n    <section className={'build'")[0] || '';
  const composerIndex = welcome.indexOf('<div className="compose compose-stack">');
  const templatesIndex = welcome.indexOf('className="bw-templates"');
  const helperIndex = welcome.indexOf("'Enter to build, Shift+Enter");
  assert.ok(composerIndex >= 0 && templatesIndex > composerIndex && helperIndex > templatesIndex);
  assert.match(welcome, /role="tablist" aria-label="Template categories"/);
  assert.match(welcome, /aria-selected=\{templateCategory === category\.id\}/);
  assert.match(welcome, /aria-label="Previous templates"/);
  assert.match(welcome, /aria-label="Next templates"/);
  assert.match(welcome, /onClick=\{\(\) => pick\(item\.prompt\)\}/);
  assert.match(builder, /setPrompt\(t\);[\s\S]*?b\.focus\(\); b\.setSelectionRange\(b\.value\.length, b\.value\.length\)/);
  assert.match(builder, /ArrowLeft[\s\S]*?ArrowRight[\s\S]*?Home[\s\S]*?End/);
});

test('gallery includes dark local previews and responsive six-to-three-to-two column layouts', () => {
  assert.match(css, /\.bw-template-grid\{display:grid;grid-template-columns:repeat\(6,minmax\(0,1fr\)\)/);
  assert.match(css, /@media\(max-width:1000px\)\{\.bw-template-grid\{grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
  assert.match(css, /@media\(max-width:560px\).*?\.bw-template-grid\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/s);
  assert.match(css, /\.bw-template-preview\{[^}]*#070a13/);
  assert.match(css, /prefers-reduced-motion:reduce\).*?\.bw-template-card/);
});
