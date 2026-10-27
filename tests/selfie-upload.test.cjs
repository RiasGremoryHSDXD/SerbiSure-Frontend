const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const { faceFrame, successfulFrames } = require('./fixtures/liveness.cjs');

function load(relative, mocks = {}) {
  const source = ts.transpileModule(fs.readFileSync(path.resolve(__dirname, '..', relative), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', source)(name => {
    if (name in mocks) return mocks[name];
    throw new Error('Unexpected dependency: ' + name);
  }, module, module.exports);
  return module.exports;
}
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};
const { createSelfieUploadTask } = load('src/features/verification/api/selfieUpload.ts', {
  '../../../shared/api/httpClient': {},
});

test('registration owns one pending upload through navigation and waits for its confirmation', async () => {
  const request = deferred(); let calls = 0;
  const task = createSelfieUploadTask(() => { calls++; return request.promise; });
  let completed = false;
  const finishing = task.ensureSaved().then(() => { completed = true; });
  const duplicate = task.ensureSaved();
  await Promise.resolve();
  assert.equal(task.getSnapshot().status, 'uploading');
  assert.equal(completed, false);
  assert.equal(calls, 1);
  request.resolve();
  await Promise.all([finishing, duplicate]);
  assert.equal(task.getSnapshot().status, 'saved');
  assert.equal(completed, true);
  await task.ensureSaved();
  assert.equal(calls, 1);
});

test('failed background save is retained, explicit retry uses the same upload, and listeners can leave', async () => {
  const request = deferred(); let calls = 0; let notifications = 0;
  const task = createSelfieUploadTask(() => { calls++; return calls === 1 ? request.promise : Promise.resolve(); });
  const unsubscribe = task.subscribe(() => notifications++);
  const finishing = task.ensureSaved();
  request.reject(new Error('Too many attempts. Please try again later.'));
  await assert.rejects(finishing, /Too many attempts/);
  assert.deepEqual(task.getSnapshot(), { status: 'failed', error: 'Too many attempts. Please try again later.' });
  assert.equal(calls, 1);
  await task.ensureSaved();
  assert.equal(task.getSnapshot().status, 'saved');
  assert.equal(calls, 2);
  assert.ok(notifications >= 3);
  unsubscribe();
  const count = notifications;
  await task.ensureSaved();
  assert.equal(notifications, count);
});

test('independent registration sessions never share upload state or errors', async () => {
  const first = deferred(), second = deferred();
  const oldTask = createSelfieUploadTask(() => first.promise);
  const newTask = createSelfieUploadTask(() => second.promise);
  const oldWait = oldTask.ensureSaved();
  const newWait = newTask.ensureSaved();
  first.reject(new Error('Old account upload failed'));
  await assert.rejects(oldWait, /Old account/);
  assert.equal(newTask.getSnapshot().status, 'uploading');
  second.resolve(); await newWait;
  assert.equal(newTask.getSnapshot().status, 'saved');
});

test('selfie request keeps native multipart boundaries and rejects HTTP failures and unconfirmed saves', async () => {
  const originalFormData = global.FormData;
  global.FormData = class { fields = []; append(...args) { this.fields.push(args); } };
  try {
    for (const [status, data, message] of [
      [429, { detail: 'Too many attempts.' }, /Too many attempts/],
      [400, { profile_image: ['Image file must be under 10MB'] }, /10MB/],
      [500, {}, /Could not save/],
      [200, {}, /did not confirm/],
      [200, { profile_link: 'https://test.local/signed-selfie.jpg' }, null],
    ]) {
      let calls = 0;
      const { uploadSelfie } = load('src/features/verification/api/selfieUpload.ts', {
        '../../../shared/api/httpClient': { requestResponse: async (url, options, timeout) => {
          calls++;
          assert.equal(url, '/api/v1/accounts/profile-image/');
          assert.equal(options.method, 'PUT');
          assert.equal(options.token, 'private-token');
          assert.equal(options.headers, undefined);
          assert.equal(timeout, 60000);
          assert.deepEqual(options.body.fields, [['profile_image', { uri: 'file:///selfie.jpg', name: 'verification-selfie.jpg', type: 'image/jpeg' }]]);
          return new Response(JSON.stringify(data), { status });
        } },
      });
      if (message) await assert.rejects(uploadSelfie('private-token', '/selfie.jpg'), message);
      else await uploadSelfie('private-token', '/selfie.jpg');
      assert.equal(calls, 1);
    }
  } finally { global.FormData = originalFormData; }
});

const root = 'src/features/verification/';
const geometry = load(root + 'face/geometry.ts');
const indexes = load(root + 'face/landmarkIndexes.ts');
const rules = load(root + 'liveness/livenessRules.ts', { '../face/landmarkIndexes': indexes, '../face/geometry': geometry });
const { initialLivenessState, advanceLiveness, retryCurrentStep } = load(root + 'liveness/livenessMachine.ts', { './livenessRules': rules });
const runFrames = frames => frames.reduce(advanceLiveness, initialLivenessState);

test('liveness requires both sustained turns and one observed second facing center in order', () => {
  let state = initialLivenessState;
  const transitions = [];
  for (const frame of successfulFrames()) {
    const next = advanceLiveness(state, frame);
    if (next.step !== state.step) transitions.push([next.step, frame.timestamp]);
    state = next;
    if (frame.timestamp < 3100) assert.equal(state.verified, false);
  }
  assert.deepEqual(transitions, [['turnRight', 0], ['turnLeft', 1000], ['still', 2000], ['verified', 3100]]);
  assert.deepEqual(state.completedSteps, ['face', 'turnRight', 'turnLeft', 'still']);
  assert.equal(state.verified, true);
});

