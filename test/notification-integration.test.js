import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');

test('Settings has the exact accessible Personalization and Notification tabs', () => {
  const settings = read('../components/Personalization.js');
  assert.match(settings, /role="tablist" aria-label="Settings sections"/);
  assert.match(settings, /label: 'Personalization'/);
  assert.match(settings, /label: 'Notification'/);
  assert.match(settings, /aria-selected=\{activeTab === tab\.id\}/);
  assert.match(settings, /aria-controls=\{`settings-panel-\$\{tab\.id\}`\}/);
  assert.match(settings, /onKeyDown=\{onTabKeyDown\}/);
  assert.match(settings, /<NotificationSettings\s*\/>/);
  assert.match(settings, /localStorage\.setItem\(STORAGE_KEY/);
});

test('the shared task manager is mounted once for both workspace modes', () => {
  const workspace = read('../app/app/page.js');
  assert.equal((workspace.match(/<NotificationManager\s*\/>/g) || []).length, 1);
  const chat = read('../components/Chat.js');
  const builder = read('../components/Builder.js');
  assert.match(chat, /reportTaskNotification\(clientId, 'assistant', 'started'\)/);
  assert.match(builder, /reportTaskNotification\(runKey, 'build', 'started'\)/);
  assert.match(builder, /finishNotification\('completed'\)/);
  assert.match(builder, /finishNotification\(aborted \? 'stopped' : 'failed'\)/);
  assert.match(builder, /finishNotification\('stopped'\)/);
});

test('native task notifications are hidden-tab, permission-gated and content-safe', () => {
  const manager = read('../components/NotificationManager.js');
  const settings = read('../components/NotificationSettings.js');
  assert.match(manager, /if \(!isHidden\(\)\) return/);
  assert.match(manager, /window\.Notification\.permission !== 'granted'/);
  assert.match(manager, /Your Assistant response is ready/);
  assert.match(manager, /Your SYNTHCODE build is complete/);
  assert.doesNotMatch(manager, /detail\.(?:prompt|response|files|image|content)/);
  assert.match(manager, /managerClosedNotifications\.has\(notification\)/);
  assert.match(manager, /notification\.onclose = \(\) => \{[\s\S]*unread\.delete\(taskId\)/);
  assert.match(manager, /const clearUnread = \(\) => \{\s*if \(!isHidden\(\)\) \{[\s\S]*?setFaviconDot\(false\);[\s\S]*?return;/);
  assert.match(manager, /window\.addEventListener\('pageshow', clearUnread\)/);
  assert.match(manager, /let soundDefaultsReady = false/);
  assert.match(manager, /pendingWorkspaceSounds/);
  assert.match(settings, /onClick=\{requestPermission\}/);
  assert.doesNotMatch(settings, /useEffect\(\(\)\s*=>\s*\{[^}]*requestPermission/s);
  assert.match(manager, /icon: '\/icon-192\.png'/);
});

test('Learning Studio sound defaults require admin auth and persistent storage', () => {
  const route = read('../app/api/admin/notification-sounds/route.js');
  const defaults = read('../app/api/notifications/defaults/route.js');
  assert.ok(route.indexOf("if (!isAdmin())") < route.indexOf('await request.json()'));
  assert.match(route, /if \(!persistent\).*503/s);
  assert.match(route, /NOTIFICATION_SOUND_IDS/);
  assert.match(defaults, /normalizeNotificationSoundDefaults/);
  assert.match(defaults, /Cache-Control': 'no-store'/);
  assert.doesNotMatch(defaults, /password|token|cookie/i);
});

test('notification settings explain the loaded-page limit and CSS covers narrow screens', () => {
  const settings = read('../components/NotificationSettings.js');
  const css = read('../app/globals.css');
  assert.match(settings, /page remains loaded/);
  assert.match(settings, /no background push notification/);
  assert.match(css, /\.settings-tabs/);
  assert.match(css, /\.notification-toggle/);
  assert.match(css, /@media\(max-width:560px\)/);
  assert.match(css, /@media\(max-width:640px\)/);
  assert.match(css, /\.admin-sound-grid\{grid-template-columns:1fr\}/);
});
