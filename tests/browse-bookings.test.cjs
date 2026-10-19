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

function bookingDetails(t, role, bookingType, ongoing = false, options = {}) {
  const screen = mount(t), alerts = [], actions = [], closed = [];
  let language = 'English';
  const native = surfaces();
  native.Platform = { OS: 'android' };
  native.Keyboard = { dismiss() {} };
  native.Dimensions = { get: () => ({ width: 390 }) };
  native.Animated.Value = class { setValue() {} };
  native.Animated.spring = native.Animated.timing = () => ({ start: callback => callback?.() });
  native.Alert.alert = (...args) => alerts.push(args);
  native.ScrollView = React.forwardRef((props, ref) => {
    React.useImperativeHandle(ref, () => ({ scrollTo() {} }), []);
    return React.createElement('ScrollView', props, props.children);
  });
  for (const name of ['KeyboardAvoidingView', 'TextInput']) native[name] = name;
  const address = options.edit ? { selectedRegion: { name: 'Region X' }, selectedProvince: { name: 'Misamis Oriental' },
    selectedCity: { name: 'Cagayan de Oro' }, selectedBarangay: { name: 'Agusan' }, streetAddress: 'Lot 3', floorUnit: '', zipcode: '9000' }
    : { streetAddress: '', floorUnit: '', zipcode: '' };
  const initialDetails = options.initialDetails === null ? null : options.initialDetails || { bookingType, startDate: '10/20/2026', endDate: ongoing ? '' : bookingType === 'short_term' ? '10/20/2026' : '11/20/2026',
    salary: bookingType === 'short_term' ? '600' : '6500', serviceCategory: ['Cleaning'], workSetup: 'stay_out', workHours: '08:00 AM - 12:00 PM', days: [], region: 'Region X', location: 'Agusan' };
  const engagement = load('src/features/bookings/engagementForm.ts');
  const languageApi = { useLanguage: () => ({ tr: text => localization.translateMessage(language, text), formatDate: (date, style) => localization.formatLocalizedDate(language, date, style) }) };
  const theme = { default: { colors: {}, typography: { fontFamily: {} } } };
  const review = load('src/features/bookings/components/BookingOfferReview.tsx', { 'react-native': native, '@expo/vector-icons': { Ionicons: 'Icon' },
    '../../../shared/localization/LanguageContext': languageApi, '../../../shared/theme/theme': theme,
    '../engagementForm': engagement, '../workSetup': load('src/features/bookings/workSetup.ts') });
  const scheduleFields = load('src/features/bookings/components/WorkScheduleFields.tsx', { 'react-native': native, '@expo/vector-icons': { Ionicons: 'Icon' },
    '../../../shared/localization/LanguageContext': languageApi, '../engagementForm': engagement });
  const realLocation = options.locationService && load('src/features/bookings/hooks/useWorkLocation.ts', {
    'react-native': native, '../../../shared/services/locationService': options.locationService,
  });
  const locationFields = options.locationService ? load('src/features/bookings/components/WorkLocationFields.tsx', {
    'react-native': native, '@expo/vector-icons': { Ionicons: 'Icon' }, '../../../shared/localization/LanguageContext': languageApi,
    '../../../shared/ui/SearchablePickerModal': { SearchablePickerModal: () => null },
  }) : { WorkLocationFields: () => null };
  const { BookingModal } = load('src/features/bookings/components/BookingModal.tsx', {
    'react-native': native, 'react-native-safe-area-context': { useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) }, '@expo/vector-icons': { Ionicons: 'Icon' },
    '../../../shared/localization/LanguageContext': languageApi,
    '../../auth/session/UserContext': { useUser: () => ({ user: options.user || {} }) },
    '../workSetup': load('src/features/bookings/workSetup.ts'), '../engagementForm': engagement,
    '../bookingAcceptance': load('src/features/bookings/bookingAcceptance.ts', { 'react-native': native }),
    './BookingOfferReview': review, './WorkScheduleFields': scheduleFields,
    './WorkLocationFields': locationFields, '../workLocation': load('src/features/bookings/workLocation.ts'),
    '../hooks/useWorkLocation': realLocation || { useWorkLocation: () => address }, '../../posting/validation': load('src/features/posting/validation.ts', { './postingConfig': load('src/features/posting/postingConfig.ts') }),
    '../../../shared/ui/ProfileAvatar': { ProfileAvatar: 'ProfileAvatar' }, '../api/bookingApi': { fetchMinimumWage: async (_token, type) => ({ booking_type: type, rate_period: type === 'long_term' ? 'month' : 'day', minimum_rate: type === 'long_term' ? '6500' : '600' }) },
    '../../../shared/theme/theme': theme, '../../../../assets/serbisure-logo.png': 1,
  });
  const render = (status = {}) => screen.render(React.createElement(BookingModal, {
    visible: true, readOnly: !options.edit, canRespond: !options.edit, userRole: role, bookingType, contactName: 'Other Participant', initialDetails,
    onClose: () => closed.push(true), onKasambahayConfirm: () => { const request = deferred(); actions.push(request); return request.promise; },
    onConfirm: details => { const request = { ...deferred(), details }; actions.push(request); return request.promise; }, ...status,
  }));
  const pressAccept = () => screen.act(() => screen.all('Pressable').find(node => content(node) === localization.translateMessage(language, 'Agree & Accept')).props.onPress());
  render();
  const press = label => {
    screen.act(() => {
      const node = screen.all('Pressable').find(node => node.props.accessibilityLabel === label || content(node) === label || node.children.some(child => child.type === 'Text' && content(child) === label));
      assert.ok(node, 'Missing button: ' + label); assert.ok(!node.props.disabled, 'Disabled button: ' + label); node.props.onPress();
    });
    renderer.flushPassiveEffects();
  };
  return { ...screen, render, pressAccept, press, text: () => content(screen.find('Modal')), alerts, actions, closed, language(value) { language = value; render(); } };
}