test('liveness succeeds without blink or eye tracking data but still requires both turns', () => {
  const missingEyes = successfulFrames().map(frame => ({ ...frame, face: { ...frame.face, signals: { yawAngle: frame.face.signals.yawAngle } } }));
  assert.equal(runFrames(missingEyes).verified, true);
  const closed = successfulFrames().map(frame => faceFrame(frame.face.signals.yawAngle, frame.timestamp, 'closed'));
  assert.equal(runFrames(closed).verified, true);
  const noTurns = successfulFrames().map(frame => faceFrame(0, frame.timestamp));
  assert.equal(runFrames(noTurns).step, 'turnRight');
  const onlyLeft = successfulFrames().map(frame => faceFrame(-15, frame.timestamp));
  assert.equal(runFrames(onlyLeft).step, 'turnRight');
});

test('single-frame turns and interrupted tracking cannot complete an action', () => {
  let state = advanceLiveness(initialLivenessState, faceFrame(0, 800));
  for (let time = 900; time <= 2500; time += 100) {
    state = advanceLiveness(state, faceFrame(time === 1500 ? 15 : 0, time));
  }
  assert.equal(state.step, 'turnRight');
  state = advanceLiveness(state, faceFrame(15, 2600));
  const old = state;
  assert.equal(advanceLiveness(state, faceFrame(15, 2500)), old);
  state = advanceLiveness(state, faceFrame(15, 5000));
  assert.equal(state.step, 'turnRight');
  assert.equal(state.actionSince, null);
  assert.equal(retryCurrentStep(state).actionSince, null);
});

test('natural handheld movement and focus changes do not reset the final hold', () => {
  let state = initialLivenessState;
  let previousProgress = 0;
  for (const frame of successfulFrames()) {
    if (frame.timestamp >= 2100) {
      frame.face.bounds.x += frame.timestamp % 200 === 0 ? 2 : -2;
      frame.face.bounds.y += frame.timestamp % 200 === 0 ? -1 : 1;
      frame.face.bounds.width += frame.timestamp % 200 === 0 ? 2 : 0;
    }
    state = advanceLiveness(state, frame);
    assert.ok(state.stillnessProgress >= previousProgress);
    previousProgress = state.stillnessProgress;
  }
  assert.equal(state.verified, true);
});

test('a brief wobble, lost face, or head turn pauses progress and resumes without counting the interruption', () => {
  const ready = runFrames(successfulFrames().filter(frame => frame.timestamp <= 2500));
  assert.equal(ready.step, 'still');
  assert.ok(ready.stillnessProgress > 0);
  const moved = faceFrame(0, 2600);
  moved.face.bounds.x += 8;
  const missing = { ...faceFrame(0, 2600), face: null };
  const offCenter = faceFrame(0, 2600);
  offCenter.face.bounds.x = 60;
  for (const frame of [faceFrame(15, 2600), moved, missing, offCenter]) {
    let state = advanceLiveness(ready, frame);
    assert.equal(state.verified, false);
    assert.equal(state.stillnessProgress, ready.stillnessProgress);
    state = advanceLiveness(state, faceFrame(0, 2700));
    assert.equal(state.stillnessProgress, ready.stillnessProgress);
    for (let time = 2800; time <= 3200; time += 100) {
      state = advanceLiveness(state, faceFrame(0, time));
      assert.equal(state.verified, false);
    }
    state = advanceLiveness(state, faceFrame(0, 3300));
    assert.equal(state.verified, true);
  }
});

test('long tracking interruptions restart only the final hold and never count the missing time', () => {
  const ready = runFrames(successfulFrames().filter(frame => frame.timestamp <= 2500));
  for (const kind of ['missing', 'turned', 'moved']) {
    let state = ready;
    for (let time = 2600; time <= 3200; time += 100) {
      const frame = faceFrame(kind === 'turned' ? 15 : 0, time);
      if (kind === 'missing') frame.face = null;
      if (kind === 'moved') frame.face.bounds.x += 8;
      state = advanceLiveness(state, frame);
      assert.equal(state.verified, false);
    }
    assert.equal(state.stillnessProgress, 0);
    assert.deepEqual(state.completedSteps, ready.completedSteps);
    state = advanceLiveness(state, faceFrame(0, 3300));
    assert.equal(state.stillnessProgress, 0);
  }
  const delayed = advanceLiveness(ready, faceFrame(0, 5000));
  assert.equal(delayed.verified, false);
  assert.equal(delayed.stillnessProgress, 0);
  assert.deepEqual(delayed.completedSteps, ready.completedSteps);
});

test('mirrored MediaPipe coordinates preserve turn direction', () => {
  const face = faceFrame(0, 0).face;
  face.signals = {};
  const { FACE_LANDMARKS: idx } = indexes;
  face.points[idx.leftCheek] = { x: 30, y: 50 };
  face.points[idx.rightCheek] = { x: 70, y: 50 };
  for (const [nose, expected] of [[55, 'right'], [45, 'left'], [50, 'center']]) {
    face.points[idx.noseTip] = { x: nose, y: 50 };
    face.signals.mirrored = false;
    assert.equal(rules.getHeadPoseDirection(face), expected);
    const mirrored = { ...face, points: face.points.map(point => point && ({ ...point, x: 100 - point.x })), signals: { mirrored: true } };
    assert.equal(rules.getHeadPoseDirection(mirrored), expected);
  }
});
