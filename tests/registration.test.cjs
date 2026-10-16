const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

function load(relative, mocks = {}) {
  const source = ts.transpileModule(fs.readFileSync(path.resolve(__dirname, '..', relative), 'utf8'), {
    fileName: relative,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', source)(name => {
    if (name in mocks) return mocks[name];
    if (name === 'react' || name === 'react/jsx-runtime') return require(name);
    throw new Error('Unexpected dependency: ' + name);
  }, module, module.exports);
  return module.exports;
}

const { readRegistrationResponse } = load('src/features/auth/api/registration.ts');
const { parseRegistrationErrors } = load('src/features/auth/components/RegistrationErrorModal.tsx', {
  '../../../shared/localization/LanguageContext': {},
  'react-native': { StyleSheet: { create: value => value }, Platform: { OS: 'android', select: value => value.android || value.default } },
  '@expo/vector-icons': {},
  '../../../shared/theme/theme': load('src/shared/theme/theme.ts', { 'react-native': { Platform: { OS: 'android' } } }),
});
const response = (data, status, headers = {}) => new Response(JSON.stringify(data), { status, headers });

test('email, phone, and required-field failures preserve actionable details without claiming success', async () => {
  for (const field of ['email', 'contact_number', 'first_name']) {
    const data = { [field]: [field === 'first_name' ? 'This field is required.' : 'Enter a valid value.'] };
    const result = await readRegistrationResponse(response(data, 400));
    assert.equal(result.ok, false);
    assert.deepEqual(result.error, data);
    const parsed = parseRegistrationErrors(result.error);
    assert.equal(parsed.hasAccountConflict, false);
    assert.equal(parsed.isRateLimited, false);
    assert.match(parsed.subtitle, /account has not been created/);
    assert.equal(parsed.items[0].fieldKey, field);
    assert.equal(parsed.suggestedStep, 1);
  }
});

test('rate limit uses Retry-After, states this attempt created no account, and is not an account conflict', async () => {
  for (const [seconds, display] of [[300, '5 minutes'], [60, '1 minute']]) {
    const result = await readRegistrationResponse(response({ detail: 'Too many attempts.' }, 429, { 'Retry-After': String(seconds) }));
    assert.equal(result.ok, false);
    const parsed = parseRegistrationErrors(result.error);
    assert.equal(parsed.isRateLimited, true);
    assert.equal(parsed.hasAccountConflict, false);
    assert.match(parsed.subtitle, /did not create an account/);
    assert.ok(parsed.items[0].message.includes(display));
    assert.equal(parsed.suggestedStep, 3);
  }
});

test('429 without JSON or Retry-After still displays a five-minute limit', async () => {
  const result = await readRegistrationResponse(new Response('Too many requests', { status: 429 }));
  const parsed = parseRegistrationErrors(result.error);
  assert.equal(result.ok, false);
  assert.equal(parsed.isRateLimited, true);
  assert.match(parsed.items[0].message, /5 minutes/);
});

test('duplicate email or phone says no new account was created and permits sign-in guidance', () => {
  for (const field of ['email', 'contact_number']) {
    const parsed = parseRegistrationErrors({ [field]: ['Already registered.'] });
    assert.equal(parsed.hasAccountConflict, true);
    assert.match(parsed.title, /Already in Use/);
    assert.match(parsed.subtitle, /No new account was created/);
  }
});

test('location errors guide users to the location step', () => {
  const parsed = parseRegistrationErrors({ street: ['This field is required.'] });
  assert.equal(parsed.suggestedStep, 3);
  assert.match(parsed.items[0].message, /Street Address/);
});

test('only 201 with both JWT tokens confirms creation', async () => {
  const tokens = { access: 'access-token', refresh: 'refresh-token' };
  assert.deepEqual(await readRegistrationResponse(response(tokens, 201)), { ok: true, ...tokens });
  for (const [status, data] of [[200, tokens], [201, {}], [201, { access: 'access-token' }],
    [201, { access: '', refresh: '' }], [400, tokens], [500, tokens]]) {
    const result = await readRegistrationResponse(response(data, status));
    assert.equal(result.ok, false);
    if (status >= 500 || status < 400) {
      const parsed = parseRegistrationErrors(result.error);
      assert.equal(parsed.title, 'Registration Not Confirmed');
      assert.match(parsed.subtitle, /could not confirm whether/);
    }
  }
});
