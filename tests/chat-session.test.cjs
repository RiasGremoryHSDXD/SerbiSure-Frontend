const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const React = require('react');
const Reconciler = require('react-reconciler');
const { DefaultEventPriority } = require('react-reconciler/constants');

// Exercise the real chat component with React reconciliation; replace only native surfaces and I/O.
const append = (parent, child) => {
  parent.children = parent.children.filter(item => item !== child);
  parent.children.push(child);
};
const remove = (parent, child) => { parent.children = parent.children.filter(item => item !== child); };
const renderer = Reconciler({
  supportsMutation: true, isPrimaryRenderer: true, now: Date.now,
  getRootHostContext: () => null, getChildHostContext: () => null,
  getCurrentEventPriority: () => DefaultEventPriority,
  prepareForCommit: () => null, resetAfterCommit() {}, shouldSetTextContent: () => false,
  createInstance: (type, props) => ({ type, props, children: [], scrollToEnd() {}, scrollTo() {}, focus() {} }),
  createTextInstance: text => ({ text, children: [] }), getPublicInstance: instance => instance,
  appendInitialChild: append, appendChild: append, appendChildToContainer: append,
  removeChild: remove, removeChildFromContainer: remove,
  insertBefore(parent, child, before) {
    remove(parent, child); parent.children.splice(parent.children.indexOf(before), 0, child);
  },
  insertInContainerBefore(parent, child, before) {
    remove(parent, child); parent.children.splice(parent.children.indexOf(before), 0, child);
  },
  prepareUpdate: () => true, commitUpdate(instance, _payload, _type, _old, props) { instance.props = props; },
  commitTextUpdate(instance, _old, text) { instance.text = text; }, resetTextContent() {},
  finalizeInitialChildren: () => false, clearContainer(container) { container.children = []; },
  scheduleTimeout: setTimeout, cancelTimeout: clearTimeout, noTimeout: -1, detachDeletedInstance() {},
});

function compile(relative, mocks) {
  const filename = path.resolve(__dirname, '..', relative);
  const source = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    fileName: filename, compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', source)(name => {
    if (name === 'react') return { ...React, default: React };
    if (name in mocks) return mocks[name];
    throw new Error('Unexpected dependency: ' + name);
  }, module, module.exports);
  return module.exports;
}
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};
const payload = text => ({ messages: [{ chat_message_id: text, message_payload: text, is_sender: false,
  createdAt: '2026-10-15T10:00:00Z' }], partnerIsTyping: false, partnerIsOnline: false });
const tick = async () => { await new Promise(resolve => setImmediate(resolve)); renderer.flushPassiveEffects(); };

