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
const tick = async () => { await new Promise(resolve => setImmediate(resolve)); renderer.flushPassiveEffects(); };
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };
const localization = load('src/shared/localization/messages.ts');
function surfaces() {
  const native = { StyleSheet: { create: value => value, hairlineWidth: 1 }, AppState: { currentState: 'active' }, Alert: { alert() {} }, Animated: { View: 'AnimatedView' } };
  for (const name of ['View', 'Text', 'Image', 'Pressable', 'ActivityIndicator', 'ScrollView', 'RefreshControl']) native[name] = name;
  native.Modal = props => props.visible ? React.createElement('Modal', props, props.children) : null;
  return native;
}
function mount(t) {
  const container = { children: [] };
  const root = renderer.createContainer(container, 0, null, false, null, '', error => { throw error; }, null);
  const act = callback => renderer.flushSync(callback);
  const render = element => { act(() => renderer.updateContainer(element, root, null)); renderer.flushPassiveEffects(); };
  t.after(() => render(null));
  const nodes = () => { const found = []; const visit = node => { found.push(node); node.children.forEach(visit); }; visit(container); return found; };
  return { act, render, nodes, find: type => nodes().find(node => node.type === type), all: type => nodes().filter(node => node.type === type) };
}
const content = node => node.text || node.children.map(content).join('');
const participant = (id, role) => ({ id, name: id + ' Name', account_type: role, profile_link: null, rating: 0 });

function browse(t, role) {
  const screen = mount(t), requests = [], saves = [], chats = [], refreshes = [];
  const native = surfaces();
  const user = { id: 'viewer', accountType: role === 'homeowner' ? 'Homeowner' : 'Kasambahay', token: 'token', firstName: 'Viewer' };
  const store = { savedJobs: [], appliedJobs: [], savedCount: 0, appliedCount: 0, loadingSaved: false, savedLoadError: null,
    isSaved: () => false, isApplied: () => false, isJobClosed: post => post.id === 'closed',
    toggleSave: (...args) => saves.push(args), refreshSavedFromBackend: async token => { refreshes.push(token); } };
  const defaultFilters = { categories: [], bookingType: null, workSetup: null, maxRate: null, ratePeriod: 'day', location: '', sortBy: 'newest' };
  const { useExploreFeed } = load('src/features/feed/hooks/useExploreFeed.ts', {
    '../feedCache': { loadExploreFeed: (...args) => { const request = { ...deferred(), args }; requests.push(request); return request.promise; } },
  });
  const mapper = load('src/features/feed/feedMapper.ts', {
    '../bookings/workSetup': { workSetupLabel: () => 'Stay-out' }, '../../shared/utils/date': { formatTimeAgo: () => 'Just now' },
    '../bookings/api/bookingApi': { formatBookingAddress: () => 'Agusan', formatBookingLocationShort: () => 'Agusan' },
  });
  let language = 'English';
  let swipe;
  const { BrowseScreen } = load('src/features/feed/screens/BrowseScreen.tsx', {
    'react-native': native, 'react-native-safe-area-context': { useSafeAreaInsets: () => ({ top: 0 }) },
    '../../../app/roleConfig': load('src/app/roleConfig.ts'), '../../../shared/theme/theme': { default: { colors: {} } },
    '../../../shared/localization/LanguageContext': { useLanguage: () => ({ tr: (text, params) => localization.translateMessage(language, text, params) }) },
    '../../../shared/components/AppHeader': { AppHeader: 'AppHeader' }, '../../auth/session/UserContext': { useUser: () => ({ user }) },
    '../../bookings/store/savedJobsStore': { useJobsActivity: () => store }, '../../chat/components/ChatDetailScreen': { ChatDetailScreen: 'ChatDetailScreen' },
    '../../chat/store/chatStore': { chatStore: { addOrUpdateChat: chat => chats.push(chat) } }, '../../notifications/NotificationContext': { NotificationBell: 'NotificationBell' },
    '../../profile/components/UserProfileModal': { UserProfileModal: 'UserProfileModal' }, '../components/BrowseActivityCard': { BrowseActivityCard: 'BrowseActivityCard' },
    '../components/BrowseHeader': { BrowseHeader: 'BrowseHeader', BrowseFilters: 'BrowseFilters' }, '../components/BrowsePostCard': { BrowsePostCard: 'BrowsePostCard', BrowseCardBackdrop: 'BrowseCardBackdrop' },
    '../components/BrowseDeck': { ...Object.fromEntries(['BrowseDeckEmpty', 'BrowseDeckSkeleton', 'BrowseDeckSwipeControls', 'BrowseEmptyState'].map(name => [name, name])), browseDeckStyles: {} },
    '../components/FilterModal': { FilterModal: 'FilterModal', DEFAULT_FILTERS: defaultFilters }, '../components/JobDetailSheet': { JobDetailSheet: 'JobDetailSheet' },
    '../browsePresentation': load('src/features/feed/browsePresentation.ts'), '../feedMapper': mapper, '../hooks/useExploreFeed': { useExploreFeed },
    '../hooks/useBrowseSwipeDeck': { useBrowseSwipeDeck: (_id, onSwipe) => { swipe = onSwipe; return { position: { x: 0, y: 0, setValue() {} }, rotateCard: 0, panHandlers: {}, swipeCard: direction => swipe(direction === 'right') }; } },
  });
  const render = () => screen.render(React.createElement(BrowseScreen, { role, token: user.token }));
  render();
  const post = (id = 'post', author = 'author') => ({ booking_id: id, poster_id: author, name: 'Poster Name', profile_link: 'avatar', service_category: ['Cleaning'],
    work_setup: 'stay_out', booking_type: 'long_term', rate_amount: '8000', rate_period: 'month', special_instruction: 'Original post description.', createdAt: '2026-10-19' });
  return { ...screen, render, requests, saves, chats, refreshes, store, user, post,
    language(value) { language = value; render(); }, swipe: interested => screen.act(() => swipe(interested)) };
}

