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
  createInstance: (type, props) => ({ type, props, children: [] }), createTextInstance: text => ({ text, children: [] }), getPublicInstance: node => node,
  appendInitialChild: append, appendChild: append, appendChildToContainer: append, removeChild: remove, removeChildFromContainer: remove,
  prepareUpdate: () => true, commitUpdate(node, _payload, _type, _old, props) { node.props = props; }, commitTextUpdate(node, _old, text) { node.text = text; },
  finalizeInitialChildren: () => false, clearContainer(node) { node.children = []; },
  scheduleTimeout: setTimeout, cancelTimeout: clearTimeout, noTimeout: -1, detachDeletedInstance() {},
});

const animation = () => ({ start(callback) { callback?.(); } });
const native = { StyleSheet: { create: styles => styles, absoluteFill: {}, absoluteFillObject: {} },
  Dimensions: { get: () => ({ height: 800, width: 390 }) }, PanResponder: { create: () => ({ panHandlers: {} }) },
  Animated: { View: 'AnimatedView', spring: animation, timing: animation,
    Value: class { setValue() {} addListener() { return 'listener'; } removeListener() {} interpolate() { return 1; } } },
};
for (const name of ['View', 'Text', 'Pressable', 'ScrollView', 'Image', 'ActivityIndicator']) native[name] = name;
native.Modal = props => props.visible ? React.createElement('Modal', props, props.children) : null;
let language = 'English';
function load(name) {
  let file = path.resolve(__dirname, '..', name);
  if (!path.extname(file)) file += fs.existsSync(file + '.ts') ? '.ts' : '.tsx';
  const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    fileName: file, compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React },
  }).outputText;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', source)(specifier => {
    if (specifier === 'react') return { ...React, default: React };
    if (specifier === 'react-native') return native;
    if (specifier === '@expo/vector-icons') return { Ionicons: 'Icon' };
    if (specifier === 'react-native-safe-area-context') return { useSafeAreaInsets: () => ({ bottom: 0 }) };
    if (specifier.endsWith('/LanguageContext')) return { useLanguage: () => ({
      tr: value => messages.translateMessage(language, value), formatDate: (value, style) => messages.formatLocalizedDate(language, value, style),
    }) };
    if (specifier.endsWith('/UserContext')) return { useUser: () => ({ user: {} }) };
    if (specifier.endsWith('/reviewApi')) return { fetchReviewSummary: () => { throw new Error('Unexpected request'); } };
    if (specifier.endsWith('/BottomSheetHandle')) return { BottomSheetHandle: () => null };
    if (specifier.endsWith('/LucideIcons')) return { StarIcon: 'Icon' };
    if (specifier.endsWith('/PrivacyPolicyModal')) return { PrivacyPolicyModal: () => null };
    if (specifier === '../styles') return { postingStyles: {}, profileStyles: {} };
    if (specifier.endsWith('/savedJobsStore')) return { useJobsActivity: () => ({ isSaved: () => false, toggleSave() {} }) };
    if (specifier.endsWith('/FeedPostCard')) return { FeedPostCard: 'FeedPostCard' };
    if (specifier.endsWith('/api/config')) return {};
    if (specifier.endsWith('/api/httpClient')) return {};
    if (specifier.startsWith('.')) return load(path.relative(path.resolve(__dirname, '..'), path.resolve(path.dirname(file), specifier)));
    throw new Error('Unexpected dependency: ' + specifier);
  }, module, module.exports);
  return module.exports;
}
const messages = load('src/shared/localization/messages.ts');
const { PostStep3 } = load('src/features/posting/components/PostStep3.tsx');
const { JobDetailSheet } = load('src/features/feed/components/JobDetailSheet.tsx');
const { PendingPostCard } = load('src/features/profile/components/PendingPostCard.tsx');
const mapper = load('src/features/feed/feedMapper.ts');
const text = node => node.text || node.children.map(text).join('');
function mount(t, element) {
  const container = { children: [] };
  const root = renderer.createContainer(container, 0, null, false, null, '', error => { throw error; }, null);
  const render = element => { renderer.flushSync(() => renderer.updateContainer(element, root, null)); renderer.flushPassiveEffects(); };
  t.after(() => render(null)); render(element);
  const nodes = () => { const all = []; const visit = node => { all.push(node); node.children.forEach(visit); }; visit(container); return all; };
  return { nodes, content: () => text(container), render };
}
const form = { step: 3, config: { role: 'kasambahay' }, engagementType: 'short', setupPreference: 'stay-out', offerAmount: '800',
  agreedTerms: false, setAgreedTerms() {}, getSelectedRoleLabel: () => 'Cleaning', getLocationLabel: () => 'Pagatpat', buildAutoMessage: () => 'Listing',
  fieldErrors: {}, isPosting: false, startDate: '11/01/2026', endDate: '11/05/2026', ongoing: false,
  workHours: '08:00 AM - 05:00 PM', workDays: ['Su', 'M', 'T', 'W', 'Th'],
};
const dto = { booking_id: 'post-1', poster_id: 'owner-1', name: 'Poster', profile_link: 'avatar', booking_type: 'short_term',
  booking_status: 'Pending', rate_amount: '800', rate_period: 'day', service_category: ['Cleaning'],
  start_time: '2026-11-01T00:00:00Z', end_time: '2026-11-05T09:00:00Z', daily_start_time: '08:00:00', daily_end_time: '17:00:00', work_days: ['Su', 'M', 'T', 'W', 'Th'],
};
const detail = (t, post) => mount(t, React.createElement(JobDetailSheet, { visible: true, job: post, onClose() {}, onApply() {}, isApplied: false }));