function screen(t) {
  let user = { id: 'account-one', token: 'token-one', accountType: 'Homeowner' };
  const requests = [], sends = [], previews = [], alerts = [];
  const animation = () => ({ start(callback) { callback?.({ finished: true }); }, stop() {} });
  class Value { setValue() {} interpolate() { return 0; } }
  const native = { StyleSheet: { create: value => value, absoluteFillObject: {}, hairlineWidth: 1 },
    Dimensions: { get: () => ({ width: 390, height: 844 }) }, Platform: { OS: 'android' },
    Animated: { Value, View: 'View', spring: animation, timing: animation, loop: animation, sequence: animation, parallel: animation, delay: animation },
    PanResponder: { create: () => ({ panHandlers: {} }) },
    AppState: { currentState: 'active', addEventListener: () => ({ remove() {} }) },
    Alert: { alert: (...args) => alerts.push(args) }, ToastAndroid: { show() {}, SHORT: 0 }, NativeModules: {},
    Modal: props => props.visible ? React.createElement('Modal', props, props.children) : null,
  };
  for (const type of ['Text', 'View', 'Image', 'TextInput', 'ScrollView', 'Pressable', 'KeyboardAvoidingView', 'ActivityIndicator']) native[type] = type;
  const api = {
    fetchChatThreadDetails(token, partnerId) { const request = { ...deferred(), token, partnerId }; requests.push(request); return request.promise; },
    sendChatMessage() { const request = deferred(); sends.push(request); return request.promise; },
    sendChatTyping() {},
  };
  const { createThreadRefreshQueue } = compile('src/features/chat/threadRefreshQueue.ts', {});
  const { ChatDetailScreen } = compile('src/features/chat/components/ChatDetailScreen.tsx', {
    'react-native': native,
    'react-native-safe-area-context': { useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) },
    '@expo/vector-icons': { Ionicons: 'Icon' }, 'expo-image-picker': {},
    '../../auth/session/UserContext': { useUser: () => ({ user }) },
    '../../../shared/theme/theme': { default: { typography: { fontFamily: {} } } },
    '../../../shared/realtime': { realtime: { status: 'connected', subscribe: () => () => {} } },
    '../../../shared/realtime/useRealtimeStatus': { useRealtimeStatus: () => 'connected' },
    '../bookingCards': { mapBookingCard: () => null }, '../api/bookingOffersApi': {},
    '../../bookings/components/BookingModal': { BookingModal: () => null },
    '../../profile/components/UserProfileView': { UserProfileView: () => null },
    '../hooks/useChatSafety': { useChatSafety: () => null },
    '../api/chatApi': api, '../threadRefreshQueue': { createThreadRefreshQueue },
    '../store/chatStore': { chatStore: { isMessageDeleted: () => false, loadInbox: async () => [], addOrUpdateChat: entry => previews.push(entry) } },
    '../../bookings/store/savedJobsStore': {}, '../../../shared/api/config': {}, '../../../shared/api/httpClient': {},
  });
  const originalFrame = global.requestAnimationFrame;
  global.requestAnimationFrame = callback => { callback(); return 0; };
  const container = { children: [] };
  const root = renderer.createContainer(container, 0, null, false, null, '', error => { throw error; }, null);
  const update = (partnerId, visible = true, extra = {}) => {
    renderer.flushSync(() => renderer.updateContainer(React.createElement(ChatDetailScreen, {
      partnerId, visible, contactName: partnerId, contactRole: 'Admin', onClose() {}, ...extra,
    }), root, null));
    renderer.flushPassiveEffects();
  };
  const nodes = () => {
    const result = [];
    const visit = node => { result.push(node); node.children.forEach(visit); };
    container.children.forEach(visit); return result;
  };
  t.after(() => {
    renderer.flushSync(() => renderer.updateContainer(null, root, null));
    renderer.flushPassiveEffects(); global.requestAnimationFrame = originalFrame;
  });
  return { update, requests, sends, previews, alerts, nodes,
    texts: () => nodes().filter(node => node.text !== undefined).map(node => node.text).join(' '),
    changeAccount() { user = { ...user, id: 'account-two', token: 'token-two' }; },
  };
}

test('switching from a loaded chat immediately removes its history and draft before the next fetch resolves', async t => {
  const chat = screen(t);
  chat.update('A'); chat.requests[0].resolve(payload('dogs')); await tick();
  assert.match(chat.texts(), /dogs/);
  chat.nodes().find(node => node.type === 'TextInput').props.onChangeText('private draft');
  chat.update('B');
  assert.doesNotMatch(chat.texts(), /dogs/);
  assert.ok(chat.nodes().some(node => node.type === 'ActivityIndicator'));
  assert.equal(chat.nodes().find(node => node.type === 'TextInput').props.value, '');
  chat.requests[1].resolve(payload('cats')); await tick();
  assert.match(chat.texts(), /cats/); assert.doesNotMatch(chat.texts(), /dogs/);
});

test('a late response from a closed chat cannot replace the next conversation', async t => {
  const chat = screen(t);
  chat.update('A'); chat.update('A', false); chat.update('B');
  chat.requests[1].resolve(payload('cats')); await tick();
  chat.requests[0].resolve(payload('late dogs')); await tick();
  assert.match(chat.texts(), /cats/); assert.doesNotMatch(chat.texts(), /dogs/);
});

