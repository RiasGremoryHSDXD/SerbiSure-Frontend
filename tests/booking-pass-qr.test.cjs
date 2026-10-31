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
function load(filename, mocks = {}) {
  const source = ts.transpileModule(fs.readFileSync(path.resolve(__dirname, '..', filename), 'utf8'), {
    fileName: filename, compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React },
  }).outputText;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', source)(name => {
    if (name === 'react') return { ...React, default: React };
    if (name in mocks) return mocks[name];
    throw new Error('Unexpected dependency: ' + name);
  }, module, module.exports);
  return module.exports;
}


const text = node => node.text || node.children.map(text).join('');
const tick = async () => { await new Promise(resolve => setImmediate(resolve)); renderer.flushPassiveEffects(); };
const ID = '8df2b7e1-1bd2-41c9-a159-a0972fa116e8';
const BASE = 'https://serbisure-production-backend.up.railway.app';
// Shape fixtures only: the backend tests authenticate real Django signatures.
const PASS_URL = `${BASE}/verify/?token=InNhdmVkLWJvb2tpbmci:1wABCd:abc_def-123`;
function passModule(copy = async () => true) {
  return load('src/features/bookings/components/BookingPassQRCode.tsx', {
    'react-native': { StyleSheet: { create: value => value }, View: 'View', Text: 'Text', Pressable: 'Pressable' },
    'react-native-qrcode-svg': { default: 'QRCode' },
    'expo-clipboard': { setStringAsync: copy },
    '../../../shared/api/config': { API_BASE_URL: 'https://serbisure-production-backend.up.railway.app/' },
    '../../../shared/localization/LanguageContext': { useLanguage: () => ({ tr: value => value }) },
    'text-encoding': require('text-encoding'),
  });
}
function mount(t, id, copy, savedUrl = PASS_URL) {
  const { BookingPassQRCode } = passModule(copy);
  const container = { children: [] };
  const root = renderer.createContainer(container, 0, null, false, null, '', error => { throw error; }, null);
  const act = callback => renderer.flushSync(callback);
  const render = (bookingId, passUrl = savedUrl) => { act(() => renderer.updateContainer(React.createElement(BookingPassQRCode, { bookingId, passUrl }), root, null)); renderer.flushPassiveEffects(); };
  const nodes = () => { const found = []; const visit = node => { found.push(node); node.children.forEach(visit); }; visit(container); return found; };
  t.after(() => { act(() => renderer.updateContainer(null, root, null)); renderer.flushPassiveEffects(); });
  render(id);
  return { nodes, render, act, content: () => text(container) };
}

test('uses the server-signed URL unchanged and rejects unsigned links and other origins', () => {
  const { bookingPassUrl } = passModule();
  assert.equal(bookingPassUrl(PASS_URL), PASS_URL);
  assert.equal(bookingPassUrl(PASS_URL.replace(/:/g, (match, offset) => offset > 10 ? '%3A' : match)),
    PASS_URL.replace(/:/g, (match, offset) => offset > 10 ? '%3A' : match));
  for (const missing of [null, undefined, '', ID, `${BASE}/verify/${ID}/`, 'BK-8DF2B7E1',
    PASS_URL.replace(BASE, 'https://fake.test'), `${PASS_URL}&extra=yes`, `${BASE}/verify/?token=%ZZ`]) {
    assert.equal(bookingPassUrl(missing), null);
  }
});

test('saved ticket without a signed URL keeps the logbook code but never falls back to a raw UUID URL', t => {
  const app = mount(t, ID, undefined, null);
  assert.ok(app.content().includes('Connect to the internet and reopen this booking to get a fresh pass.'));
  assert.ok(app.content().includes('BK-8DF2B7E1'));
  assert.ok(!app.nodes().some(node => node.type === 'QRCode'));
});

test('draft does not render a fake QR or fake booking code', t => {
  const app = mount(t, null);
  assert.ok(app.content().includes('QR Pass will be generated once booking is sent.'));
  assert.ok(!app.nodes().some(node => node.type === 'QRCode'));
  assert.ok(!app.content().includes('BK-'));
});

test('QR renders offline in black on white, keeps a quiet zone, and fits narrow tickets', t => {
  const original = global.fetch;
  global.fetch = () => { throw new Error('QR rendering must not use the network'); };
  t.after(() => { global.fetch = original; });
  const app = mount(t, ID);
  let qr = app.nodes().find(node => node.type === 'QRCode');
  assert.equal(qr.props.value, PASS_URL);
  assert.equal(qr.props.color, '#000000');
  assert.equal(qr.props.backgroundColor, '#FFFFFF');
  assert.equal(qr.props.ecl, 'M');
  assert.equal(qr.props.quietZone, 32);
  assert.ok(!qr.props.logo);
  app.act(() => app.nodes().find(node => node.props?.onLayout).props.onLayout({ nativeEvent: { layout: { width: 224 } } }));
  qr = app.nodes().find(node => node.type === 'QRCode');
  assert.equal(qr.props.size, 224);
  assert.ok(app.content().includes('BK-8DF2B7E1'));
});

test('tap copies the short reference and reports success; failure never reports copied', async t => {
  const calls = [];
  let reject = false;
  const app = mount(t, ID, async value => { calls.push(value); if (reject) throw new Error('clipboard unavailable'); return true; });
  await app.nodes().find(node => node.type === 'Pressable').props.onPress(); await tick();
  assert.deepEqual(calls, ['BK-8DF2B7E1']);
  assert.ok(app.content().includes('Booking code copied'));
  reject = true;
  await app.nodes().find(node => node.type === 'Pressable').props.onPress(); await tick();
  assert.ok(app.content().includes('Could not copy. Please write down'));
  assert.ok(!app.content().includes('Booking code copied'));
});

test('missing native TextEncoder is supplied before the actual QR encoder runs', () => {
  const original = global.TextEncoder;
  try {
    delete global.TextEncoder;
    const { bookingPassUrl } = passModule();
    assert.equal(typeof global.TextEncoder, 'function');
    const result = require('qrcode').create(bookingPassUrl(PASS_URL), { errorCorrectionLevel: 'M' });
    assert.ok(result.modules.size > 0);
    assert.equal(result.errorCorrectionLevel.bit, 0);
  } finally { global.TextEncoder = original; }
});

test('QR rendering failures retain the readable reference and a friendly message', t => {
  const app = mount(t, ID);
  app.act(() => app.nodes().find(node => node.type === 'QRCode').props.onError(new Error('encoder failed')));
  assert.ok(app.content().includes('QR unavailable. Please reload the ticket.'));
  assert.ok(app.content().includes('BK-8DF2B7E1'));
  assert.ok(app.nodes().some(node => node.type === 'Pressable'));
});
