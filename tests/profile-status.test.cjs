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
const tokenFor = (id = 'worker-one', version = 1) => `header.${Buffer.from(JSON.stringify({ user_id: id, account_type: 'Kasambahay', version })).toString('base64url')}.signature`;
const tick = async () => { await new Promise(resolve => setImmediate(resolve)); renderer.flushPassiveEffects(); };
function profile(t) {
  const requests = [], updates = [], alerts = [];
  const context = load('src/features/auth/session/UserContext.tsx', {
    '../../bookings/store/savedJobsStore': { savedJobsStore: { initForUser() {}, clearStore() {} } },
  });
  const language = { useLanguage: () => ({ tr: text => text }) };
  const { useWorkerProfile } = load('src/features/profile/worker/useWorkerProfile.ts', {
    'react-native': { Alert: { alert: (...args) => alerts.push(args) } },
    '../../auth/session/UserContext': context,
    '../../../shared/localization/LanguageContext': language,
    '../api/accountApi': {
      fetchJobStatus(token) { const request = { ...deferred(), token }; requests.push(request); return request.promise; },
      updateJobStatus(token, value) { const request = { ...deferred(), token, value }; updates.push(request); return request.promise; },
    },
    '../../reviews/api/reviewApi': { fetchReviewAnalytics: async () => null },
  });
  const { AvailabilitySection } = load('src/features/profile/worker/AvailabilitySection.tsx', {
    'react-native': Object.fromEntries(['Text', 'View', 'Pressable', 'ActivityIndicator'].map(name => [name, name])),
    '@expo/vector-icons': { Ionicons: 'Icon' }, '../../../shared/localization/LanguageContext': language,
    '../styles': { profileStyles: { pillSegmentAvailable: 'available', pillSegmentOnJob: 'onJob' } },
  });
  let controller, auth;
  function Worker() {
    controller = useWorkerProfile(true);
    return React.createElement(AvailabilitySection, { profile: { ...controller, t: { setStatus: 'Status', available: 'Available', onJob: 'Occupied' } } });
  }
  function Screen({ visible }) { auth = context.useUser(); return visible ? React.createElement(Worker) : null; }
  const container = { children: [] };
  const root = renderer.createContainer(container, 0, null, false, null, '', error => { throw error; }, null);
  const render = (visible = true, token = tokenFor()) => {
    renderer.flushSync(() => renderer.updateContainer(React.createElement(context.UserProvider, { token }, React.createElement(Screen, { visible })), root, null));
    renderer.flushPassiveEffects();
  };
  t.after(() => { renderer.flushSync(() => renderer.updateContainer(null, root, null)); renderer.flushPassiveEffects(); });
  const nodes = () => { const result = []; const walk = node => { result.push(node); node.children.forEach(walk); }; walk(container); return result; };
  return { render, requests, updates, alerts, nodes, get current() { return controller; }, get user() { return auth.user; } };
}

test('status starts unknown, then stays Occupied across Profile/Home remounts without refetching', async t => {
  const screen = profile(t);
  screen.render(); await tick();
  assert.equal(screen.current.isOnJob, null);
  assert.equal(screen.nodes().find(node => node.type === 'Pressable').props.disabled, true);
  assert.equal(screen.nodes().some(node => node.type === 'ActivityIndicator'), true);
  screen.requests[0].resolve(true); await tick();
  assert.equal(screen.current.isOnJob, true);
  for (let tab = 0; tab < 3; tab++) {
    screen.render(false); screen.render(true);
    assert.equal(screen.current.isOnJob, true);
    assert.equal(screen.nodes().some(node => node.props?.style?.includes?.('onJob')), true);
  }
  assert.equal(screen.requests.length, 1);
  const refreshing = screen.current.refreshWorkerProfile();
  assert.equal(screen.current.isOnJob, true);
  screen.requests[1].resolve(false); await refreshing; await tick();
  assert.equal(screen.current.isOnJob, false);
});

