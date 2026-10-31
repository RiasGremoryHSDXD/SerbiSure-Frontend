const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const cache = new Map();
function load(file) {
  file = path.resolve(__dirname, '..', file);
  if (cache.has(file)) return cache.get(file);
  const module = { exports: {} };
  cache.set(file, module.exports);
  const js = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  new Function('require', 'module', 'exports', js)(name => {
    assert.ok(name.startsWith('.'), name);
    return load(path.resolve(path.dirname(file), name + '.ts'));
  }, module, module.exports);
  return module.exports;
}
const root = 'src/features/verification/';
const { faceLandmarkerResultToLandmarkFrame } = load(root + 'face/mediapipeFaceTracker.ts');
const { getHeadPoseDirection, getPhotoReadiness } = load(root + 'liveness/livenessRules.ts');
const { advanceLiveness, initialLivenessState, prepareSelfieRetake } = load(root + 'liveness/livenessMachine.ts');
const { assessPortraitPixels } = load(root + 'quality/selfieQuality.ts');

function frame(offset, timestamp, rotation = 0, mirrored = false) {
  const points = Array.from({ length: 468 }, () => ({ x: 0.5, y: 0.5, z: 0 }));
  points[234] = { x: 0.3, y: 0.5, z: -0.01 };
  points[454] = { x: 0.7, y: 0.5, z: 0.01 };
  points[1] = { x: 0.5 + offset * 0.4, y: 0.5, z: -0.03 };
  points[10] = { x: 0.5, y: 0.3, z: 0 };
  points[152] = { x: 0.5, y: 0.7, z: 0 };
  const angle = rotation * Math.PI / 180;
  for (const p of points) {
    const x = p.x - 0.5, y = p.y - 0.5;
    p.x = 0.5 + x * Math.cos(angle) - y * Math.sin(angle);
    p.y = 0.5 + x * Math.sin(angle) + y * Math.cos(angle);
  }
  const result = faceLandmarkerResultToLandmarkFrame({ results: [{ faceLandmarks: [points] }] }, 640, 640, mirrored);
  result.timestamp = timestamp;
  result.face.timestamp = timestamp;
  return result;
}

function followPrompts({ interval = 125, rotation = 0, mirrored = false, bias = 0, stopAtStill = false } = {}) {
  let state = initialLivenessState, now = 0;
  for (; now <= 20000; now += interval) {
    const offset = bias + (state.step === 'turnRight' ? -0.03 : state.step === 'turnLeft' ? 0.03 : 0);
    state = advanceLiveness(state, frame(offset, now, rotation, mirrored));
    if (state.verified || (stopAtStill && state.step === 'still')) break;
  }
  return { state, now };
}

test('slight physical turns complete across portrait, rotated sensors and mirrored front cameras', () => {
  for (const rotation of [0, 30, 90, 180, 270]) {
    for (const mirrored of [false, true]) {
      const { state } = followPrompts({ rotation, mirrored });
      assert.equal(state.verified, true, `rotation=${rotation}, mirrored=${mirrored}`);
      assert.deepEqual(state.completedSteps, ['face', 'turnRight', 'turnLeft', 'still']);
      assert.equal(getHeadPoseDirection(frame(0.03, 0, rotation, mirrored).face), 'left');
    }
  }
});

test('natural facial asymmetry is calibrated instead of demanding an absolute perfect forward pose', () => {
  assert.equal(followPrompts({ bias: 0.06, rotation: 30, mirrored: true }).state.verified, true);
});

test('non-square sensor pixels are not distorted by a differently shaped camera view', () => {
  for (const rotation of [0, 30, 90, 180]) {
    const angle = rotation * Math.PI / 180;
    const raw = Array.from({ length: 468 }, () => ({ x: 800, y: 450, z: 0 }));
    raw[234].x = 600; raw[454].x = 1000; raw[1].x = 812;
    for (const p of raw) {
      const x = p.x - 800, y = p.y - 450;
      p.x = (800 + x * Math.cos(angle) - y * Math.sin(angle)) / 1600;
      p.y = (450 + x * Math.sin(angle) + y * Math.cos(angle)) / 900;
    }
    const converted = faceLandmarkerResultToLandmarkFrame({ results: [{ faceLandmarks: [raw] }], inputImageWidth: 1600, inputImageHeight: 900 }, 300, 500, true);
    assert.equal(getHeadPoseDirection(converted.face), 'left', String(rotation));
  }
});