for (const role of ['homeowner', 'kasambahay']) {
  test(`${role}: shared Browse preserves filters, refresh, saved posts, profile and chat targets`, async t => {
    const screen = browse(t, role);
    assert.equal(screen.requests[0].args[0], role);
    screen.requests[0].resolve([screen.post(), screen.post('next', 'next-author')]); await tick();
    const card = screen.find('BrowsePostCard');
    assert.equal(card.props.name, 'Poster Name'); assert.equal(card.props.description, 'Original post description.');
    assert.equal(card.props.authorRole, role === 'homeowner' ? 'Kasambahay' : 'Homeowner');
    screen.act(() => card.props.onSave());
    assert.equal(screen.saves[0][0].partnerId, 'author');
    screen.act(() => card.props.onProfilePress());
    assert.equal(screen.find('UserProfileModal').props.userId, 'author');
    screen.act(() => screen.find('UserProfileModal').props.onClose());
    screen.act(() => screen.find('BrowsePostCard').props.onDetails());
    assert.equal(screen.find('JobDetailSheet').props.job.partnerId, 'author');
    screen.act(() => screen.find('JobDetailSheet').props.onApply());
    assert.equal(screen.find('ChatDetailScreen').props.partnerId, 'author');
    assert.equal(screen.find('ChatDetailScreen').props.userRole, role);
    screen.act(() => screen.find('ChatDetailScreen').props.onClose());
    screen.act(() => screen.find('BrowseFilters').props.onChipPress('Long-term'));
    screen.requests.at(-1).resolve([screen.post()]); await tick();
    assert.equal(screen.requests.at(-1).args[2].bookingType, 'long_term');
    assert.equal(screen.requests.at(-1).args[3], true);
    screen.act(() => screen.find('FilterModal').props.onApply({ ...screen.requests.at(-1).args[2], location: 'Agusan' }));
    screen.requests.at(-1).resolve([screen.post()]); await tick();
    const refresh = screen.find('ScrollView').props.refreshControl.props.onRefresh();
    assert.equal(screen.requests.at(-1).args[2].location, 'Agusan');
    screen.requests.at(-1).resolve([screen.post()]); await refresh; await tick();
    screen.swipe(true);
    assert.equal(screen.chats.at(-1).partnerId, 'author');
    assert.equal(screen.find('ChatDetailScreen').props.initialReplyTo.author, role === 'homeowner' ? 'Service Post' : 'Job Post');
    assert.ok(screen.find('ChatDetailScreen').props.initialReplyTo.text.includes('₱8000'));
    screen.act(() => screen.find('ChatDetailScreen').props.onClose());
    screen.store.savedJobs = [screen.saves[0][0]]; screen.store.savedCount = 1;
    screen.act(() => screen.find('BrowseHeader').props.onTabChange('saved'));
    const saved = screen.find('BrowseActivityCard');
    assert.equal(saved.props.post.partnerId, 'author');
    assert.equal(typeof saved.props.onMessage, role === 'homeowner' ? 'function' : 'undefined');
    screen.act(() => saved.props.onUnsave()); assert.equal(screen.saves.length, 2);
    assert.equal(screen.find('BrowseHeader').props.appliedCount, role === 'kasambahay' ? 0 : undefined);
    screen.language('Bisaya');
    assert.equal(screen.find('BrowseHeader').props.title, localization.translateMessage('Bisaya', role === 'kasambahay' ? 'Saved Jobs' : 'Saved Kasambahay'));
    if (role === 'kasambahay') {
      screen.store.appliedJobs = [screen.saves[0][0]]; screen.store.appliedCount = 1;
      screen.act(() => screen.find('BrowseHeader').props.onTabChange('applied'));
      assert.equal(screen.find('BrowseActivityCard').props.applied, true);
      assert.equal(screen.find('BrowseActivityCard').props.onUnsave, undefined);
      screen.act(() => screen.find('BrowseActivityCard').props.onDetails());
      assert.equal(screen.find('JobDetailSheet').props.job.partnerId, 'author');
    }
  });

  test(`${role}: Browse ignores stale filters, retries failures and resets when the session changes`, async t => {
    const screen = browse(t, role);
    const stale = screen.requests[0];
    screen.act(() => screen.find('BrowseFilters').props.onChipPress('Cleaning'));
    screen.requests.at(-1).resolve([screen.post('fresh')]); await tick();
    stale.resolve([screen.post('stale')]); await tick();
    assert.equal(screen.find('JobDetailSheet').props.visible, false);
    screen.act(() => screen.find('BrowsePostCard').props.onDetails());
    assert.equal(screen.find('JobDetailSheet').props.job.id, 'fresh');
    screen.act(() => screen.find('JobDetailSheet').props.onClose());
    screen.act(() => screen.find('BrowseFilters').props.onChipPress('Cooking'));
    screen.requests.at(-1).reject(new Error('Network unavailable')); await tick();
    assert.equal(screen.find('BrowseDeckEmpty').props.error, 'Network unavailable');
    screen.act(() => screen.find('BrowseDeckEmpty').props.onRefresh());
    screen.requests.at(-1).resolve([]); await tick();
    assert.equal(screen.find('BrowseDeckEmpty').props.fetchedCount, 0);
    screen.user.token = 'next-session'; screen.render();
    assert.deepEqual(screen.requests.at(-1).args[2].categories, []);
    assert.equal(screen.requests.at(-1).args[1], 'next-session');
    screen.requests.at(-1).resolve([]); await tick();
    assert.equal(screen.find('BrowseDeckEmpty').props.hasFilters, false);
  });
}

