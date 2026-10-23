const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

function loadConfig(file, apiUrl) {
  const source = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const module = { exports: {} };
  const mockedRequire = name => name === 'react-native'
    ? { Platform: { OS: 'android' } }
    : { __esModule: true, default: {}, ExecutionEnvironment: {} };
  new Function('exports', 'require', 'process', '__DEV__', output)(
    module.exports, mockedRequire, { env: { EXPO_PUBLIC_API_URL: apiUrl } }, false);
  return module.exports;
}

for (const file of ['src/config/api.ts', 'src/shared/api/config.ts']) {
  test(`${file}: standalone defaults to the isolated Railway backend`, () => {
    const api = loadConfig(file);
    assert.equal(api.API_BASE_URL, 'https://serbisure-backend-staging-production.up.railway.app');
    assert.equal(api.buildApiUrl('/api/v1/accounts/login/'),
      'https://serbisure-backend-staging-production.up.railway.app/api/v1/accounts/login/');
  });
  test(`${file}: an explicit local development override still works`, () => {
    const api = loadConfig(file, 'http://192.168.1.14:8000/');
    assert.equal(api.API_BASE_URL, 'http://192.168.1.14:8000');
  });
}
