import test from 'node:test';
import assert from 'node:assert/strict';
import { criticalChangedPaths, criticalChangeReason, isClarifyingReply, isExplanationRequest } from '../lib/builder-safety.js';

test('ordinary reversible interface work proceeds without a high-impact confirmation', () => {
  assert.equal(criticalChangeReason('Make the navigation narrower and add a subtle hover animation.'), '');
  assert.equal(criticalChangeReason('Add a filter to the product cards.'), '');
});

test('sensitive requests are identified before generation with a clear reason', () => {
  assert.match(criticalChangeReason('Change the OAuth session and permission checks.'), /sign-in|security|permissions/i);
  assert.match(criticalChangeReason('Add GitHub sign-up and account authorization.'), /identity|security|sign-in/i);
  assert.match(criticalChangeReason('Drop all existing customer data from the production database.'), /stored data|delete|database/i);
  assert.match(criticalChangeReason('Deploy this service to production.'), /production deployment/i);
  assert.match(criticalChangeReason('Deploy this service to Vercel.'), /production deployment/i);
  assert.match(criticalChangeReason('Add a new package dependency for the backend.'), /dependencies|tooling/i);
  assert.match(criticalChangeReason('Replace the framework and upgrade all dependencies.'), /project foundations|dependencies/i);
});

test('sensitive source paths are detected without flagging ordinary UI files', () => {
  assert.deepEqual(criticalChangedPaths([
    { path: 'src/auth/session.ts', kind: 'edit' },
    { path: 'app/styles.css', kind: 'edit' },
    { path: '.github/workflows/release.yml', kind: 'new' },
    { path: 'app/api/account/route.ts', kind: 'edit' },
    { path: 'requirements.txt', kind: 'edit' },
    { path: 'package.json', kind: 'edit' },
  ]), ['src/auth/session.ts', '.github/workflows/release.yml', 'app/api/account/route.ts', 'requirements.txt', 'package.json']);
  assert.deepEqual(criticalChangedPaths([{ path: 'styles.css', kind: 'edit' }]), []);
});

test('model clarification and explanation-only requests are distinguished from code edits', () => {
  assert.equal(isClarifyingReply('Are you comfortable with replacing the current authentication flow?'), true);
  assert.equal(isClarifyingReply('I updated the layout as requested.'), false);
  assert.equal(isClarifyingReply('```js file=app.js\nalert(1)\n```'), false);
  assert.equal(isExplanationRequest('Explain the last change and why it was made.'), true);
  assert.equal(isExplanationRequest('Explain and fix the last change.'), false);
});
