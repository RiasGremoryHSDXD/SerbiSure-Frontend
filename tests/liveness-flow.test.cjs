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
  createInstance: (type, props) => ({ type, props, children: [] }),
  createTextInstance: text => ({ text, children: [] }), getPublicInstance: instance => instance,
  appendInitialChild: append, appendChild: append, appendChildToContainer: append,
  removeChild: remove, removeChildFromContainer: remove,
  insertBefore(parent, child, before) { remove(parent, child); parent.children.splice(parent.children.indexOf(before), 0, child); },
  insertInContainerBefore(parent, child, before) { remove(parent, child); parent.children.splice(parent.children.indexOf(before), 0, child); },
  prepareUpdate: () => true, commitUpdate(instance, _payload, _type, _old, props) { instance.props = props; },
  commitTextUpdate(instance, _old, text) { instance.text = text; }, resetTextContent() {},
  finalizeInitialChildren: () => false, clearContainer(container) { container.children = []; },
  scheduleTimeout: setTimeout, cancelTimeout: clearTimeout, noTimeout: -1, detachDeletedInstance() {},
});
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};
const tick = async () => { await new Promise(resolve => setImmediate(resolve)); renderer.flushPassiveEffects(); };

function harness(t, extraMocks = {}) {
  const alerts = [];
  const native = { StyleSheet: { create: value => value }, Alert: { alert: (...args) => alerts.push(args) } };
  for (const type of ['View', 'Text', 'Pressable', 'Image', 'ActivityIndicator', 'TextInput', 'KeyboardAvoidingView', 'ScrollView']) native[type] = type;
  native.Platform = { OS: 'android', select: values => values.android || values.default };
  native.ScrollView = React.forwardRef((props, ref) => {
    React.useImperativeHandle(ref, () => ({ scrollTo() {} }));
    return React.createElement('ScrollView', props);
  });
  const mocks = {
    'react-native': native,
    'react-native-safe-area-context': { useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) },
    '@expo/vector-icons': { Ionicons: 'Icon' },
    '@shopify/react-native-skia': { Canvas: 'Canvas', Circle: 'Circle', Path: 'Path', Skia: { Path: { Make: () => ({ addArc() {} }) } } },
    '../../../shared/theme/theme': { default: { colors: {}, roundness: {}, typography: { fontFamily: {}, tracking: {} } } },
    '../../auth/components/RegistrationStepper': { RegistrationStepper: () => null },
    './IDPhotoModal': { IDPhotoModal: () => null },
    '../../../shared/api/config': { API_BASE_URL: 'http://test.local' },
    '../../../shared/api/httpClient': { fetchWithTimeout: async () => ({ json: async () => ({ documents: [] }) }) },
    ...extraMocks,
  };
  const cache = new Map();
  function load(filename) {
    filename = path.resolve(__dirname, '..', filename);
    if (cache.has(filename)) return cache.get(filename);
    const source = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { fileName: filename,
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX } }).outputText;
    const module = { exports: {} };
    new Function('require', 'module', 'exports', source)(name => {
      if (name in mocks) return mocks[name];
      if (name === 'react' || name === 'react/jsx-runtime') return require(name);
      if (/\.png$/.test(name)) return 'image';
      if (name.startsWith('.')) {
        const target = path.resolve(path.dirname(filename), name);
        return load(['.ts', '.tsx'].map(extension => target + extension).find(fs.existsSync));
      }
      throw new Error('Unexpected dependency: ' + name);
    }, module, module.exports);
    cache.set(filename, module.exports);
    return module.exports;
  }
  const container = { children: [] };
  const root = renderer.createContainer(container, 0, null, false, null, '', error => { throw error; }, null);
  const render = component => { renderer.flushSync(() => renderer.updateContainer(component, root, null)); renderer.flushPassiveEffects(); };
  const unmount = () => render(null);
  t.after(unmount);
  const nodes = () => {
    const result = [];
    const visit = node => { result.push(node); node.children.forEach(visit); };
    container.children.forEach(visit); return result;
  };
  const text = node => node.text || node.children.map(text).join('');
  return { load, render, unmount, alerts, nodes, button: label => nodes().find(node => node.type === 'Pressable' && text(node) === label) };
}

