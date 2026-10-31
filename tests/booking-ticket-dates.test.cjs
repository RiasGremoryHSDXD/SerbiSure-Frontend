const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const React = require('react');
const Reconciler = require('react-reconciler');
const { DefaultEventPriority } = require('react-reconciler/constants');

function load(file, mocks = {}) {
  const js = ts.transpileModule(fs.readFileSync(path.resolve(__dirname, '..', file), 'utf8'), {
    fileName: file, compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React },
  }).outputText;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', js)(name => {
    if (name === 'react') return { ...React, default: React };
    if (name in mocks) return mocks[name];
    throw new Error('Unexpected dependency: ' + name);
  }, module, module.exports);
  return module.exports;
}
const append = (parent, child) => parent.children.push(child);
const remove = (parent, child) => { parent.children = parent.children.filter(item => item !== child); };
const renderer = Reconciler({
  supportsMutation: true, isPrimaryRenderer: true, now: Date.now,
  getRootHostContext: () => null, getChildHostContext: () => null, getCurrentEventPriority: () => DefaultEventPriority,
  prepareForCommit: () => null, resetAfterCommit() {}, shouldSetTextContent: () => false,
  createInstance: (type, props) => ({ type, props, children: [] }), createTextInstance: text => ({ text, children: [] }), getPublicInstance: node => node,
  appendInitialChild: append, appendChild: append, appendChildToContainer: append, removeChild: remove, removeChildFromContainer: remove,
  prepareUpdate: () => true, commitUpdate(node, _payload, _type, _old, props) { node.props = props; }, commitTextUpdate(node, _old, text) { node.text = text; },
  finalizeInitialChildren: () => false, clearContainer(node) { node.children = []; },
  scheduleTimeout: setTimeout, cancelTimeout: clearTimeout, noTimeout: -1, detachDeletedInstance() {},
});
const messages = load('src/shared/localization/messages.ts');
const text = node => node.text || node.children.map(text).join('');
function ticket(t, props, language = 'English') {
  const { BookingOfferReview } = load('src/features/bookings/components/BookingOfferReview.tsx', {
    'react-native': { Image: 'Image', Pressable: 'Pressable', View: 'View', Text: 'Text', StyleSheet: { create: styles => styles } },
    '@expo/vector-icons': { Ionicons: 'Icon' }, '../../../shared/theme/theme': { default: { typography: { fontFamily: {} } } },
    '../../../shared/localization/LanguageContext': { useLanguage: () => ({ tr: source => messages.translateMessage(language, source),
      formatDate: (value, style) => messages.formatLocalizedDate(language, value, style) }) },
    '../engagementForm': load('src/features/bookings/engagementForm.ts'), '../workSetup': load('src/features/bookings/workSetup.ts'),
    './BookingPassQRCode': { BookingPassQRCode: 'BookingPassQRCode' },
  });
  const container = { children: [] };
  const root = renderer.createContainer(container, 0, null, false, null, '', error => { throw error; }, null);
  renderer.flushSync(() => renderer.updateContainer(React.createElement(BookingOfferReview, {
    serviceCategory: ['Cleaning'], workSetup: 'stay_out', days: ['M'], workHours: '08:00 AM - 05:00 PM',
    region: 'Region X', location: 'Lot 1, Brgy. Pagatpat, 9000', salary: '800', ...props,
  }), root, null));
  t.after(() => renderer.flushSync(() => renderer.updateContainer(null, root, null)));
  const rows = [];
  const visit = node => {
    if (node.type === 'View' && node.children[0]?.children?.[0]?.type === 'Text') rows.push(node.children.map(text));
    node.children.forEach(visit);
  };
  visit(container);
  return { allText: text(container), rows };
}

const cases = [
  { name: 'single day', bookingType: 'short_term', startDate: '10/29/2026', endDate: '10/29/2026', start: 'Oct 29, 2026', range: false },
  { name: 'single day with no saved end', bookingType: 'short_term', startDate: '10/29/2026', endDate: '', start: 'Oct 29, 2026', range: false },
  { name: 'short-term range', bookingType: 'short_term', startDate: '10/29/2026', endDate: '11/05/2026', start: 'Oct 29, 2026', end: 'Nov 5, 2026', range: true },
  { name: 'fixed long-term', bookingType: 'long_term', startDate: '11/01/2026', endDate: '04/30/2027', start: 'Nov 1, 2026', end: 'Apr 30, 2027', range: true },
  { name: 'ongoing long-term inferred from missing end', bookingType: 'long_term', startDate: '11/01/2026', endDate: '', ongoing: false, start: 'Nov 1, 2026', end: 'Ongoing (No end date)', range: true },
  { name: 'ongoing long-term flag', bookingType: 'long_term', startDate: '11/01/2026', endDate: ' ', ongoing: true, start: 'Nov 1, 2026', end: 'Ongoing (No end date)', range: true },
  { name: 'same Philippine day across UTC midnight', bookingType: 'short_term', startDate: '2026-10-29T16:30:00Z', endDate: '2026-10-30T01:00:00Z', start: 'Oct 30, 2026', range: false },
  { name: 'different Philippine days within one UTC day', bookingType: 'short_term', startDate: '2026-10-29T15:00:00Z', endDate: '2026-10-29T16:00:00Z', start: 'Oct 29, 2026', end: 'Oct 30, 2026', range: true },
];
for (const confirmed of [false, true]) {
  for (const item of cases) {
    test(`${confirmed ? 'Booking Details' : 'Review'}: ${item.name}`, t => {
      const view = ticket(t, { ...item, isConfirmed: confirmed });
      const startLabel = item.range ? 'Start date' : 'Service date';
      assert.ok(view.rows.some(row => row[0] === startLabel + item.start &&
        row[1] === (item.range ? 'End date' + item.end : 'Work hours08:00 AM - 05:00 PM')));
      if (!item.range) assert.ok(!view.allText.includes('End date'));
      assert.equal(view.allText.split('Work hours').length - 1, 1);
      assert.ok(view.allText.includes('Lot 1, Brgy. Pagatpat, 9000'));
    });
  }
}
for (const language of ['Tagalog', 'Bisaya']) {
  test(`${language}: ongoing explanation and date labels stay translated`, t => {
    const view = ticket(t, { bookingType: 'long_term', startDate: '11/01/2026', endDate: '' }, language);
    assert.ok(view.allText.includes(messages.translateMessage(language, 'Ongoing (No end date)')));
    assert.ok(view.allText.includes(messages.translateMessage(language, 'End date')));
  });
}