test('slower phones complete at 250, 500 and 600 ms callback intervals without prompt resets', () => {
  for (const interval of [250, 500, 600]) assert.equal(followPrompts({ interval }).state.verified, true, String(interval));
});

test('neutral jitter and only one turn cannot complete both challenges', () => {
  for (const kind of ['jitter', 'onlyRight']) {
    let state = initialLivenessState;
    for (let now = 0; now <= 6000; now += 125) {
      const offset = now < 375 ? 0 : kind === 'jitter' ? (now % 250 === 0 ? 0.01 : -0.01) : -0.03;
      state = advanceLiveness(state, frame(offset, now));
    }
    assert.equal(state.verified, false);
    assert.equal(state.completedSteps.includes('turnLeft'), false);
  }
});

test('a brief lost face preserves a turn but never adds progress for the missing interval', () => {
  let state = [0, 100, 200].reduce((s, now) => advanceLiveness(s, frame(0, now)), initialLivenessState);
  state = advanceLiveness(state, frame(-0.03, 300));
  state = advanceLiveness(state, frame(-0.03, 400));
  const progress = state.actionProgressMs;
  state = advanceLiveness(state, { ...frame(0, 500), face: null });
  assert.equal(state.actionProgressMs, progress);
  state = advanceLiveness(state, frame(-0.03, 600));
  assert.equal(state.actionProgressMs, progress);
  for (const now of [700, 800, 900]) state = advanceLiveness(state, frame(-0.03, now));
  assert.equal(state.step, 'turnLeft');
});

test('single frames, stale frames and a long tracking outage cannot supply a turn hold', () => {
  let state = [0, 100, 200].reduce((s, now) => advanceLiveness(s, frame(0, now)), initialLivenessState);
  state = advanceLiveness(state, frame(-0.03, 300));
  const before = state;
  assert.equal(advanceLiveness(state, frame(-0.03, 250)), before);
  state = advanceLiveness(state, frame(-0.03, 2000));
  assert.equal(state.actionFrames, 1);
  assert.equal(state.actionProgressMs, 0);
  assert.equal(state.step, 'turnRight');
});

test('an opposite turn clears partial evidence, while an invalid mesh cannot fall back to fabricated yaw', () => {
  let state = [0, 100, 200].reduce((s, now) => advanceLiveness(s, frame(0, now)), initialLivenessState);
  for (const now of [300, 400, 500]) state = advanceLiveness(state, frame(-0.03, now));
  state = advanceLiveness(state, frame(0.03, 600));
  assert.equal(state.actionFrames, 0);
  const invalid = frame(-0.03, 700);
  delete invalid.face.points[234];
  invalid.face.signals.yawAngle = 30;
  assert.equal(getHeadPoseDirection(invalid.face), 'unknown');
});

test('clearly turned real mesh faces cannot complete the photo hold, including photo retakes', () => {
  const result = followPrompts({ stopAtStill: true });
  let state = result.state;
  for (let now = result.now + 125; now < result.now + 3000; now += 125) state = advanceLiveness(state, frame(-0.16, now));
  assert.equal(state.verified, false);
  const verified = followPrompts().state;
  const retake = prepareSelfieRetake(verified);
  assert.equal(retake.step, 'still');
  assert.equal(retake.verified, false);
  assert.equal(retake.stillnessProgress, 0);
  assert.deepEqual(retake.completedSteps, ['face', 'turnRight', 'turnLeft']);
});

test('the final photo permits an eye-level close-up and relaxed pose without changing turn sensitivity', () => {
  const { state } = followPrompts({ stopAtStill: true });
  const closeUp = frame(0.04, 10000);
  closeUp.face.bounds = { x: 32, y: 26, width: 576, height: 589 };
  // The same offset remains a left turn; the photo has its own wider tolerance.
  assert.equal(getHeadPoseDirection(closeUp.face, state.neutralPose), 'left');
  assert.equal(getPhotoReadiness(closeUp, state.neutralPose).ready, true);
  const slightlyOffCenter = frame(0, 10000);
  slightlyOffCenter.face.bounds = { x: 320, y: 192, width: 256, height: 256 };
  assert.equal(getPhotoReadiness(slightlyOffCenter, state.neutralPose).ready, true);
});

