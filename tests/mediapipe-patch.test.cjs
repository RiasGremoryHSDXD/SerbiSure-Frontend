const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { patchMediaPipe } = require('../scripts/patch-mediapipe.js');

function fixture(t, version = '0.6.0') {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'serbisure-mediapipe-'));
  t.after(() => {
    assert.equal(path.dirname(path.resolve(root)), path.resolve(os.tmpdir()));
    assert.ok(path.basename(root).startsWith('serbisure-mediapipe-'));
    fs.rmSync(root, { recursive: true, force: true });
  });
  const pkg = path.join(root, 'node_modules/react-native-mediapipe');
  const java = path.join(pkg, 'android/src/main/java/com/reactnativemediapipe');
  const files = {
    'package.json': JSON.stringify({ version }),
    'android/src/main/java/com/reactnativemediapipe/shared/ConvertHelpers.kt': 'Orientation.LANDSCAPE_RIGHT -> -90\n',
    'android/src/main/java/com/reactnativemediapipe/facelandmarkdetection/FaceLandmarkDetectionFrameProcessorPlugin.kt': 'MediaImageBuilder(image).build()',
    'android/src/main/java/com/reactnativemediapipe/facelandmarkdetection/FaceLandmarkDetectorHelper.kt': '.setOutputFaceBlendshapes(true)\n          .setOutputFacialTransformationMatrixes(true)\n          .build()',
    'ios/facelandmarkdetection/FaceLandmarkDetectorHelper.swift': 'faceLandmarkerOptions.baseOptions.delegate = self.optionsDelegate',
  };
  for (const [name, value] of Object.entries(files)) {
    const file = path.join(pkg, name);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, value);
  }
  return { root, pkg, java };
}

test('a fresh dependency install and an already-patched install produce the same native compatibility files', t => {
  const { root, java, pkg } = fixture(t);
  patchMediaPipe(root);
  const plugin = path.join(java, 'facelandmarkdetection/FaceLandmarkDetectionFrameProcessorPlugin.kt');
  const helper = path.join(java, 'facelandmarkdetection/FaceLandmarkDetectorHelper.kt');
  const swift = path.join(pkg, 'ios/facelandmarkdetection/FaceLandmarkDetectorHelper.swift');
  const paths = [plugin, helper, swift, path.join(java, 'shared/ConvertHelpers.kt')];
  const before = paths.map(file => ({ data: fs.readFileSync(file, 'utf8'), modified: fs.statSync(file).mtimeMs }));
  assert.match(before[0].data, /BitmapImageBuilder\(rotated\)/);
  assert.doesNotMatch(before[0].data, /MediaImageBuilder/);
  assert.doesNotMatch(before[1].data, /setOutputFacialTransformationMatrixes/);
  assert.match(before[2].data, /outputFacialTransformationMatrixes = true/);
  patchMediaPipe(root);
  paths.forEach((file, index) => {
    assert.equal(fs.readFileSync(file, 'utf8'), before[index].data);
    assert.equal(fs.statSync(file).mtimeMs, before[index].modified, 'unchanged patches must not trigger native rebuilds');
  });
});

test('an unsupported native dependency version fails before overwriting its sources', t => {
  const { root, java } = fixture(t, '0.7.0');
  const plugin = path.join(java, 'facelandmarkdetection/FaceLandmarkDetectionFrameProcessorPlugin.kt');
  const original = fs.readFileSync(plugin, 'utf8');
  assert.throws(() => patchMediaPipe(root), /requires 0\.6\.0; found 0\.7\.0/);
  assert.equal(fs.readFileSync(plugin, 'utf8'), original);
});

test('local Android builds and Expo updates agree on the new native runtime', () => {
  const project = path.join(__dirname, '..');
  const config = JSON.parse(fs.readFileSync(path.join(project, 'app.json'), 'utf8'));
  const strings = fs.readFileSync(path.join(project, 'android/app/src/main/res/values/strings.xml'), 'utf8');
  const runtime = strings.match(/name="expo_runtime_version">([^<]+)</)?.[1];
  assert.equal(runtime, config.expo.android.runtimeVersion);
  assert.notEqual(runtime, '1.0.0', 'older production updates must not override the restored native pipeline');
});
