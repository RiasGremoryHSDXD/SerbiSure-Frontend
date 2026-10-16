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
  for (const type of ['View', 'Text', 'Pressable', 'Image', 'ActivityIndicator']) native[type] = type;
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
      if (name.startsWith('.')) return load(path.resolve(path.dirname(filename), name + '.ts'));
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