for (const role of ['homeowner', 'kasambahay']) {
  test(`${role}: chat offer uses the signed-in profile address, allows edits and sends the chosen address`, async t => {
    const profile = { city: 'City of Cagayan De Oro', barangay: 'Brgy. Pagatpat', region: 'Northern Mindanao - Region X',
      province: 'Misamis Oriental', street: 'Lot 5555', zipcode: '9000' };
    const screen = bookingDetails(t, role, 'short_term', false, { edit: true, user: profile,
      initialDetails: { bookingType: 'short_term', startDate: '12/31/2099', workHours: '08:00 AM - 12:00 PM', serviceCategory: ['Cleaning'], salary: '800' },
      locationService: {
        getRegions: async () => [{ code: '10', name: 'Region X', displayName: profile.region }],
        getProvinces: async () => [{ code: '1043', name: profile.province }],
        getCities: async () => [{ code: '104305', name: profile.city }],
        getBarangays: async () => [{ code: '104305001', name: 'Pagatpat' }],
        getZipCodeForCity: () => '9000',
      },
    }); await tick(); screen.press('Next'); screen.press('Next');
    for (const language of ['English', 'Tagalog', 'Bisaya']) {
      screen.language(language); assert.ok(screen.text().includes(localization.translateMessage(language, 'Use Profile Address')));
    }
    screen.language('English'); screen.press('Use Profile Address'); await tick();
    for (const value of ['Northern Mindanao - Region X', 'Misamis Oriental', profile.city, 'Pagatpat']) assert.ok(screen.text().includes(value));
    const street = () => screen.all('TextInput').find(node => node.props.accessibilityLabel === 'Work street address');
    assert.equal(street().props.value, profile.street);
    assert.equal(screen.all('TextInput').find(node => node.props.accessibilityLabel === 'Work ZIP code').props.value, profile.zipcode);
    screen.act(() => street().props.onChangeText('Lot 77')); screen.press('Review Offer');
    assert.match(screen.text(), /Lot 77, Pagatpat, City of Cagayan De Oro/);
    screen.press('Send Offer'); await tick();
    assert.equal(screen.actions[0].details.street, 'Lot 77');
    assert.equal(screen.actions[0].details.barangay, 'Pagatpat');
    assert.equal(screen.actions[0].details.zipCode, '9000');
    assert.equal(screen.actions[0].details.salary, '800');
    screen.actions[0].resolve(); await tick();
  });
}

test('chat offer hides the address shortcut when no profile address is saved and on saved offer details', async t => {
  const screen = bookingDetails(t, 'homeowner', 'short_term', false, { edit: true, initialDetails: {
    bookingType: 'short_term', startDate: '12/31/2099', workHours: '08:00 AM - 12:00 PM', serviceCategory: ['Cleaning'],
  } }); await tick(); screen.press('Next'); screen.press('Next');
  assert.doesNotMatch(screen.text(), /Use Profile Address/);
  screen.render({ readOnly: true }); assert.doesNotMatch(screen.text(), /Use Profile Address/);
});

