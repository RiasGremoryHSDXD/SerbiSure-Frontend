const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
function store(fetchInbox) {
  const source = fs.readFileSync(path.resolve(__dirname, '../src/features/chat/store/chatStore.ts'), 'utf8');
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', output)(name => {
    if (name === 'react-native') return { Image: { prefetch: async () => {} } };
    if (name.includes('chatApi')) return { fetchChatInbox: fetchInbox };
    throw new Error(`Unexpected dependency ${name}`);
  }, module, module.exports);
  return module.exports.chatStore;
}
const entry = (id, count) => ({ partner_id: id, partner_name: `Person ${id}`, partner_account_type: 'Homeowner',
  partner_profile_image: null, last_message: 'Hello', last_message_time: '2026-10-13T10:00:00Z', unread_count: count });
function deferred() { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; }
function refreshQueue(load, canRun = () => true) {
  const source = fs.readFileSync(path.resolve(__dirname, '../src/features/chat/threadRefreshQueue.ts'), 'utf8');
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const module = { exports: {} };
  new Function('module', 'exports', output)(module, module.exports);
  return module.exports.createThreadRefreshQueue(load, canRun);
}
const settled = () => new Promise(resolve => setImmediate(resolve));

test('an incoming event updates the open thread immediately and bursts during a request get a trailing fetch', async () => {
  let calls = 0; const pending = deferred(); let rendered = [];
  const queue = refreshQueue(async () => {
    rendered = ++calls === 1 ? await pending.promise : ['first', 'incoming'];
  });
  queue.request(true); assert.equal(calls, 1);
  queue.request(); queue.request();
  pending.resolve(['first']); await settled();
  assert.equal(calls, 2); assert.deepEqual(rendered, ['first', 'incoming']);
  queue.stop();
});

test('events during a booking response wait until it finishes instead of being discarded', async () => {
  let busy = true; let calls = 0;
  const queue = refreshQueue(async () => { calls++; }, () => !busy);
  queue.request(); queue.request(); assert.equal(calls, 0);
  busy = false; queue.request(); await settled();
  assert.equal(calls, 1); queue.stop();
});

test('background refreshes wait for foreground and disposed threads cannot fetch again', async () => {
  let active = false; const initials = [];
  const queue = refreshQueue(async initial => { initials.push(initial); }, () => active);
  queue.request(true); queue.request(); assert.deepEqual(initials, []);
  active = true; queue.request(); await settled();
  assert.deepEqual(initials, [true]); queue.stop(); queue.request(); await settled();
  assert.equal(initials.length, 1);
});

test('closing a thread while a request is pending cancels its queued trailing refresh', async () => {
  const pending = deferred(); let calls = 0;
  const queue = refreshQueue(() => { calls++; return pending.promise; });
  queue.request(); queue.request(); queue.stop(); pending.resolve(); await settled();
  assert.equal(calls, 1);
});
test('an event received during an inbox request queues a fresh unread snapshot', async () => {
  const pending = deferred(); let calls = 0;
  const chats = store(() => ++calls === 1 ? pending.promise : Promise.resolve([entry('home', 2)]));
  const first = chats.loadInbox('token'); chats.loadInbox('token', true); chats.loadInbox('token', true);
  pending.resolve([entry('home', 1)]); await first;
  assert.equal(calls, 2); assert.equal(chats.getTotalUnreadCount(), 2);
});
test('switching accounts during a request discards private results from the old session', async () => {
  const pending = deferred();
  const chats = store(token => token === 'first' ? pending.promise : Promise.resolve([entry('new', 1)]));
  const first = chats.loadInbox('first'); await chats.loadInbox('second');
  pending.resolve([entry('private', 9)]); await first;
  assert.equal(chats.getChats()[0].partnerId, 'new'); assert.equal(chats.getTotalUnreadCount(), 1);
});
test('logout invalidates requests and clears message-deletion state for the next session', async () => {
  const pending = deferred(); const chats = store(() => pending.promise);
  chats.markMessageDeleted('message'); const request = chats.loadInbox('token'); chats.clearCache();
  pending.resolve([entry('private', 9)]); await request;
  assert.deepEqual(chats.getChats(), []); assert.equal(chats.isMessageDeleted('message'), false);
});
test('an empty authoritative inbox clears an earlier unread badge', async () => {
  let entries = [entry('home', 3)]; const chats = store(async () => entries);
  await chats.loadInbox('token'); entries = []; await chats.loadInbox('token', true);
  assert.equal(chats.getTotalUnreadCount(), 0); assert.deepEqual(chats.getChats(), []);
});