test('liveness opens documents immediately after capture and stops tracking; no upload wait or success timer', async t => {
  const photo = deferred(); const verified = []; let now = 1000;
  t.mock.method(Date, 'now', () => now);
  const FaceCamera = React.forwardRef((props, ref) => {
    React.useImperativeHandle(ref, () => ({ captureSelfie: () => photo.promise }));
    return React.createElement('FaceCamera', props);
  });
  const h = harness(t, { '../camera/FaceCamera': { FaceCamera } });
  const { LivenessScreen } = h.load('src/features/verification/components/LivenessScreen.tsx');
  h.render(React.createElement(LivenessScreen, { onVerified: result => verified.push(result) }));
  renderer.flushSync(() => h.button('Continue').props.onPress()); renderer.flushPassiveEffects();
  const frame = (yawAngle, timestamp) => ({ frameWidth: 100, frameHeight: 100, timestamp,
    face: { bounds: { x: 30, y: 30, width: 40, height: 40 }, points: [], signals: { yawAngle }, timestamp } });
  for (const [yaw, time] of [[0, 1000], [-15, 1200], [15, 1400], [0, 1600], [0, 4600]]) {
    now = time;
    renderer.flushSync(() => h.nodes().find(node => node.type === 'FaceCamera').props.onLandmarks(frame(yaw, time)));
    renderer.flushPassiveEffects();
  }
  assert.equal(h.nodes().find(node => node.type === 'FaceCamera').props.detecting, false);
  assert.equal(verified.length, 0);
  photo.resolve('file:///selfie.jpg'); await tick();
  assert.equal(verified.length, 1);
  assert.equal(verified[0].selfiePath, 'file:///selfie.jpg');
});

function registrationForm(t, role = 'homeowner') {
  const requests = [], completed = [], users = [];
  const h = harness(t, {
    '../../../shared/localization/LanguageContext': { useLanguage: () => ({ tr: value => value }) },
    '../session/UserContext': { useUser: () => ({ updateUser: value => users.push(value) }) },
    '../../../shared/ui/SearchablePickerModal': { SearchablePickerModal: 'LocationPicker' },
    '../../../shared/ui/DateOfBirthPickerModal': { DateOfBirthPickerModal: 'BirthPicker' },
    '../../../shared/ui/DemographicPickerModal': { DemographicPickerModal: 'DemographicPicker' },
    '../../profile/components/PrivacyPolicyModal': { PrivacyPolicyModal: () => null },
    '../../profile/worker/WorkerCvForm': { WorkerCvForm: 'WorkerForm' },
    '../components/RegistrationStepper': { RegistrationStepper: () => null },
    '../components/RegistrationErrorModal': { RegistrationErrorModal: 'RegistrationError' },
    '../../verification/components/LivenessScreen': { LivenessScreen: 'Liveness' },
    '../../../shared/services/locationService': {
      getRegions: async () => [], getProvinces: async () => [], getCities: async () => [], getBarangays: async () => [],
      getZipCodeForCity: () => '9000',
    },
    '../../../shared/api/httpClient': { fetchWithTimeout: (url, options) => {
      const request = deferred(); requests.push({ ...request, url, options }); return request.promise;
    } },
  });
  const { RegistrationScreen } = h.load('src/features/auth/screens/RegistrationScreen.tsx');
  h.render(React.createElement(RegistrationScreen, { role, onNext: (...args) => completed.push(args) }));
  const act = callback => { renderer.flushSync(callback); renderer.flushPassiveEffects(); };
  const input = (placeholder, value) => act(() => h.nodes().find(node => node.type === 'TextInput' && node.props.placeholder === placeholder).props.onChangeText(value));
  const node = type => h.nodes().find(node => node.type === type);
  input('First Name', 'Test'); input('Last Name', 'Resident');
  input('Email', 'test@example.com'); input('Password (min. 8 characters)', 'password123'); input('Confirm Password', 'password123');
  // Phone input has a short formatted example as its placeholder.
  act(() => h.nodes().find(item => item.type === 'TextInput' && item.props.keyboardType === 'phone-pad').props.onChangeText('9123456789'));
  act(() => node('BirthPicker').props.onSelect('2000-01-01', 26));
  act(() => h.button('Female').props.onPress());
  act(() => h.button('Next').props.onPress());
  if (role === 'kasambahay') {
    act(() => node('WorkerForm').props.onChange({ ...node('WorkerForm').props.value,
      service_categories: ['Cleaning'], work_setup: 'stay_out', engagement_preference: 'short_term', desired_daily_rate: '800',
      experience_level: 'new', civil_status: 'Single', number_of_children: '0', available_from: '2026-11-01', available_days: ['M'], preferred_shifts: ['morning'], languages: ['English'],
    }));
    // Visit the four existing CV pages.
    for (let page = 0; page < 4; page++) act(() => h.button('Next').props.onPress());
  }
  for (const [title, value] of [['Select Region', { code: '10', name: 'Northern Mindanao' }], ['Select Province', { code: 'province', name: 'Misamis Oriental' }],
    ['Select City / Municipality', { code: 'city', name: 'Cagayan de Oro' }], ['Select Barangay', { code: 'barangay', name: 'Agusan' }]]) {
    act(() => h.nodes().find(item => item.type === 'LocationPicker' && item.props.title === title).props.onSelect(value));
  }
  input('House No. / Street / Zone / Subdivision', '123 Street'); input('Zip Code (e.g. 9000)', '9000');
  act(() => h.nodes().filter(item => item.type === 'Pressable' && item.props.accessibilityRole === 'checkbox').forEach(item => item.props.onPress()));
  return { ...h, requests, completed, users, act, node, input };
}