for (const role of ['homeowner', 'kasambahay']) {
  test(`${role}: new short-term chat offers use Stay-out without a setup choice and support custom hours`, async t => {
    const screen = bookingDetails(t, role, 'short_term', false, { edit: true, initialDetails: null }); await tick();
    assert.doesNotMatch(screen.text(), /WORK SETUP|Stay-in|Stay-out/);
    screen.press('Cleaning'); screen.press('Next');
    assert.match(screen.text(), /AVAILABILITY DATE/);
    assert.doesNotMatch(screen.text(), /With an end date|No end date|WORK SCHEDULE/);
    screen.press('Service date'); screen.press('Next month'); screen.press('1');
    for (const label of ['Morning', 'Afternoon', 'Night']) {
      screen.press(label);
      assert.equal(screen.all('Pressable').find(node => node.children.some(child => content(child) === label)).props.accessibilityState.selected, true);
    }
    screen.press('Set my own time');
    const change = (label, value) => screen.act(() => screen.all('TextInput').find(node => node.props.accessibilityLabel === label).props.onChangeText(value));
    change('Start time', '09:00'); change('End time', '09:00');
    screen.act(() => screen.all('Pressable').filter(node => content(node) === 'AM')[0].props.onPress());
    screen.act(() => screen.all('Pressable').filter(node => content(node) === 'AM').at(-1).props.onPress()); screen.press('Set Working Hours');
    assert.match(screen.text(), /End time must be after start time/);
    change('End time', '02:00');
    screen.act(() => screen.all('Pressable').filter(node => content(node) === 'PM').at(-1).props.onPress()); screen.press('Set Working Hours');
    assert.match(screen.text(), /09:00 AM - 02:00 PM/);
    screen.press('Next');
    change('Daily rate', '800'); screen.press('Review Offer');
    assert.match(screen.text(), /09:00 AM - 02:00 PM/);
    assert.doesNotMatch(screen.text(), /Work setup|Stay-in|Stay-out/);
    screen.press('Send Offer'); await tick();
    const details = screen.actions[0].details;
    assert.equal(details.workSetup, 'stay_out'); assert.equal(details.bookingType, 'short_term');
    assert.equal(details.endDate, details.startDate); assert.equal(details.ongoing, false);
    assert.equal(details.workHours, '09:00 AM - 02:00 PM'); assert.equal(details.days.length, 1);
    screen.actions[0].reject(new Error('Failed to fetch')); await tick();
    assert.equal(screen.closed.length, 0);
    assert.equal(screen.alerts.at(-1)[1], 'Could not connect. Check your connection and try again.');
    screen.press('Send Offer'); await tick(); screen.actions[1].resolve(); await tick();
    assert.equal(screen.closed.length, 1);
  });

  test(`${role}: switching a Stay-in chat offer to short-term clears long-term terms and sends Stay-out`, async t => {
    const screen = bookingDetails(t, role, 'long_term', false, { edit: true, initialDetails: {
      bookingType: 'long_term', startDate: '12/31/2099', endDate: '01/30/2100', salary: '8000',
      serviceCategory: ['Cleaning'], workSetup: 'stay_in', workHours: '09:00 AM - 02:00 PM', days: ['Th'],
    } }); await tick();
    assert.match(screen.text(), /WORK SETUP/);
    screen.press('Short-term'); await tick();
    assert.doesNotMatch(screen.text(), /WORK SETUP|Stay-in|Stay-out/);
    screen.press('Next'); screen.press('Next');
    assert.match(screen.text(), /Choose a preset or set your own working hours/);
    assert.doesNotMatch(screen.text(), /No end date|WORK SCHEDULE/);
    screen.press('Morning'); screen.press('Next');
    assert.equal(screen.all('TextInput').find(node => node.props.accessibilityLabel === 'Daily rate').props.value, '');
    screen.act(() => screen.all('TextInput').find(node => node.props.accessibilityLabel === 'Daily rate').props.onChangeText('800'));
    screen.press('Review Offer'); screen.press('Send Offer'); await tick();
    assert.equal(screen.actions[0].details.workSetup, 'stay_out');
    assert.equal(screen.actions[0].details.endDate, '12/31/2099');
    assert.equal(screen.actions[0].details.ongoing, false);
    assert.equal(screen.actions[0].details.workHours, '08:00 AM - 12:00 PM');
    screen.actions[0].resolve(); await tick();
  });

  for (const ongoing of [false, true]) test(`${role}: ${ongoing ? 'ongoing' : 'fixed'} long-term chat offers share posting duration rules and review`, async t => {
    const screen = bookingDetails(t, role, 'long_term', false, { edit: true, initialDetails: {
      bookingType: 'long_term', startDate: '12/31/2099', endDate: '01/30/2100', salary: '8000',
      serviceCategory: ['Cleaning'], workSetup: 'stay_in', workHours: '09:00 AM - 02:00 PM', days: ['Th'],
    } }); await tick(); screen.press('Next');
    for (const language of ['English', 'Tagalog', 'Bisaya']) {
      screen.language(language);
      for (const label of ['With an end date', 'No end date']) assert.ok(screen.text().includes(localization.translateMessage(language, label)));
    }
    screen.language('English'); screen.press('No end date');
    assert.equal(screen.all('Pressable').some(node => node.props.accessibilityLabel === 'End date'), false);
    screen.press('With an end date'); screen.press('Next');
    assert.match(screen.text(), /Choose an end date or select No end date/);
    if (ongoing) {
      screen.press('No end date');
      assert.doesNotMatch(screen.text(), /Choose an end date or select No end date/);
    } else {
      screen.press('End date');
      assert.equal(screen.all('Pressable').find(node => content(node) === '29').props.disabled, true);
      assert.equal(screen.all('Pressable').find(node => content(node) === '30').props.disabled, false);
      screen.press('30');
    }
    screen.press('Next'); screen.press('Review Offer');
    assert.match(screen.text(), /Work setupStay-in/);
    assert.match(screen.text(), ongoing ? /EndsNo end date/ : /Ends01\/30\/2100/);
    screen.press('Send Offer'); await tick();
    assert.equal(screen.actions[0].details.ongoing, ongoing);
    assert.equal(screen.actions[0].details.endDate, ongoing ? '' : '01/30/2100');
    assert.equal(screen.actions[0].details.workSetup, 'stay_in');
    assert.deepEqual(screen.actions[0].details.days, ['Th']);
    screen.actions[0].resolve(); await tick();
  });
}

