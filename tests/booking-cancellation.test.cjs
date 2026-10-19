const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const React = require('react');
const Reconciler = require('react-reconciler');
const { DefaultEventPriority } = require('react-reconciler/constants');

// Exercise the cancellation screen with React reconciliation; replace native surfaces and I/O.
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

const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };
const tick = async () => { await new Promise(resolve => setImmediate(resolve)); renderer.flushPassiveEffects(); };

function cancellationScreen(t, points = 1) {
  const updates = [], requests = [], done = [], closed = [];
  const preview = { points_to_add: points, penalty_points: 2, is_restricted: false, penalty_month: '2026-10-01', resets_at: '2026-11-01T00:00:00+08:00',
    reasons: ['Other', 'Safety / Inappropriate Homeowner Behavior'] };
  const native = { StyleSheet: { create: value => value, hairlineWidth: 1 } };
  for (const name of ['View', 'Text', 'Modal', 'Pressable', 'ScrollView', 'ActivityIndicator']) native[name] = name;
  const { CancelBookingModal } = compile('src/features/bookings/components/CancelBookingModal.tsx', {
    'react-native': native,
    '../../auth/session/UserContext': { useUser: () => ({ updateUser: value => updates.push(value) }) },
    '../api/bookingApi': {
      fetchCancellationPreview: async () => preview,
      cancelBooking: (...args) => { const request = { ...deferred(), args }; requests.push(request); return request.promise; },
    },
  });
  const container = { children: [] };
  const root = renderer.createContainer(container, 0, null, false, null, '', error => { throw error; }, null);
  renderer.flushSync(() => renderer.updateContainer(React.createElement(CancelBookingModal, {
    bookingId: 'booking', token: 'token', onClose: () => closed.push(true), onCancelled: safety => done.push(safety),
  }), root, null));
  renderer.flushPassiveEffects();
  const unmount = () => { renderer.flushSync(() => renderer.updateContainer(null, root, null)); renderer.flushPassiveEffects(); };
  t.after(unmount);
  const nodes = () => {
    const result = [];
    const visit = node => { result.push(node); node.children.forEach(visit); };
    container.children.forEach(visit); return result;
  };
  const contains = (node, text) => node.text === text || node.children.some(child => contains(child, text));
  const pressLabel = label => renderer.flushSync(() => nodes().find(node => node.props?.accessibilityLabel === label).props.onPress());
  const pressText = text => renderer.flushSync(() => nodes().find(node => node.type === 'Pressable' && contains(node, text)).props.onPress());
  return { nodes, updates, requests, done, closed, unmount, preview, pressLabel, pressText,
    text: () => nodes().filter(node => node.text !== undefined).map(node => node.text).join(' '),
  };
}

for (const points of [0, 1, 2]) {
  test('cancellation requires a reason and shows the server penalty of ' + points, async t => {
    const screen = cancellationScreen(t, points); await tick();
    assert.equal(screen.nodes().find(node => node.props?.accessibilityLabel === 'Confirm booking cancellation').props.disabled, true);
    screen.pressLabel('Confirm booking cancellation');
    assert.equal(screen.requests.length, 0);
    screen.pressLabel('Choose cancellation reason'); screen.pressText('Other');
    const text = screen.text();
    assert.match(text, /Current:\s+2\s*\/3 points/);
    assert.match(text, points === 0 ? /No penalty points will be added/ : points === 1 ? /adds 1 penalty point this month/ : /adds 2 penalty points this month/);
    screen.pressLabel('Confirm booking cancellation'); screen.pressLabel('Confirm booking cancellation');
    assert.equal(screen.requests.length, 1);
    assert.deepEqual(screen.requests[0].args, ['token', 'booking', { reason: 'Other', expected_points: points }]);
    screen.requests[0].resolve({ success: true, penalty: { penalty_points: 3, is_restricted: true } }); await tick();
    assert.equal(screen.done.length, 1);
    assert.equal(screen.done[0], false);
    assert.deepEqual(screen.updates.at(-1), { penaltyPoints: 3, isRestricted: true });
  });
}

test('failed cancellation retains the reason, shows an error and allows retry', async t => {
  const screen = cancellationScreen(t); await tick();
  screen.pressLabel('Choose cancellation reason'); screen.pressText('Other'); screen.pressLabel('Confirm booking cancellation');
  screen.requests[0].resolve({ success: false, error: 'Could not cancel booking. Try again.' }); await tick();
  assert.equal(screen.done.length, 0); assert.match(screen.text(), /Could not cancel booking. Try again./);
  screen.pressLabel('Confirm booking cancellation'); assert.equal(screen.requests.length, 2);
});

test('safety cancellation keeps penalties and shows an advisory with one acknowledgement', async t => {
  const screen = cancellationScreen(t, 2); await tick();
  screen.pressLabel('Choose cancellation reason'); screen.pressText('Safety / Inappropriate Homeowner Behavior');
  screen.pressLabel('Confirm booking cancellation');
  screen.requests[0].resolve({ success: true, safety_advisory: true, penalty: { points_added: 2, penalty_points: 3, is_restricted: true } }); await tick();
  assert.equal(screen.done.length, 0);
  assert.match(screen.text(), /Safety & Incident Advisory/);
  assert.match(screen.text(), /2 penalty point\(s\) were added/);
  assert.match(screen.text(), /Barangay Officer or SerbiSure Support/);
  assert.equal(screen.nodes().filter(node => node.type === 'Pressable').length, 1);
  screen.pressText('Understood'); assert.deepEqual(screen.done, [true]);
});

test('leaving while cancellation is pending ignores the late completion', async t => {
  const screen = cancellationScreen(t); await tick();
  screen.pressLabel('Choose cancellation reason'); screen.pressText('Other'); screen.pressLabel('Confirm booking cancellation');
  screen.unmount();
  screen.requests[0].resolve({ success: true, penalty: { penalty_points: 3, is_restricted: true } }); await tick();
  assert.equal(screen.done.length, 0);
});

