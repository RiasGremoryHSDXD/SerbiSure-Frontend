const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

function load(relative, mocks) {
  const file = path.resolve(__dirname, '..', relative);
  const js = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', js)(name => {
    if (!(name in mocks)) throw new Error(name);
    return mocks[name];
  }, module, module.exports);
  return module.exports;
}
const quality = load('src/features/verification/quality/selfieQuality.ts', {});

function harness({ unreadable = false, readFailure = false, throwDuringRead = false } = {}) {
  const disposed = [];
  const owned = name => ({ dispose: () => disposed.push(name) });
  const sample = new Uint8Array(160 * 160 * 4);
  // An obviously dark image must be blocked even through the native adapter.
  const snapshot = { ...owned('snapshot'), readPixels: () => {
    if (throwDuringRead) throw new Error('native read failed');
    return readFailure ? null : sample;
  } };
  let sourceUri;
  const image = { ...owned('image'), width: () => 1280, height: () => 960 };
  const surface = { ...owned('surface'), getCanvas: () => ({ drawImageRect() {} }), flush() {}, makeImageSnapshot: () => snapshot };
  const { assessSelfie } = load('src/features/verification/quality/assessSelfie.ts', {
    '@shopify/react-native-skia': {
      AlphaType: { Opaque: 1 }, ColorType: { RGBA_8888: 4 },
      Skia: { Data: { fromURI: async uri => { sourceUri = uri; return owned('data'); } },
        Image: { MakeImageFromEncoded: () => unreadable ? null : image },
        Surface: { Make: () => surface }, Paint: () => owned('paint') },
    },
    './selfieQuality': quality,
  });
  return { assessSelfie, disposed, uri: () => sourceUri };
}

test('actual photo adapter blocks an obvious dark sample and releases all owned native image resources', async () => {
  const h = harness();
  assert.equal(await h.assessSelfie('file:///selfie.jpg'), 'too-dark');
  assert.equal(h.uri(), 'file:///selfie.jpg');
  assert.deepEqual(h.disposed.sort(), ['data', 'image', 'paint', 'snapshot', 'surface']);
});

test('decoder and pixel extraction failures cannot be mistaken for an acceptable photo', async () => {
  const decoder = harness({ unreadable: true });
  assert.equal(await decoder.assessSelfie('file:///invalid.jpg'), 'unreadable');
  assert.deepEqual(decoder.disposed, ['data']);
  const read = harness({ readFailure: true });
  assert.equal(await read.assessSelfie('file:///invalid.jpg'), 'unreadable');
  assert.equal(read.disposed.length, 5);
});

test('native errors still release temporary image resources on memory-constrained phones', async () => {
  const h = harness({ throwDuringRead: true });
  await assert.rejects(h.assessSelfie('file:///selfie.jpg'), /native read failed/);
  assert.equal(h.disposed.length, 5);
});