const participants = load('src/features/bookings/bookingParticipants.ts');
test('booking ownership uses real IDs, fails closed for missing IDs, and selects the other participant', () => {
  for (const ownerRole of ['Homeowner', 'Kasambahay']) {
    const booking = { poster: participant('owner', ownerRole), assigned_partner: participant('other', ownerRole === 'Homeowner' ? 'Kasambahay' : 'Homeowner') };
    assert.equal(participants.isBookingPoster(booking, 'owner'), true);
    assert.equal(participants.isBookingPoster(booking, 'other'), false);
    assert.equal(participants.getBookingCounterparty(booking, 'owner').id, 'other');
    assert.equal(participants.getBookingCounterparty(booking, 'other').id, 'owner');
    assert.equal(participants.isBookingPoster({}, undefined), false);
    assert.equal(participants.isBookingPoster(booking, ''), false);
    assert.equal(participants.getBookingCounterparty(booking, undefined), null);
    assert.equal(participants.getBookingCounterparty({ ...booking, assigned_partner: null, recipient: participant('recipient', 'Homeowner') }, 'owner').id, 'recipient');
  }
});

for (const accountType of ['Homeowner', 'Kasambahay']) {
  test(`${accountType}: booking offers use ownership and the heading follows all language settings`, async t => {
    const screen = mount(t);
    let language = 'English';
    const user = { id: 'viewer', accountType };
    const otherRole = accountType === 'Homeowner' ? 'Kasambahay' : 'Homeowner';
    const booking = { booking_id: 'own', poster: participant('viewer', accountType), assigned_partner: null, recipient: null,
      service_category: ['Cleaning'], booking_type: 'short_term', booking_status: 'Pending', rate_amount: '600', rate_period: 'day', start_time: '2026-10-20', end_time: '2026-10-20' };
    const { MyBookingsModal } = load('src/features/bookings/components/MyBookingsModal.tsx', {
      'react-native': surfaces(), 'react-native-safe-area-context': { useSafeAreaInsets: () => ({ top: 0 }) }, '@expo/vector-icons': { Ionicons: 'Icon' },
      '../../../shared/localization/LanguageContext': { useLanguage: () => ({ tr: text => localization.translateMessage(language, text), formatDate: value => localization.formatLocalizedDate(language, value, 'compact') }) },
      '../../../shared/realtime': { realtime: { subscribe: () => () => {} } }, '../workSetup': { workSetupLabel: () => 'Stay-out' }, '../bookingParticipants': participants,
      '../../auth/session/UserContext': { useUser: () => ({ user, updateUser() {} }) }, './ContractDownloadCard': { ContractDownloadCard: () => null },
      '../api/bookingApi': { formatBookingAddress: () => 'Agusan', fetchMyBookings: async () => [booking],
        fetchMyAssignedBookings: async () => [{ ...booking, booking_id: 'other', poster: participant('other', otherRole), recipient: participant('viewer', accountType) }],
        fetchBookingPenaltyStatus: async () => ({ penalty_points: 0, is_restricted: false }) },
      './CancelBookingModal': { CancelBookingModal: 'CancelBookingModal' }, '../../reviews/components/ReviewModal': { ReviewModal: 'ReviewModal' },
      './ProposalsModal': { ProposalsModal: 'ProposalsModal' }, '../../profile/components/UserProfileModal': { UserProfileModal: 'UserProfileModal' },
    });
    const render = () => screen.render(React.createElement(MyBookingsModal, { visible: true, token: 'token', accountType, initialTab: 'pending', onClose() {} }));
    render(); await tick();
    const offers = () => screen.all('Pressable').filter(node => content(node) === 'Offers');
    assert.equal(offers().length, 2);
    screen.act(() => offers()[0].props.onPress());
    assert.equal(screen.find('ProposalsModal').props.isPoster, true);
    assert.equal(screen.find('ProposalsModal').props.bookingId, 'own');
    screen.act(() => screen.find('ProposalsModal').props.onClose());
    screen.act(() => offers()[1].props.onPress());
    assert.equal(screen.find('ProposalsModal').props.isPoster, false);
    assert.equal(screen.find('ProposalsModal').props.bookingId, 'other');
    for (const value of ['English', 'Tagalog', 'Bisaya']) {
      language = value; render();
      const heading = accountType === 'Homeowner' ? 'My Bookings & Hires' : 'My Jobs & Contracts';
      assert.ok(screen.all('Text').some(node => content(node) === localization.translateMessage(language, heading)));
    }
    booking.booking_status = 'Completed'; booking.assigned_partner = participant('other', otherRole);
    language = 'English'; render();
    const feedback = screen.all('Pressable').find(node => content(node).includes('Mandatory Service Feedback'));
    assert.ok(content(feedback).includes('other Name'));
    screen.act(() => feedback.props.onPress());
    assert.equal(screen.find('ReviewModal').props.revieweeName, 'other Name');
  });
}