for (const role of ['homeowner', 'kasambahay']) {
  test(`${role} registration waits for a captured face check and ignores repeated callbacks`, async t => {
    const h = registrationForm(t, role);
    assert.equal(h.requests.length, 0);
    h.act(() => h.button('Continue').props.onPress());
    assert.ok(h.node('Liveness')); assert.equal(h.requests.length, 0);
    h.act(() => h.node('Liveness').props.onVerified({ verified: false, selfiePath: '/selfie.jpg' }));
    h.act(() => h.node('Liveness').props.onVerified({ verified: true }));
    assert.equal(h.requests.length, 0);
    const selfie = { verified: true, completedAt: 1000, selfiePath: '/selfie.jpg' };
    const verified = h.node('Liveness').props.onVerified;
    h.act(() => { verified(selfie); verified(selfie); });
    assert.equal(h.requests.length, 1); assert.equal(h.node('Liveness').props.submitting, true);
    assert.equal(h.node('Liveness').props.onBack, undefined);
    assert.equal(h.completed.length, 0);
    h.requests[0].resolve(new Response(JSON.stringify({ access: 'created-token', refresh: 'refresh-token' }), { status: 201 })); await tick();
    assert.deepEqual(h.completed, [['created-token', selfie]]);
    h.act(() => verified(selfie)); assert.equal(h.requests.length, 1);
  });
}

test('registration retry retains the selfie and request key, while editing preserves form details', async t => {
  const h = registrationForm(t);
  h.act(() => h.button('Continue').props.onPress());
  const selfie = { verified: true, completedAt: 1000, selfiePath: '/selfie.jpg' };
  h.act(() => h.node('Liveness').props.onVerified(selfie));
  h.requests[0].reject(new Error('Network request failed')); await tick();
  assert.equal(h.completed.length, 0); assert.equal(h.users.length, 0);
  assert.equal(h.node('Liveness').props.submissionFailed, true);
  assert.ok(h.node('RegistrationError').props.errorData);
  h.act(() => h.node('RegistrationError').props.onClose());
  h.act(() => h.node('Liveness').props.onRetrySubmission());
  assert.equal(h.requests[1].options.headers['Idempotency-Key'], h.requests[0].options.headers['Idempotency-Key']);
  h.requests[1].resolve(new Response(JSON.stringify({ email: ['Already registered.'] }), { status: 400 })); await tick();
  assert.equal(h.completed.length, 0);
  h.act(() => h.node('RegistrationError').props.onGoToStep(1));
  assert.equal(h.nodes().find(item => item.type === 'TextInput' && item.props.placeholder === 'First Name').props.value, 'Test');
  h.input('Email', 'corrected@example.com');
  h.act(() => h.button('Next').props.onPress()); h.act(() => h.button('Continue').props.onPress());
  assert.equal(h.requests.length, 2);
  h.act(() => h.node('Liveness').props.onVerified(selfie));
  assert.notEqual(h.requests[2].options.headers['Idempotency-Key'], h.requests[0].options.headers['Idempotency-Key']);
  h.unmount();
  h.requests[2].resolve(new Response(JSON.stringify({ access: 'token', refresh: 'refresh' }), { status: 201 })); await tick();
  assert.equal(h.completed.length, 0);
});