test('first-photo and retake checks accept the same natural pose with the same fresh hold', () => {
  const first = followPrompts({ stopAtStill: true }).state;
  const retake = prepareSelfieRetake(followPrompts().state);
  const finish = (initial, start, interval) => {
    let state = initial;
    for (let delta = 0; delta <= 5000; delta += interval) {
      const next = frame(0.04, start + delta);
      next.face.bounds = { x: 32, y: 26, width: 576, height: 589 };
      state = advanceLiveness(state, next);
      if (state.verified) return delta;
    }
    return null;
  };
  for (const [interval, expected] of [[125, 1000], [250, 1000], [500, 1000], [600, 1200], [900, 1800]]) {
    assert.equal(finish(first, 10000, interval), expected, `first photo at ${interval} ms`);
    assert.equal(finish(retake, 20000, interval), expected, `retake at ${interval} ms`);
  }
});

test('a slow photo callback cannot complete the final hold with only two observations', () => {
  let state = prepareSelfieRetake(followPrompts().state);
  state = advanceLiveness(state, frame(0.04, 10000));
  assert.equal(state.stillnessProgress, 0);
  state = advanceLiveness(state, frame(0.04, 10900));
  assert.equal(state.verified, false);
  assert.equal(state.stillnessProgress, 0.5);
  state = advanceLiveness(state, frame(0.04, 11800));
  assert.equal(state.verified, true);
});

test('final-photo guidance distinguishes a missing face, a cropped close-up and a clear side turn', () => {
  const neutral = followPrompts({ stopAtStill: true }).state.neutralPose;
  const missing = { ...frame(0, 10000), face: null };
  assert.match(getPhotoReadiness(missing, neutral).instruction, /see your face/);
  const cropped = frame(0, 10000);
  cropped.face.bounds = { x: -64, y: 10, width: 640, height: 590 };
  assert.match(getPhotoReadiness(cropped, neutral).instruction, /farther away/);
  const turned = getPhotoReadiness(frame(0.16, 10000), neutral);
  assert.equal(turned.ready, false);
  assert.match(turned.instruction, /Look straight/);
  const invalid = frame(0, 10000);
  delete invalid.face.points[234];
  assert.equal(getPhotoReadiness(invalid, neutral).ready, false);
});

function pixels(valueAt, size = 160) {
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const i = (y * size + x) * 4;
    const value = valueAt(x, y);
    data[i] = value; data[i + 1] = value; data[i + 2] = value; data[i + 3] = 255;
  }
  return data;
}

test('photo gate blocks almost black and near-featureless severely blurred samples', () => {
  assert.equal(assessPortraitPixels(pixels(() => 4), 160, 160), 'too-dark');
  assert.equal(assessPortraitPixels(pixels(() => 120), 160, 160), 'too-blurry');
  assert.equal(assessPortraitPixels(pixels((x) => 80 + x * 0.05), 160, 160), 'too-blurry');
  assert.equal(assessPortraitPixels(new Uint8Array(4), 160, 160), 'unreadable');
});

test('photo gate permits dim, lower contrast, moderately soft samples instead of demanding studio sharpness', () => {
  for (const base of [40, 70, 120]) {
    // Correlated, low-contrast detail in a dim portrait-like sample.
    const data = pixels((x, y) => base + 9 * Math.sin(x / 2) + 7 * Math.cos(y / 2));
    assert.equal(assessPortraitPixels(data, 160, 160), 'pass', String(base));
  }
});

test('new face-check instructions and photo guidance have Tagalog and Bisaya translations', () => {
  const { translateMessage } = load('src/shared/localization/messages.ts');
  const instructions = [
    'Look at the camera for a moment',
    'Slowly turn your head a little to your right',
    'Great! Now turn a little to your left',
    'Well done! Look at the camera for your photo',
    'Getting the camera ready… Hold your phone at eye level.',
    'The camera may need a moment. Keep your face in the circle.',
    'Hold your phone at eye level and look at the camera. Follow two small head turns. Normal room lighting is fine.',
    'Look at the camera so we can see your face.',
    'Move your phone a little farther away so your face fits.',
    'Gently bring your face into the circle.',
    'Look straight at the camera. A relaxed position is fine.',
    'Bring your face back into the circle when you are ready',
    'Take your time. Face the camera in a little more light.',
    'Checking your photo…',
    'Your photo is very dark. Face a light or window and take another photo.',
    'Your photo is very blurry. Wipe the camera and take another photo.',
    'We could not check this photo. Please take another one.',
  ];
  for (const language of ['Tagalog', 'Bisaya']) for (const message of instructions) {
    assert.notEqual(translateMessage(language, message), message, `${language}: ${message}`);
  }
});
