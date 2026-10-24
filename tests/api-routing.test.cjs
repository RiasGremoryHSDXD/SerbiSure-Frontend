const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

function loadConfig(file, apiUrl, dev = false) {
  const source = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const module = { exports: {} };
  const mockedRequire = name => { throw new Error(`Unexpected API config dependency: ${name}`); };
  new Function('exports', 'require', 'process', '__DEV__', output)(
    module.exports, mockedRequire, { env: { EXPO_PUBLIC_API_URL: apiUrl } }, dev);
  return module.exports;
}

test('mobile realtime connects to the same production backend as API requests', () => {
  const source = fs.readFileSync(path.join(__dirname, '../src/shared/realtime/RealtimeClient.ts'), 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const module = { exports: {} };
  const mockedRequire = name => {
    if (name === '../api/httpClient') return { notifyAccountSuspension() {}, requestJson() {} };
    throw new Error(`Unexpected realtime dependency: ${name}`);
  };
  new Function('exports', 'require', output)(module.exports, mockedRequire);
  const api = loadConfig('src/shared/api/config.ts', 'https://retired-backend.example.test');
  let socketUrl;
  const client = new module.exports.RealtimeClient(api.API_BASE_URL, url => {
    socketUrl = url;
    return { send() {}, close() {} };
  });
  try {
    client.start('test-only-token');
    assert.equal(socketUrl, 'wss://serbisure-production-backend.up.railway.app/ws/events/');
  } finally {
    client.stop();
  }
});

for (const file of ['src/config/api.ts', 'src/shared/api/config.ts']) {
  test(`${file}: standalone defaults to the production Railway backend`, () => {
    const api = loadConfig(file);
    assert.equal(api.API_BASE_URL, 'https://serbisure-production-backend.up.railway.app');
    assert.equal(api.buildApiUrl('/api/v1/accounts/login/'),
      'https://serbisure-production-backend.up.railway.app/api/v1/accounts/login/');
  });
  test(`${file}: release ignores stale or local environment overrides`, () => {
    for (const override of ['https://retired-backend.example.test', 'http://192.168.1.14:8000/']) {
      assert.equal(loadConfig(file, override).API_BASE_URL,
        'https://serbisure-production-backend.up.railway.app');
    }
  });
  test(`${file}: an explicit local development override still works`, () => {
    const api = loadConfig(file, 'http://192.168.1.14:8000/', true);
    assert.equal(api.API_BASE_URL, 'http://192.168.1.14:8000');
  });
}