test('reopening the same chat starts clean and ignores the previous opening response', async t => {
  const chat = screen(t);
  chat.update('A'); chat.update('A', false); chat.update('A');
  chat.requests[0].resolve(payload('old opening')); await tick();
  assert.doesNotMatch(chat.texts(), /old opening/);
  assert.ok(chat.nodes().some(node => node.type === 'ActivityIndicator'));
  chat.requests[1].resolve(payload('current opening')); await tick();
  assert.match(chat.texts(), /current opening/);
});

test('switching signed-in accounts clears the same partner history and ignores an old send completion', async t => {
  const chat = screen(t);
  chat.update('A'); chat.requests[0].resolve(payload('private history')); await tick();
  chat.nodes().find(node => node.type === 'TextInput').props.onChangeText('private outgoing');
  chat.nodes().find(node => node.type === 'Pressable' && node.children.some(child => child.type === 'Icon' && child.props.name === 'send')).props.onPress();
  chat.changeAccount(); chat.update('A');
  assert.doesNotMatch(chat.texts(), /private history|private outgoing/);
  assert.equal(chat.requests[1].token, 'token-two');
  chat.sends[0].resolve({ data: { chat_message_id: 'saved-old-message' } }); await tick();
  assert.deepEqual(chat.previews, []); assert.deepEqual(chat.alerts, []);
  chat.requests[1].resolve(payload('new account')); await tick();
  assert.match(chat.texts(), /new account/);
});

test('a failed new conversation shows its own error and never restores the previous messages', async t => {
  const chat = screen(t);
  chat.update('A'); chat.requests[0].resolve(payload('dogs')); await tick();
  chat.update('B'); chat.requests[1].reject(new Error('Could not load this chat.')); await tick();
  assert.match(chat.texts(), /Could not load this chat/); assert.doesNotMatch(chat.texts(), /dogs/);
});

test('a blocked send removes its optimistic bubble, restores the editable draft and leaves recipient previews unchanged', async t => {
  const chat = screen(t);
  chat.update('A'); chat.requests[0].resolve(payload('Earlier message')); await tick();
  chat.nodes().find(node => node.type === 'TextInput').props.onChangeText('Unsuitable outgoing text');
  chat.nodes().find(node => node.type === 'Pressable' && node.children.some(child => child.type === 'Icon' && child.props.name === 'send')).props.onPress();
  assert.match(chat.texts(), /Unsuitable outgoing text/);
  chat.sends[0].reject(new Error('This message may contain inappropriate language. Please edit it before sending.'));
  await tick();
  assert.doesNotMatch(chat.texts(), /Unsuitable outgoing text/);
  assert.equal(chat.nodes().find(node => node.type === 'TextInput').props.value, 'Unsuitable outgoing text');
  assert.equal(chat.alerts.length, 1);
  assert.match(chat.alerts[0][1], /Please edit it/);
  assert.deepEqual(chat.previews, []);
});

test('repeated send taps while a request is pending create only one attempt', async t => {
  const chat = screen(t);
  chat.update('A'); chat.requests[0].resolve(payload('Earlier message')); await tick();
  chat.nodes().find(node => node.type === 'TextInput').props.onChangeText('One outgoing message');
  const send = chat.nodes().find(node => node.type === 'Pressable' && node.children.some(child => child.type === 'Icon' && child.props.name === 'send')).props.onPress;
  send(); send();
  assert.equal(chat.sends.length, 1);
  assert.equal(chat.nodes().find(node => node.type === 'TextInput').props.editable, false);
  chat.sends[0].reject(new Error('Please edit this message.')); await tick();
  assert.equal(chat.nodes().find(node => node.type === 'TextInput').props.editable, true);
});

