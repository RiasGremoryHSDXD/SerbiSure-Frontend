const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

function load(relative, mocks) {
  const compiled = ts.transpileModule(fs.readFileSync(path.resolve(__dirname, '..', relative), 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS },
  }).outputText;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', compiled)(name => {
    if (name in mocks) return mocks[name];
    throw new Error('Unexpected dependency: ' + name);
  }, module, module.exports);
  return module.exports;
}
function session(storage = new Map(), base = 'https://test.local') {
  const config = { API_BASE_URL: base, DEFAULT_TIMEOUT_MS: 5000, buildApiUrl: url => base + url };
  const secure = {
    async getItemAsync(key) { return storage.get(key) ?? null; },
    async setItemAsync(key, value) { storage.set(key, value); },
    async deleteItemAsync(key) { storage.delete(key); },
  };
  const manager = load('src/shared/auth/session.ts', {
    'expo-secure-store': secure, '../api/config': config,
  });
  return { manager, storage, secure, config };
}
const tokens = { access: 'access-1', refresh: 'refresh-1' };
const refreshed = { access: 'access-2', refresh: 'refresh-2' };
const reply = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } });
async function withFetch(fake, action) {
  const original = global.fetch;
  global.fetch = fake;
  try { await action(); } finally { global.fetch = original; }
}
function deferred() {
  let resolve;
  const promise = new Promise(yes => { resolve = yes; });
  return { promise, resolve };
}

test('login automatically survives an app restart, validates with backend, and saves the rotated refresh token', async () => {
  const first = session();
  await first.manager.startSession(tokens);
  assert.deepEqual([...first.storage.values()], ['refresh-1']);
  const reopened = session(first.storage);
  let calls = 0;
  await withFetch(async (url, options) => {
    calls++;
    assert.equal(url, 'https://test.local/api/v1/accounts/token/refresh/');
    assert.deepEqual(JSON.parse(options.body), { refresh: 'refresh-1' });
    return reply(refreshed);
  }, async () => assert.deepEqual(await reopened.manager.restoreSession(), refreshed));
  assert.equal(calls, 1);
  assert.deepEqual([...first.storage.values()], ['refresh-2']);
});

test('signing in as a different account replaces the saved login', async () => {
  const state = session();
  await state.manager.startSession(tokens);
  await state.manager.startSession({ access: 'access-other', refresh: 'refresh-other' });
  assert.deepEqual([...state.storage.values()], ['refresh-other']);
  assert.equal(state.manager.getSession().access, 'access-other');
  await withFetch(async (_url, options) => {
    assert.deepEqual(JSON.parse(options.body), { refresh: 'refresh-other' });
    return reply({ access: 'access-other-new', refresh: 'refresh-other-new' });
  }, async () => {
    assert.equal((await session(state.storage).manager.restoreSession()).access, 'access-other-new');
  });
});

test('logout clears both the active session and the persisted token', async () => {
  const state = session();
  await state.manager.startSession(tokens);
  await state.manager.forgetSession();
  assert.equal(state.manager.getSession(), null);
  assert.equal(state.storage.size, 0);
  assert.equal(await session(state.storage).manager.restoreSession(), null);
});

test('expired, malformed, and suspended saved sessions are cleared with concise messages', async () => {
  for (const [status, data, message] of [[401, {}, /session has expired/], [400, {}, /session has expired/],
    [403, { detail: { code: 'account_suspended' } }, /account is suspended/]]) {
    const state = session();
    await state.manager.startSession(tokens);
    const reopened = session(state.storage);
    await withFetch(async () => reply(data, status), async () => {
      await assert.rejects(reopened.manager.restoreSession(), error => error.kind === 'ended' && message.test(error.message));
    });
    assert.equal(state.storage.size, 0);
    assert.equal(reopened.manager.getSession(), null);
  }
});

test('offline and server failures keep the saved token for an explicit retry', async () => {
  for (const fake of [async () => { throw new TypeError('Network request failed'); }, async () => reply({}, 503),
    async () => new Response('Bad Gateway', { status: 502 }), async () => reply({})]) {
    const state = session();
    await state.manager.startSession(tokens);
    const reopened = session(state.storage);
    await withFetch(fake, async () => {
      await assert.rejects(reopened.manager.restoreSession(), error => error.kind === 'connection' && !/https?:/.test(error.message));
    });
    assert.deepEqual([...state.storage.values()], ['refresh-1']);
    await withFetch(async () => reply(refreshed), async () => {
      assert.deepEqual(await reopened.manager.restoreSession(), refreshed);
    });
  }
});