test('Skip and Cancel wait for selfie confirmation and cannot bypass a failed save', async t => {
  const h = harness(t);
  const { createSelfieUploadTask } = h.load('src/features/verification/api/selfieUpload.ts');
  const { DocumentUploadScreen } = h.load('src/features/verification/components/DocumentUploadScreen.tsx');
  const request = deferred(); let skipped = 0, cancelled = 0;
  const task = createSelfieUploadTask(() => request.promise);
  h.render(React.createElement(DocumentUploadScreen, { selfieUpload: task, onSkip: () => skipped++, onCancel: () => cancelled++ }));
  h.button('Skip').props.onPress();
  h.button('Cancel').props.onPress();
  assert.equal(skipped, 0); assert.equal(cancelled, 0);
  request.reject(new Error('Upload failed')); await tick();
  assert.equal(skipped, 0); assert.equal(cancelled, 0);
  assert.equal(task.getSnapshot().status, 'failed');
  assert.match(h.alerts[0][1], /Upload failed/);
});

test('pending selfie can finish after selecting Skip, and late completions cannot navigate an unmounted screen', async t => {
  const h = harness(t);
  const { createSelfieUploadTask } = h.load('src/features/verification/api/selfieUpload.ts');
  const { DocumentUploadScreen } = h.load('src/features/verification/components/DocumentUploadScreen.tsx');
  for (const unmount of [false, true]) {
    const request = deferred(); let skipped = 0;
    const task = createSelfieUploadTask(() => request.promise);
    h.render(React.createElement(DocumentUploadScreen, { key: String(unmount), selfieUpload: task, onSkip: () => skipped++ }));
    h.button('Skip').props.onPress();
    if (unmount) h.unmount();
    request.resolve(); await tick();
    assert.equal(skipped, unmount ? 0 : 1);
  }
});

test('submitting documents already on the server still requires a confirmed selfie', async t => {
  const h = harness(t, { '../../../shared/api/httpClient': { fetchWithTimeout: async () => ({ json: async () => ({
    documents: ['national_id_front', 'national_id_back'].map(document_type => ({ document_type, verification_status: 'Pending' })),
  }) }) } });
  const { createSelfieUploadTask } = h.load('src/features/verification/api/selfieUpload.ts');
  const { DocumentUploadScreen } = h.load('src/features/verification/components/DocumentUploadScreen.tsx');
  const request = deferred(); let completed = 0;
  const task = createSelfieUploadTask(() => request.promise);
  h.render(React.createElement(DocumentUploadScreen, { role: 'homeowner', token: 'token', selfieUpload: task, onNext: () => completed++ }));
  await tick();
  const submission = h.button('Submit').props.onPress();
  assert.equal(completed, 0);
  request.reject(new Error('Selfie storage is unavailable'));
  await submission; await tick();
  assert.equal(completed, 0);
  assert.equal(h.alerts.length, 1);
  assert.match(h.alerts[0][1], /Selfie storage/);
});