for (const role of ['homeowner', 'kasambahay']) {
  test(`${role} posting review displays multi-day dates, daily hours and chosen weekdays`, t => {
    const screen = mount(t, React.createElement(PostStep3, { form: { ...form, config: { role } } }));
    assert.match(screen.content(), /Work Dates11\/01\/2026 – 11\/05\/2026/);
    assert.match(screen.content(), /08:00 AM – 05:00 PM \(Mon, Tue, Wed, Thu, Sun\)/);
  });
}

test('posting review distinguishes same-day and ongoing terms', t => {
  const screen = mount(t, React.createElement(PostStep3, { form: { ...form, endDate: form.startDate, workDays: ['Su'] } }));
  assert.match(screen.content(), /11\/01\/2026 \(Same day\)/);
  screen.render(React.createElement(PostStep3, { form: { ...form, engagementType: 'long', ongoing: true, endDate: '' } }));
  assert.match(screen.content(), /11\/01\/2026 – Ongoing \(No end date\)/);
});

test('feed, browse, and worker mappings preserve the complete schedule, including an open end', () => {
  for (const end_time of [dto.end_time, null]) {
    const input = { ...dto, end_time };
    for (const post of [mapper.mapFeedPost(input, 'homeowner'), mapper.mapFeedPost(input, 'kasambahay'),
      mapper.mapBrowsePost(input, 'homeowner'), mapper.mapBrowsePost(input, 'kasambahay'), mapper.mapWorkerPreview(input)]) {
      for (const key of ['start_time', 'end_time', 'booking_type', 'daily_start_time', 'daily_end_time', 'work_days']) {
        assert.deepEqual(post[key], input[key], key);
      }
    }
  }
});

test('profile post Details receives all stored schedule fields', t => {
  let opened;
  const screen = mount(t, React.createElement(PendingPostCard, { post: dto, note: '', authorName: 'Poster', onDetails: value => { opened = value; } }));
  const card = screen.nodes().find(node => node.type === 'FeedPostCard');
  card.props.onDetails();
  for (const key of ['end_time', 'daily_start_time', 'daily_end_time', 'work_days']) assert.deepEqual(opened[key], dto[key]);
  assert.match(detail(t, opened).content(), /Nov 1, 2026 – Nov 5, 2026/);
});

test('Details shows schedule above About and keeps the Expired notice', t => {
  t.mock.method(Date, 'now', () => Date.parse('2026-11-06T04:00:00Z'));
  const screen = detail(t, mapper.mapFeedPost(dto, 'homeowner'));
  const content = screen.content();
  assert.match(content, /Nov 1, 2026 – Nov 5, 2026/);
  assert.match(content, /08:00 AM – 05:00 PM/);
  assert.match(content, /Mon, Tue, Wed, Thu, Sun/);
  assert.match(content, /Expired/);
  assert.ok(content.indexOf('Work Dates') < content.indexOf('ABOUT THIS ROLE'));
});

test('Details uses the Philippine calendar across UTC midnight and distinguishes same-day and ongoing jobs', t => {
  const screen = detail(t, { ...dto, id: dto.booking_id, start_time: '2026-10-31T16:00:00Z', end_time: '2026-11-01T09:00:00Z' });
  assert.match(screen.content(), /Nov 1, 2026 \(Same day\)/);
  screen.render(React.createElement(JobDetailSheet, { visible: true, job: { ...dto, id: dto.booking_id, booking_type: 'long_term', end_time: null }, onClose() {}, onApply() {}, isApplied: false }));
  assert.match(screen.content(), /Nov 1, 2026 – Ongoing \(No end date\)/);
});

test('missing legacy dates or hours show unavailable values rather than invented schedules', t => {
  const screen = detail(t, { id: 'legacy', start_time: 'bad-date', daily_start_time: '24:99:00', daily_end_time: '17:00:00' });
  assert.match(screen.content(), /Date unavailable/);
  assert.match(screen.content(), /Not provided/);
  assert.doesNotMatch(screen.content(), /Invalid Date|NaN|Ongoing|08:00 AM/);
});

test('schedule labels and weekday names follow the selected language', t => {
  language = 'Tagalog'; t.after(() => { language = 'English'; });
  const screen = detail(t, mapper.mapFeedPost(dto, 'homeowner'));
  assert.match(screen.content(), /Mga petsa ng trabaho/);
  assert.match(screen.content(), /Oras ng trabaho/);
  assert.match(screen.content(), /Lun, Mar, Miy, Huw, Lin/);
});