test('a late blocked-send response cannot restore a draft into a different conversation', async t => {
  const chat = screen(t);
  chat.update('A'); chat.requests[0].resolve(payload('Earlier message')); await tick();
  chat.nodes().find(node => node.type === 'TextInput').props.onChangeText('Private blocked draft');
  chat.nodes().find(node => node.type === 'Pressable' && node.children.some(child => child.type === 'Icon' && child.props.name === 'send')).props.onPress();
  chat.update('B');
  chat.sends[0].reject(new Error('Blocked message')); await tick();
  assert.equal(chat.nodes().find(node => node.type === 'TextInput').props.value, '');
  assert.deepEqual(chat.alerts, []);
});

test('an offline contact never flashes online on opening or reopening, even with a legacy online hint', async t => {
  const chat = screen(t);
  const isGreen = () => chat.nodes().some(node => node.props?.testID === 'chat-presence-online');
  chat.update('offline', true, { isOnline: true });
  assert.equal(isGreen(), false);
  assert.doesNotMatch(chat.texts(), /Active now|Inactive/);
  chat.requests[0].resolve(payload('hello')); await tick();
  assert.equal(isGreen(), false); assert.match(chat.texts(), /Inactive/);
  chat.update('offline', false); chat.update('offline', true, { isOnline: true });
  assert.equal(isGreen(), false); assert.doesNotMatch(chat.texts(), /Active now|Inactive/);
  chat.requests[1].resolve(payload('hello')); await tick();
  assert.equal(isGreen(), false); assert.match(chat.texts(), /Inactive/);
});

test('only a confirmed online response shows the green dot and it is not carried to another chat', async t => {
  const chat = screen(t);
  const isGreen = () => chat.nodes().some(node => node.props?.testID === 'chat-presence-online');
  chat.update('online');
  assert.equal(isGreen(), false);
  chat.requests[0].resolve({ ...payload('hello'), partnerIsOnline: true }); await tick();
  assert.equal(isGreen(), true); assert.match(chat.texts(), /Active now/);
  chat.update('other');
  assert.equal(isGreen(), false); assert.doesNotMatch(chat.texts(), /Active now/);
  chat.requests[1].resolve(payload('goodbye')); await tick();
  assert.equal(isGreen(), false); assert.match(chat.texts(), /Inactive/);
});

test('missing presence data stays neutral and a late online result cannot change a different contact', async t => {
  const chat = screen(t);
  chat.update('A'); chat.update('B');
  const result = payload('cats'); delete result.partnerIsOnline;
  chat.requests[1].resolve(result); await tick();
  chat.requests[0].resolve({ ...payload('dogs'), partnerIsOnline: true }); await tick();
  assert.doesNotMatch(chat.texts(), /Active now|Inactive/);
  assert.equal(chat.nodes().some(node => node.props?.testID === 'chat-presence-online'), false);
});

function presenceScreen(t) {
  const events = new Set(), statuses = new Set(), watches = new Set();
  const realtime = {
    subscribe(callback) { events.add(callback); return () => events.delete(callback); },
    subscribeStatus(callback) { statuses.add(callback); return () => statuses.delete(callback); },
    watchPresence(ids) { watches.add(ids); return () => watches.delete(ids); },
  };
  const { useChatPresence } = compile('src/shared/realtime/useChatPresence.ts', { './index': { realtime } });
  function Probe({ account, ids }) {
    const presence = useChatPresence(account, ids);
    return React.createElement('View', { a: presence('A'), b: presence('B') });
  }
  const container = { children: [] };
  const root = renderer.createContainer(container, 0, null, false, null, '', error => { throw error; }, null);
  const update = (account, ids = ['A', 'B']) => {
    renderer.flushSync(() => renderer.updateContainer(React.createElement(Probe, { account, ids }), root, null));
    renderer.flushPassiveEffects();
  };
  t.after(() => {
    renderer.flushSync(() => renderer.updateContainer(null, root, null)); renderer.flushPassiveEffects();
    assert.equal(events.size, 0); assert.equal(statuses.size, 0); assert.equal(watches.size, 0);
  });
  return { update, watches, value: () => container.children[0].props,
    event(event) { renderer.flushSync(() => events.forEach(callback => callback(event))); },
    status(status) { renderer.flushSync(() => statuses.forEach(callback => callback(status))); },
  };
}