test('secure storage failures are shown without pretending the login was saved', async () => {
  const state = session();
  state.secure.setItemAsync = async () => { throw new Error('native failure'); };
  await assert.rejects(state.manager.startSession(tokens), /Could not save your login/);
  assert.equal(state.manager.getSession(), null);
  assert.equal(state.storage.size, 0);
  state.secure.getItemAsync = async () => { throw new Error('native failure'); };
  await assert.rejects(state.manager.restoreSession(), /Could not read your saved login/);
});

test('development and hosted backends never share remembered accounts', async () => {
  const state = session();
  await state.manager.startSession(tokens);
  assert.equal(await session(state.storage, 'http://localhost:8000').manager.restoreSession(), null);
});

test('simultaneous refresh requests share one operation and retain the session identity', async () => {
  const state = session();
  await state.manager.startSession(tokens);
  const original = state.manager.getSession();
  const request = deferred(); let calls = 0;
  await withFetch(async () => { calls++; return request.promise; }, async () => {
    const first = state.manager.refreshSession();
    const second = state.manager.refreshSession();
    assert.equal(first, second);
    request.resolve(reply(refreshed));
    await Promise.all([first, second]);
  });
  assert.equal(calls, 1);
  assert.equal(state.manager.getSession(), original);
  assert.deepEqual(original, refreshed);
});

test('logout or switching accounts during refresh cannot restore the previous account', async () => {
  for (const switching of [false, true]) {
    const state = session();
    await state.manager.startSession(tokens);
    const request = deferred();
    await withFetch(async () => request.promise, async () => {
      const refreshing = state.manager.refreshSession();
      await state.manager.forgetSession();
      if (switching) await state.manager.startSession({ access: 'new-user', refresh: 'new-refresh' });
      request.resolve(reply(refreshed));
      assert.equal(await refreshing, null);
    });
    assert.equal(state.manager.getSession()?.access ?? null, switching ? 'new-user' : null);
    assert.deepEqual([...state.storage.values()], switching ? ['new-refresh'] : []);
  }
});

test('logout queued during secure token rotation deletes the rotated token last', async () => {
  const state = session();
  await state.manager.startSession(tokens);
  const writing = deferred(); const finished = deferred();
  state.secure.setItemAsync = async (key, value) => { writing.resolve(); await finished.promise; state.storage.set(key, value); };
  await withFetch(async () => reply(refreshed), async () => {
    const rotating = state.manager.refreshSession();
    await writing.promise;
    const logout = state.manager.forgetSession();
    finished.resolve();
    await Promise.all([rotating, logout]);
  });
  assert.equal(state.manager.getSession(), null);
  assert.equal(state.storage.size, 0);
});

test('an authenticated 401 refreshes once and retries with the renewed token', async () => {
  const state = session();
  await state.manager.startSession(tokens);
  const http = load('src/shared/api/httpClient.ts', {
    './config': state.config, '../auth/session': state.manager,
  });
  let calls = 0;
  await withFetch(async (url, options) => {
    calls++;
    if (url.endsWith('/token/refresh/')) return reply(refreshed);
    const authorization = new Headers(options.headers).get('Authorization');
    return authorization === 'Bearer access-2' ? reply({ saved: true }) : reply({}, 401);
  }, async () => {
    const result = await http.requestJson('/api/v1/example/', { token: tokens.access });
    assert.deepEqual(result, { saved: true });
  });
  assert.equal(calls, 3);
});

test('a rejected login without authentication never triggers a session refresh', async () => {
  const state = session();
  await state.manager.startSession(tokens);
  const http = load('src/shared/api/httpClient.ts', {
    './config': state.config, '../auth/session': state.manager,
  });
  let calls = 0;
  await withFetch(async () => { calls++; return reply({}, 401); }, async () => {
    const result = await http.fetchWithTimeout('https://test.local/api/v1/accounts/login/', { method: 'POST' });
    assert.equal(result.status, 401);
  });
  assert.equal(calls, 1);
  assert.deepEqual(state.manager.getSession(), tokens);
});