test('failed initial load offers retry and never labels an unknown status Available', async t => {
  const screen = profile(t); screen.render(); await tick();
  screen.requests[0].reject(new Error('offline')); await tick();
  assert.equal(screen.current.isOnJob, null);
  const retry = screen.nodes().find(node => node.type === 'Pressable');
  assert.equal(retry.props.accessibilityLabel, 'Retry status');
  assert.equal(retry.props.disabled, false);
  retry.props.onPress();
  screen.requests[1].resolve(true); await tick();
  assert.equal(screen.current.isOnJob, true);
  const refreshing = screen.current.refreshWorkerProfile();
  screen.requests[2].reject(new Error('offline')); await refreshing; await tick();
  assert.equal(screen.current.isOnJob, true);
});

test('saving is disabled against duplicate taps, survives tab changes, and rolls back on failure', async t => {
  const screen = profile(t); screen.render(); await tick(); screen.requests[0].resolve(false); await tick();
  const save = screen.current.handleToggleJobStatus(true);
  await screen.current.handleToggleJobStatus(false);
  assert.equal(screen.updates.length, 1);
  assert.equal(screen.nodes().find(node => node.type === 'Pressable').props.disabled, true);
  screen.render(false); screen.render(true);
  assert.equal(screen.current.isOnJob, true);
  assert.equal(screen.nodes().find(node => node.type === 'Pressable').props.disabled, true);
  await screen.current.handleToggleJobStatus(false);
  assert.equal(screen.updates.length, 1);
  screen.updates[0].reject(new Error('offline')); await save; await tick();
  assert.equal(screen.current.isOnJob, false);
  assert.deepEqual(screen.alerts[0], ['Status not updated', 'Could not update your status. Please try again.']);
  const nextSave = screen.current.handleToggleJobStatus(true);
  screen.updates[1].resolve(true); await nextSave; await tick();
  screen.render(false); screen.render(true);
  assert.equal(screen.current.isOnJob, true);
});

test('a slower status read cannot overwrite a newer manual change', async t => {
  const screen = profile(t); screen.render(); await tick(); screen.requests[0].resolve(false); await tick();
  const refresh = screen.current.refreshWorkerProfile();
  const save = screen.current.handleToggleJobStatus(true);
  screen.updates[0].resolve(true); await save;
  screen.requests[1].resolve(false); await refresh; await tick();
  assert.equal(screen.current.isOnJob, true);
});

test('token renewal preserves the same account status while switching accounts and logout clear it', async t => {
  const screen = profile(t); screen.render(); await tick(); screen.requests[0].resolve(true); await tick();
  screen.render(true, tokenFor('worker-one', 2)); await tick();
  assert.equal(screen.current.isOnJob, true);
  assert.equal(screen.requests.length, 1);
  screen.render(true, tokenFor('worker-two')); await tick();
  assert.equal(screen.current.isOnJob, null);
  screen.requests[1].resolve(false); await tick();
  assert.equal(screen.current.isOnJob, false);
  screen.render(false, null); await tick();
  assert.equal(screen.user.isOnJob, undefined);
});

test('status API failures and malformed values remain errors instead of being coerced to Available', async () => {
  let response;
  const api = load('src/features/profile/api/accountApi.ts', {
    '../../../shared/api/config': { API_BASE_URL: 'https://test.local' },
    '../../../shared/api/httpClient': { requestResponse: async () => response },
  });
  for (const data of [{}, { is_on_job: 'false' }, { is_on_job: null }]) {
    response = new Response(JSON.stringify(data));
    await assert.rejects(api.fetchJobStatus('token'), /Could not load your status/);
    response = new Response(JSON.stringify(data));
    await assert.rejects(api.updateJobStatus('token', false), /Could not update your status/);
  }
  response = new Response(JSON.stringify({ detail: 'Unavailable' }), { status: 503 });
  await assert.rejects(api.fetchJobStatus('token'), /Unavailable/);
  response = new Response(JSON.stringify({ is_on_job: false }));
  assert.equal(await api.fetchJobStatus('token'), false);
});