test('native capture errors show friendly guidance and Retry retakes the photo without repeating liveness', async t => {
  let now = 1000;
  t.mock.method(Date, 'now', () => now);
  let captures = 0;
  const FaceCamera = React.forwardRef((props, ref) => {
    React.useImperativeHandle(ref, () => ({ captureSelfie: async () => {
      captures++;
      if (captures === 1) throw new Error('Not bound to a valid Camera [ImageCapture:androidx.camera.core.ImageCapture-private-id]');
      return 'file:///selfie.jpg';
    } }));
    return React.createElement('FaceCamera', props);
  });
  const h = harness(t, { '../camera/FaceCamera': { FaceCamera } });
  const { LivenessScreen } = h.load('src/features/verification/components/LivenessScreen.tsx');
  let completed = 0;
  h.render(React.createElement(LivenessScreen, { onVerified: () => completed++ }));
  renderer.flushSync(() => h.button('Continue').props.onPress()); renderer.flushPassiveEffects();
  for (const [yawAngle, timestamp] of [[0, 1000], [-15, 1200], [15, 1400], [0, 1600], [0, 4600]]) {
    now = timestamp;
    const frame = { frameWidth: 100, frameHeight: 100, timestamp,
      face: { bounds: { x: 30, y: 30, width: 40, height: 40 }, points: [], signals: { yawAngle }, timestamp } };
    renderer.flushSync(() => h.nodes().find(node => node.type === 'FaceCamera').props.onLandmarks(frame));
    renderer.flushPassiveEffects();
  }
  await tick();
  assert.equal(completed, 0);
  assert.ok(h.button('Retry'));
  const visibleText = h.nodes().map(node => node.text || '').join(' ');
  assert.match(visibleText, /We couldn’t take your selfie/);
  assert.match(visibleText, /Your face check is complete/);
  assert.doesNotMatch(visibleText, /Not bound|androidx|ImageCapture|private-id/);
  renderer.flushSync(() => h.button('Retry').props.onPress()); renderer.flushPassiveEffects();
  await tick();
  assert.equal(captures, 2);
  assert.equal(completed, 1);
});

test('pausing landmark results keeps Android camera outputs attached through photo capture', async t => {
  const frameProcessor = { frameProcessor() {} };
  const detector = { frameProcessor, cameraDeviceChangeHandler() {}, cameraViewLayoutChangeHandler() {}, cameraOrientationChangedHandler() {} };
  const device = { id: 'front', position: 'front' };
  const format = { minFps: 15, maxFps: 30 };
  let trackingError;
  const Camera = React.forwardRef((props, ref) => {
    React.useImperativeHandle(ref, () => ({ takePhoto: async () => ({ path: '/selfie.jpg', width: 1280, height: 960 }) }));
    return React.createElement('VisionCamera', props);
  });
  const h = harness(t, {
    'react-native-vision-camera': { Camera, useCameraDevice: () => device, useCameraFormat: () => format,
      useCameraPermission: () => ({ hasPermission: true }) },
    'react-native-mediapipe': { Delegate: { CPU: 0 }, RunningMode: { LIVE_STREAM: 2 },
      useFaceLandmarkDetection: (_onResults, onError) => { trackingError = onError; return detector; } },
  });
  const { FaceCamera } = h.load('src/features/verification/camera/FaceCamera.tsx');
  const ref = React.createRef();
  const onLandmarks = () => {};
  h.render(React.createElement(FaceCamera, { ref, onLandmarks, detecting: true }));
  assert.equal(h.nodes().find(node => node.type === 'VisionCamera').props.frameProcessor, frameProcessor);
  renderer.flushSync(() => trackingError({ code: 1, message: 'Native failure private-id' }));
  assert.doesNotMatch(h.nodes().map(node => node.text || '').join(' '), /Native failure|private-id/);
  h.render(React.createElement(FaceCamera, { ref, onLandmarks, detecting: false }));
  const nativeCamera = h.nodes().find(node => node.type === 'VisionCamera');
  assert.equal(nativeCamera.props.frameProcessor, frameProcessor);
  assert.equal(nativeCamera.props.photo, true);
  assert.equal(nativeCamera.props.isActive, true);
  assert.equal(await ref.current.captureSelfie(), 'file:///selfie.jpg');
});