for (const role of ['homeowner', 'kasambahay']) {
  for (const type of ['short_term', 'fixed_long_term', 'ongoing_long_term']) {
    test(`${role}: ${type} acceptance uses the correct translated prompt and waits for confirmation`, async t => {
      const screen = bookingDetails(t, role, type === 'short_term' ? 'short_term' : 'long_term', type === 'ongoing_long_term');
      for (const language of ['English', 'Tagalog', 'Bisaya']) {
        screen.language(language); screen.pressAccept();
        const [title, message, buttons] = screen.alerts.at(-1);
        assert.equal(title, localization.translateMessage(language, type === 'short_term' ? 'Accept booking?' : 'Confirm Contract Agreement'));
        assert.equal(message, localization.translateMessage(language, type === 'short_term'
          ? 'Accept this short-term booking with the dates, hours, and pay shown?'
          : 'Accept this long-term booking? Sign the contract and register it at the Barangay separately.'));
        assert.equal(buttons[0].style, 'cancel');
        assert.equal(buttons[0].text, localization.translateMessage(language, 'Review Details'));
        assert.equal(buttons[1].text, localization.translateMessage(language, 'Agree & Accept'));
        assert.equal(screen.actions.length, 0);
      }
      const confirm = screen.alerts.at(-1)[2][1].onPress;
      screen.act(() => { confirm(); confirm(); }); await tick();
      assert.equal(screen.actions.length, 1);
      assert.equal(screen.closed.length, 0);
      screen.actions[0].resolve(); await tick();
      assert.equal(screen.closed.length, 1);
    });
  }
}

test('failed booking acceptance stays open with a concise translated connection error and allows retry', async t => {
  const screen = bookingDetails(t, 'kasambahay', 'short_term');
  screen.language('Bisaya'); screen.pressAccept();
  screen.act(() => screen.alerts.at(-1)[2][1].onPress()); await tick();
  screen.actions[0].reject(new Error('Request timed out (15s). Could not reach server at http://private-server/api/v1/booking/id/accept/')); await tick();
  assert.equal(screen.closed.length, 0);
  assert.deepEqual(screen.alerts.at(-1), [localization.translateMessage('Bisaya', 'Booking not updated'),
    localization.translateMessage('Bisaya', 'Could not connect. Check your connection and try again.')]);
  screen.pressAccept(); screen.act(() => screen.alerts.at(-1)[2][1].onPress()); await tick();
  assert.equal(screen.actions.length, 2);
  screen.actions[1].reject(null); await tick();
  assert.equal(screen.alerts.at(-1)[1], localization.translateMessage('Bisaya', 'Please try again.'));
  screen.pressAccept(); screen.act(() => screen.alerts.at(-1)[2][1].onPress()); await tick();
  screen.actions[2].resolve(); await tick();
  assert.equal(screen.closed.length, 1);
});

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
