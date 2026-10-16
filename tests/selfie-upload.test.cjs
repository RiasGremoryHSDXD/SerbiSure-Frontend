const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

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

test('camera optimization preserves the left/right sequence and full three-second hold', () => {
  const root = 'src/features/verification/';
  const geometry = load(root + 'face/geometry.ts');
  const indexes = load(root + 'face/landmarkIndexes.ts');
  const rules = load(root + 'liveness/livenessRules.ts', { '../face/landmarkIndexes': indexes, '../face/geometry': geometry });
  const { initialLivenessState, advanceLiveness } = load(root + 'liveness/livenessMachine.ts', { './livenessRules': rules });
  const frame = (yawAngle, timestamp) => ({ frameWidth: 100, frameHeight: 100, timestamp,
    face: { bounds: { x: 30, y: 30, width: 40, height: 40 }, points: [], signals: { yawAngle }, timestamp } });
  let state = advanceLiveness(initialLivenessState, frame(0, 0));
  assert.equal(state.step, 'turnLeft');
  state = advanceLiveness(state, frame(15, 100));
  assert.equal(state.step, 'turnLeft');
  state = advanceLiveness(state, frame(-15, 200));
  assert.equal(state.step, 'turnRight');
  state = advanceLiveness(state, frame(15, 300));
  assert.equal(state.step, 'still');
  state = advanceLiveness(state, frame(0, 400));
  state = advanceLiveness(state, frame(0, 3399));
  assert.equal(state.verified, false);
  state = advanceLiveness(state, frame(0, 3400));
  assert.equal(state.verified, true);
});
