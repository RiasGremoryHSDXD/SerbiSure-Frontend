const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const React = require('react');
const Reconciler = require('react-reconciler');
const { DefaultEventPriority } = require('react-reconciler/constants');

const append = (parent, child) => { parent.children = parent.children.filter(item => item !== child); parent.children.push(child); };
const remove = (parent, child) => { parent.children = parent.children.filter(item => item !== child); };
const renderer = Reconciler({
  supportsMutation: true, isPrimaryRenderer: true, now: Date.now,
  getRootHostContext: () => null, getChildHostContext: () => null, getCurrentEventPriority: () => DefaultEventPriority,
  prepareForCommit: () => null, resetAfterCommit() {}, shouldSetTextContent: () => false,
  createInstance: (type, props) => ({ type, props, children: [] }), createTextInstance: text => ({ text, children: [] }), getPublicInstance: instance => instance,
  appendInitialChild: append, appendChild: append, appendChildToContainer: append, removeChild: remove, removeChildFromContainer: remove,
  insertBefore(parent, child, before) { remove(parent, child); parent.children.splice(parent.children.indexOf(before), 0, child); },
  insertInContainerBefore(parent, child, before) { remove(parent, child); parent.children.splice(parent.children.indexOf(before), 0, child); },
  prepareUpdate: () => true, commitUpdate(instance, _payload, _type, _old, props) { instance.props = props; }, commitTextUpdate(instance, _old, text) { instance.text = text; },
  resetTextContent() {}, finalizeInitialChildren: () => false, clearContainer(parent) { parent.children = []; },
  scheduleTimeout: setTimeout, cancelTimeout: clearTimeout, noTimeout: -1, detachDeletedInstance() {},
});
function load(relative, mocks) {
  const source = ts.transpileModule(fs.readFileSync(path.resolve(__dirname, '..', relative), 'utf8'), {
    fileName: relative, compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React },
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
const tick = async () => { await new Promise(resolve => setImmediate(resolve)); renderer.flushPassiveEffects(); };
const contacts = (name = 'Canito-An', id = 'desk-one') => ({
  superadmins: [{ id: 'support', name: 'Support', account_type: 'Admin', barangay: null, avatar: null }],
  barangay: { name, available: true, contacts: [{ id, name: 'Barangay desk', account_type: 'Barangay', barangay: name, avatar: null }], message: '' },
});
function screen(t) {
  const requests = [], opened = [], listeners = new Set();
  const cache = load('src/features/chat/supportContactsCache.ts', {
    './api/chatApi': { fetchSupportContacts(token) { const request = { ...deferred(), token }; requests.push(request); return request.promise; } },
  });
  const { SupportContactsCard } = load('src/features/chat/components/SupportContactsCard.tsx', {
    'react-native': { Text: 'Text', View: 'View', Pressable: 'Pressable', ActivityIndicator: 'ActivityIndicator',
      StyleSheet: { create: value => value, hairlineWidth: 1 },
      AppState: { currentState: 'active', addEventListener(_event, callback) { listeners.add(callback); return { remove: () => listeners.delete(callback) }; } },
    },
    '@expo/vector-icons': { Ionicons: 'Icon' },
    '../../../shared/localization/LanguageContext': { useLanguage: () => ({ tr: text => text }) },
    '../../../shared/theme/theme': { default: { colors: { ink: '#000' }, typography: { fontFamily: { display: 'font' } } } },
    '../supportContactsCache': cache,
  });
  const container = { children: [] };
  const root = renderer.createContainer(container, 0, null, false, null, '', error => { throw error; }, null);
  const render = (props = {}) => {
    const element = props === null ? null : React.createElement(SupportContactsCard, {
      accountId: 'resident-one', token: 'token-one', profileKey: 'Canito-An|CDO|Misamis Oriental', refreshKey: 0,
      onContact: contact => opened.push(contact), ...props,
    });
    renderer.flushSync(() => renderer.updateContainer(element, root, null)); renderer.flushPassiveEffects();
  };
  t.after(() => render(null));
  const nodes = () => { const result = []; const walk = node => { result.push(node); node.children.forEach(walk); }; walk(container); return result; };
  return { render, requests, cache, opened, nodes,
    text: () => nodes().filter(node => node.text !== undefined).map(node => node.text).join(' '),
    loading: () => nodes().some(node => node.type === 'ActivityIndicator'),
    appState: state => listeners.forEach(callback => callback(state)),
  };
}

test('tab remounts and token renewal reuse contacts without a spinner or another backend request', async t => {
  const card = screen(t); card.render();
  assert.equal(card.loading(), true); assert.equal(card.requests.length, 1);
  card.requests[0].resolve(contacts()); await tick();
  for (let tab = 0; tab < 4; tab++) {
    card.render(null); card.render();
    assert.equal(card.loading(), false); assert.match(card.text(), /Canito-An Barangay/);
  }
  card.render({ token: 'renewed-token' }); await tick();
  card.appState('background'); card.appState('active'); await tick();
  assert.equal(card.requests.length, 1);
  assert.equal(card.loading(), false);
});

test('pull-to-refresh keeps contacts visible and uses the refreshed contact when tapped', async t => {
  const card = screen(t); card.render(); card.requests[0].resolve(contacts()); await tick();
  card.render({ refreshKey: 1 });
  assert.equal(card.requests.length, 2); assert.equal(card.loading(), false);
  assert.match(card.text(), /Canito-An Barangay/);
  card.requests[1].resolve(contacts('Canito-An', 'new-desk')); await tick();
  card.nodes().find(node => node.type === 'Pressable' && node.props.accessibilityLabel === 'Message Canito-An Barangay').props.onPress();
  assert.equal(card.opened[0].id, 'new-desk');
});

test('expired contacts refresh silently, and failed refreshes preserve contacts with a clear retry', async t => {
  const originalNow = Date.now; let now = originalNow(); Date.now = () => now;
  t.after(() => { Date.now = originalNow; });
  const card = screen(t); card.render(); card.requests[0].resolve(contacts()); await tick();
  now += 5 * 60 * 1000 + 1;
  card.render(null); card.render();
  assert.equal(card.requests.length, 2); assert.equal(card.loading(), false); assert.match(card.text(), /Canito-An Barangay/);
  card.requests[1].reject(new Error('offline')); await tick();
  assert.match(card.text(), /Could not refresh contacts/); assert.match(card.text(), /Canito-An Barangay/);
  card.nodes().find(node => node.type === 'Pressable' && !node.props.accessibilityLabel).props.onPress();
  await tick();
  assert.equal(card.requests.length, 3);
  card.requests[2].resolve(contacts()); await tick();
  assert.doesNotMatch(card.text(), /Could not refresh contacts/);
});

test('account and profile-location changes never display previous contacts or accept an older cached response', async t => {
  const card = screen(t); card.render(); card.requests[0].resolve(contacts()); await tick();
  card.render({ profileKey: 'Carmen|CDO|Misamis Oriental' });
  assert.equal(card.loading(), true); assert.doesNotMatch(card.text(), /Canito-An Barangay/);
  card.render({ accountId: 'resident-two', token: 'token-two', profileKey: 'Pagatpat|CDO|Misamis Oriental' });
  card.requests[2].resolve(contacts('Pagatpat', 'new-desk')); await tick();
  card.requests[1].resolve(contacts('Carmen', 'old-desk')); await tick();
  assert.match(card.text(), /Pagatpat Barangay/); assert.doesNotMatch(card.text(), /Carmen Barangay/);
  card.render(null); card.render({ accountId: 'resident-two', token: 'token-two', profileKey: 'Pagatpat|CDO|Misamis Oriental' });
  assert.equal(card.loading(), false); assert.equal(card.requests.length, 3);
});

test('leaving during initial loading shares the pending request on return; logout prevents cache resurrection', async t => {
  const card = screen(t); card.render(); card.render(null); card.render();
  assert.equal(card.requests.length, 1);
  card.requests[0].resolve(contacts()); await tick();
  assert.equal(card.loading(), false);
  card.render({ refreshKey: 1 });
  card.render(null); card.cache.clearSupportContactsCache();
  card.requests[1].resolve(contacts()); await tick();
  card.render();
  assert.equal(card.loading(), true); assert.equal(card.requests.length, 3);
});

test('first-load errors offer retry and an empty successful result remains cached', async t => {
  const card = screen(t); card.render(); card.requests[0].reject(new Error('offline')); await tick();
  assert.equal(card.loading(), false); assert.match(card.text(), /Could not load contacts/);
  card.nodes().find(node => node.type === 'Pressable').props.onPress();
  await tick();
  card.requests[1].resolve({ superadmins: [], barangay: { name: 'Canito-An', available: false, contacts: [], message: '' } }); await tick();
  assert.match(card.text(), /Support is unavailable/);
  card.render(null); card.render();
  assert.equal(card.loading(), false); assert.equal(card.requests.length, 2);
});