test('mobile avatar presence uses only confirmed booleans for the correct contact and resets on disconnect or account change', t => {
  const screen = presenceScreen(t);
  screen.update('first-account');
  assert.equal(screen.value().a, undefined);
  screen.event({ type: 'presence.changed', partner_id: 'A', is_online: 'true' });
  assert.equal(screen.value().a, undefined);
  screen.event({ type: 'presence.changed', partner_id: 'A', is_online: false });
  assert.equal(screen.value().a, false); assert.equal(screen.value().b, undefined);
  screen.event({ type: 'presence.changed', partner_id: 'A', is_online: true });
  assert.equal(screen.value().a, true);
  screen.status('reconnecting'); assert.equal(screen.value().a, undefined);
  screen.status('connected'); assert.equal(screen.value().a, undefined);
  screen.event({ type: 'presence.changed', partner_id: 'A', is_online: true });
  screen.update('second-account'); assert.equal(screen.value().a, undefined);
  screen.event({ type: 'presence.changed', partner_id: 'B', is_online: false });
  assert.equal(screen.value().b, false);
  screen.update(null); assert.equal(screen.value().b, undefined); assert.equal(screen.watches.size, 0);
});

test('mobile avatar presence expires, does not resubscribe on a list reorder, and removes watches when contacts leave', t => {
  t.mock.timers.enable({ apis: ['setInterval', 'Date'], now: 10000 });
  const screen = presenceScreen(t);
  screen.update('account');
  const watch = [...screen.watches][0];
  screen.event({ type: 'presence.changed', partner_id: 'A', is_online: true });
  screen.update('account', ['B', 'A']);
  assert.equal([...screen.watches][0], watch); assert.equal(screen.value().a, true);
  renderer.flushSync(() => t.mock.timers.tick(65000));
  assert.equal(screen.value().a, undefined);
  screen.update('account', []); assert.equal(screen.watches.size, 0);
});


test('a successful masked send updates the bubble and inbox preview and shows exactly one notice', async t => {
  const chat = screen(t);
  chat.update('A'); chat.requests[0].resolve(payload('Earlier message')); await tick();
  chat.nodes().find(node => node.type === 'TextInput').props.onChangeText('gago');
  chat.nodes().find(node => node.type === 'Pressable' && node.children.some(child => child.type === 'Icon' && child.props.name === 'send')).props.onPress();
  chat.sends[0].resolve({ data: { chat_message_id: 'saved', message_payload: 'g*go' }, language_warning: 'Please communicate respectfully.' });
  await tick();
  assert.match(chat.texts(), /g\*go/); assert.doesNotMatch(chat.texts(), /gago/);
  assert.equal(chat.alerts.length, 1); assert.equal(chat.alerts[0][0], 'Notice');
  assert.equal(chat.previews[0].message, 'g*go');
});

test('a masked-send response from an old thread never displays a notice in another chat', async t => {
  const chat = screen(t);
  chat.update('A'); chat.requests[0].resolve(payload('Earlier message')); await tick();
  chat.nodes().find(node => node.type === 'TextInput').props.onChangeText('gago');
  chat.nodes().find(node => node.type === 'Pressable' && node.children.some(child => child.type === 'Icon' && child.props.name === 'send')).props.onPress();
  chat.update('B');
  chat.sends[0].resolve({ data: { chat_message_id: 'saved', message_payload: 'g*go' }, language_warning: 'Please communicate respectfully.' });
  await tick();
  assert.deepEqual(chat.alerts, []); assert.deepEqual(chat.previews, []);
});
