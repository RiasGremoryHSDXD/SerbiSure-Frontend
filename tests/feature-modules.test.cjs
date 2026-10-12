const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

// Exercise domain modules without mounting native UI or contacting a real backend.
const root = path.resolve(__dirname, '..');
const modules = new Map();
const configPath = path.join(root, 'src/shared/api/config.ts');
modules.set(configPath, {
  API_BASE_URL: 'http://test.local', DEFAULT_TIMEOUT_MS: 15000,
  buildApiUrl: (endpoint) => /^https?:/.test(endpoint) ? endpoint : `http://test.local/${endpoint.replace(/^\/+/, '')}`,
});
function load(relativePath) {
  const filename = path.resolve(root, relativePath);
  if (modules.has(filename)) return modules.get(filename);
  const output = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS },
    fileName: filename,
  }).outputText;
  const module = { exports: {} };
  modules.set(filename, module.exports);
  const localRequire = (specifier) => {
    if (!specifier.startsWith('.')) return require(specifier);
    const target = path.resolve(path.dirname(filename), specifier);
    return load(fs.existsSync(target) ? target : `${target}.ts`);
  };
  new Function('require', 'module', 'exports', output)(localRequire, module, module.exports);
  return module.exports;
}

const roles = load('src/app/roleConfig.ts');
const mapper = load('src/features/feed/feedMapper.ts');
const filters = load('src/features/feed/feedFilters.ts');
const posting = load('src/features/posting/postingConfig.ts');
const validation = load('src/features/posting/validation.ts');
const http = load('src/shared/api/httpClient.ts');
const feedApi = load('src/features/feed/api/feedApi.ts');
const cache = load('src/features/feed/feedCache.ts');
const postingApi = load('src/features/posting/api/postingApi.ts');
const date = load('src/shared/utils/date.ts');
const browse = load('src/features/feed/browsePresentation.ts');
const emptyFilters = { categories: [], bookingType: null, maxRate: null, location: '', sortBy: 'newest' };
const dto = {
  booking_id: 'post-1', poster_id: 'author-1', name: 'Test User', profile_link: 'https://test.local/avatar.png',
  booking_type: 'short_term', service_category: ['Cleaning', 'Child_care'], daily_rate: '800',
  barangay: 'Nazareth', city: 'Cagayan de Oro', street: 'Test Street', createdAt: new Date().toISOString(),
};
const response = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
async function withFetch(fetch, run) {
  const original = global.fetch;
  global.fetch = fetch;
  try { return await run(); } finally { global.fetch = original; cache.clearExploreFeedCache(); }
}

test('account roles select the correct posting mode and verification documents', () => {
  assert.equal(roles.resolveRole('Kasambahay'), 'kasambahay');
  assert.equal(roles.resolveRole('Homeowner'), 'homeowner');
  assert.equal(roles.resolveRole(null, 'kasambahay'), 'kasambahay');
  assert.equal(roles.ROLE_CONFIG.homeowner.postingMode, 'job');
  assert.equal(roles.ROLE_CONFIG.homeowner.workerProfile, false);
  assert.deepEqual(roles.ROLE_CONFIG.homeowner.requiredDocuments, ['national_id_front', 'national_id_back']);
  assert.equal(roles.ROLE_CONFIG.kasambahay.postingMode, 'service');
  assert.equal(roles.ROLE_CONFIG.kasambahay.workerProfile, true);
  assert.deepEqual(roles.ROLE_CONFIG.kasambahay.requiredDocuments, ['nbi_clearance', 'police_clearance']);
});

test('Home maps the same DTO into distinct job and worker cards', () => {
  const job = mapper.mapFeedPost(dto, 'kasambahay');
  const worker = mapper.mapFeedPost(dto, 'homeowner');
  assert.equal(job.kind, 'job');
  assert.equal(job.authorRole, 'Homeowner');
  assert.equal(job.partnerId, dto.poster_id);
  assert.equal(job.roleTag, 'Cleaning');
  assert.deepEqual(job.categories, ['Cleaning', 'Child Care']);
  assert.equal(worker.kind, 'service');
  assert.equal(worker.authorRole, 'Kasambahay');
  assert.equal(worker.roleTag, 'Cleaner');
  assert.equal(worker.title, 'Cleaner');
  assert.equal(job.price, '₱800');
  assert.equal(job.unit, '/ day');
  assert.equal(job.location, 'Nazareth, Cagayan de Oro');
  assert.equal(job.aboutText, 'I am looking for Cleaning & Child Care at Test Street, Nazareth, Cagayan de Oro, capable of working on a stay-out setup.');
  assert.equal(worker.aboutText, 'Available for Cleaner & Child Care work in Nazareth, Cagayan de Oro.');
  assert.deepEqual(job.tags, ['Verified Employer', 'Part-time', 'Stay-out', 'Cleaning', 'Child Care']);
});

test('Home preserves long-term labels, explicit setup, and partial response fallbacks', () => {
  const item = { ...dto, booking_type: 'long_term', service_category: 'Laundry', special_instruction: '  Stay-out laundry help  ' };
  const job = mapper.mapFeedPost(item, 'kasambahay');
  const worker = mapper.mapFeedPost(item, 'homeowner');
  assert.equal(job.termTag, 'Long-term');
  assert.equal(worker.termTag, 'Stay-in');
  assert.equal(job.unit, '/ month');
  assert.equal(job.setupTag, 'Stay-out');
  assert.equal(job.aboutText, 'Stay-out laundry help');
  assert.equal(mapper.mapFeedPost({ ...dto, service_category: null }, 'kasambahay').roleTag, 'Household');
  assert.equal(mapper.mapFeedPost({ ...dto, service_category: null }, 'homeowner').roleTag, 'General Service');
  assert.equal(mapper.mapFeedPost({ ...dto, service_category: [] }, 'kasambahay').roleTag, 'Household Service');
  assert.equal(mapper.mapFeedPost({ ...dto, name: null, profile_link: null }, 'homeowner').employerName, 'Kasambahay Worker');
});

test('Explore keeps its own card wording and rate units', () => {
  const worker = mapper.mapWorkerPreview(dto);
  const job = mapper.mapJobPreview({ ...dto, booking_type: 'long_term' });
  assert.equal(worker.name, 'Test User');
  assert.equal(worker.role, 'Cleaning, Child Care');
  assert.equal(worker.years, 'Part-time');
  assert.equal(worker.price, '₱800');
  assert.equal(worker.unit, 'per day');
  assert.equal(mapper.mapWorkerPreview({ ...dto, booking_type: 'long_term' }).unit, 'per month');
  assert.equal(job.price, '₱800');
  assert.equal(job.title, 'Cleaning & Child Care');
  assert.equal(job.unit, 'per month');
  assert.equal(job.termTag, 'Long-term');
  assert.equal(job.image, dto.profile_link);
});

test('category filters include secondary categories and combine with search', () => {
  const matches = filters.matchesHomeFeedFilters;
  assert.equal(matches(['Cleaning', 'Child_care'], ['Test User', 'Nazareth'], 'Child Care', ' nazareth '), true);
  assert.equal(matches(['Cooking'], ['Test User'], 'Cleaning', ''), false);
  assert.equal(matches(['All-around'], ['Test User'], 'Laundry', ''), true);
  assert.equal(matches(['Caregiver'], ['Test User'], null, ''), true);
  assert.equal(matches(['Laundry'], ['Test User'], 'Laundry', 'missing'), false);
});

test('Browse distinguishes an empty database, filtered results, reviewed posts, and errors', () => {
  assert.equal(browse.browseEmptyCopy('kasambahay', 0, false).title, 'No jobs available yet');
  assert.equal(browse.browseEmptyCopy('homeowner', 0, false).title, 'No services available yet');
  assert.equal(browse.browseEmptyCopy('homeowner', 0, true).action, 'Clear Filters');
  assert.equal(browse.browseEmptyCopy('kasambahay', 4, true).title, "You're all caught up!");
  const failure = browse.browseEmptyCopy('homeowner', 4, true, 'Request failed');
  assert.equal(failure.title, 'Could not load posts');
  assert.equal(failure.description, 'Request failed');
  assert.equal(failure.action, 'Try Again');
});

test('both Browse roles share clear header counts without claiming distance matching', () => {
  assert.equal(browse.browseHeaderCopy('homeowner', 'explore', 1, false).subtitle, '1 service post to explore');
  assert.equal(browse.browseHeaderCopy('kasambahay', 'explore', 2, false).subtitle, '2 job posts to explore');
  assert.equal(browse.browseHeaderCopy('kasambahay', 'applied', 1, false).subtitle, '1 submitted application');
  assert.equal(browse.browseHeaderCopy('homeowner', 'saved', 0, false).title, 'Saved Kasambahay');
  assert.equal(browse.browseHeaderCopy('homeowner', 'explore', 0, true).subtitle, 'Finding service posts...');
  assert.equal(browse.browseHeaderCopy('kasambahay', 'explore', 0, false, 'Offline').subtitle, 'Unable to load posts');
});

test('Browse quick filters work identically for jobs and services and preserve advanced options', () => {
  const advanced = { ...emptyFilters, maxRate: 900, location: 'Nazareth', sortBy: 'rate_asc' };
  const stayIn = browse.quickBrowseFilters(advanced, 'Stay-in');
  assert.equal(stayIn.bookingType, 'long_term');
  assert.deepEqual(stayIn.categories, []);
  assert.equal(stayIn.location, 'Nazareth');
  assert.equal(stayIn.maxRate, 900);
  assert.equal(browse.activeBrowseChip(stayIn), 'Stay-in');
  const category = browse.quickBrowseFilters(stayIn, 'Child Care');
  assert.equal(category.bookingType, null);
  assert.deepEqual(category.categories, ['Child Care']);
  const all = browse.quickBrowseFilters(category, 'All');
  assert.deepEqual(all.categories, []);
  assert.equal(all.bookingType, null);
  assert.equal(all.sortBy, 'rate_asc');
  assert.equal(browse.countBrowseFilters(all), 3);
  assert.equal(browse.activeBrowseChip({ ...category, bookingType: 'short_term' }), '');
});

test('posting defaults switch with engagement while preserving a custom rate', () => {
  assert.equal(posting.POSTING_CONFIG.job.dailyDefault, '800');
  assert.equal(posting.POSTING_CONFIG.service.dailyDefault, '600');
  assert.equal(posting.engagementRate('job', '800', 'long'), '8000');
  assert.equal(posting.engagementRate('service', '600', 'long'), '6500');
  assert.equal(posting.engagementRate('job', '8000', 'short'), '800');
  assert.equal(posting.engagementRate('service', '6500', 'short'), '600');
  assert.equal(posting.engagementRate('service', '900', 'long'), '900');
});

test('generated descriptions preserve role and engagement wording', () => {
  const input = { service: 'Cleaning', location: 'Nazareth', setup: 'stay-out', time: '8 AM to 5 PM', shortTerm: true, instructions: '  Pet-friendly  ' };
  assert.equal(posting.buildPostDescription('job', input), 'I am looking for Cleaning at Nazareth, capable of working on 8 AM to 5 PM on a stay-out setup.\n\nSpecific instructions:\nPet-friendly');
  assert.equal(posting.buildPostDescription('service', input), 'I am offering Cleaning service in Nazareth, available 8 AM to 5 PM on a stay-out arrangement.\n\nAbout my experience:\nPet-friendly');
  assert.equal(posting.buildPostDescription('service', { ...input, shortTerm: false, instructions: '' }), 'I am looking for long-term Cleaning work in Nazareth on a stay-out arrangement.');
});

test('rate validation handles empty values, formatted amounts, and existing limits', () => {
  assert.ok(validation.validatePostingRate('job', 'short', ''));
  assert.ok(validation.validatePostingRate('service', 'short', 'abc'));
  assert.ok(validation.validatePostingRate('service', 'short', '599'));
  assert.equal(validation.validatePostingRate('job', 'short', '600'), null);
  assert.ok(validation.validatePostingRate('job', 'long', '6499'));
  assert.equal(validation.validatePostingRate('service', 'long', '₱6,500'), null);
});

test('feed query serialization includes selected filters and no empty defaults', () => {
  assert.equal(feedApi.buildFeedPath(emptyFilters), '/api/v1/booking/feed/');
  const query = new URL(feedApi.buildFeedPath({ ...emptyFilters, categories: ['Cleaning', 'Cooking'], bookingType: 'short_term', maxRate: 900, location: ' Nazareth ', sortBy: 'rate_asc' }), 'http://test.local').searchParams;
  assert.equal(query.get('category'), 'Cleaning,Cooking');
  assert.equal(query.get('booking_type'), 'short_term');
  assert.equal(query.get('max_rate'), '900');
  assert.equal(query.get('location'), 'Nazareth');
  assert.equal(query.get('sort'), 'rate_asc');
});

test('HTTP client adds bearer and JSON headers and preserves request metadata', async () => {
  await withFetch(async (url, options) => {
    assert.equal(url, 'http://test.local/example/');
    assert.equal(options.headers.get('Authorization'), 'Bearer test-session');
    assert.equal(options.headers.get('Content-Type'), 'application/json');
    assert.equal(options.headers.get('Idempotency-Key'), 'post-key');
    assert.equal(options.method, 'POST');
    assert.ok(options.signal instanceof AbortSignal);
    return response({ ok: true });
  }, async () => {
    assert.deepEqual(await http.requestJson('/example/', { token: 'test-session', method: 'POST', body: '{}', headers: { 'Idempotency-Key': 'post-key' } }), { ok: true });
  });
});

test('HTTP client lets multipart upload set its own content type', async () => {
  const form = new FormData(); form.append('field', 'value');
  await withFetch(async (_, options) => {
    assert.equal(options.body, form);
    assert.equal(options.headers.has('Content-Type'), false);
    return response({});
  }, () => http.requestResponse('/upload/', { method: 'POST', body: form }));
});

test('feed distinguishes empty data, malformed responses, and authentication errors', async () => {
  await withFetch(async () => response([]), async () => assert.deepEqual(await feedApi.fetchFeed('test'), []));
  await withFetch(async () => response({ results: [] }), async () => assert.rejects(feedApi.fetchFeed('test'), /Unexpected feed response/));
  await withFetch(async () => response({ detail: 'Expired session' }, 401), async () => assert.rejects(feedApi.fetchFeed('test'), (error) => error instanceof http.ApiError && error.status === 401 && error.message === 'Expired session'));
  await withFetch(async () => new Response('<html>Unavailable</html>', { status: 503 }), async () => assert.rejects(feedApi.fetchFeed('test'), (error) => error instanceof http.ApiError && error.status === 503));
});

test('Explore cache isolates account, role, and filters and supports forced refresh', async () => {
  let calls = 0;
  await withFetch(async () => { calls++; return response([dto]); }, async () => {
    cache.clearExploreFeedCache();
    await cache.loadExploreFeed('homeowner', 'session-a', emptyFilters);
    await cache.loadExploreFeed('homeowner', 'session-a', emptyFilters);
    assert.equal(calls, 1);
    await cache.loadExploreFeed('homeowner', 'session-b', emptyFilters);
    await cache.loadExploreFeed('kasambahay', 'session-a', emptyFilters);
    await cache.loadExploreFeed('homeowner', 'session-a', { ...emptyFilters, categories: ['Cleaning'] });
    assert.equal(calls, 4);
    await cache.loadExploreFeed('homeowner', 'session-a', emptyFilters, true);
    assert.equal(calls, 5);
  });
});

test('logout clears cached data and prevents an old request repopulating it', async () => {
  let release; let calls = 0;
  await withFetch(async () => {
    calls++;
    if (calls === 1) return new Promise((resolve) => { release = () => resolve(response([dto])); });
    return response([]);
  }, async () => {
    const old = cache.loadExploreFeed('homeowner', 'session', emptyFilters);
    cache.clearExploreFeedCache();
    release(); await old;
    assert.deepEqual(await cache.loadExploreFeed('homeowner', 'session', emptyFilters), []);
    assert.equal(calls, 2);
  });
});

test('an older feed response cannot overwrite a newer forced refresh', async () => {
  let release; let calls = 0;
  await withFetch(async () => {
    calls++;
    if (calls === 1) return new Promise((resolve) => { release = () => resolve(response([dto])); });
    return response([]);
  }, async () => {
    const old = cache.loadExploreFeed('homeowner', 'session', emptyFilters);
    await cache.loadExploreFeed('homeowner', 'session', emptyFilters, true);
    release(); await old;
    assert.deepEqual(await cache.loadExploreFeed('homeowner', 'session', emptyFilters), []);
    assert.equal(calls, 2);
  });
});

test('successful posting invalidates Explore and preserves idempotency', async () => {
  let calls = 0;
  await withFetch(async (url, options) => {
    calls++;
    if (url.endsWith('/post/')) assert.equal(options.headers.get('Idempotency-Key'), 'unique-key');
    return response([]);
  }, async () => {
    await cache.loadExploreFeed('homeowner', 'session', emptyFilters);
    await postingApi.submitPost('session', {}, 'unique-key');
    await cache.loadExploreFeed('homeowner', 'session', emptyFilters);
    assert.equal(calls, 3);
  });
});

test('invalid timestamps render a safe fallback', () => {
  assert.equal(date.formatTimeAgo('invalid-date'), 'Recently');
});

test('shared modules have no dependencies on app or feature modules', () => {
  function visit(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const filename = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(filename);
      else if (/\.tsx?$/.test(filename)) {
        const source = ts.createSourceFile(filename, fs.readFileSync(filename, 'utf8'), ts.ScriptTarget.Latest, true);
        for (const node of source.statements) {
          if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
            const specifier = node.moduleSpecifier?.text;
            if (specifier?.startsWith('.')) {
              const target = path.relative(root, path.resolve(path.dirname(filename), specifier)).replace(/\\/g, '/');
              assert.ok(!/^src\/(features|app)\//.test(target), `${path.relative(root, filename)} imports ${specifier}`);
            }
          }
        }
      }
    }
  }
  visit(path.join(root, 'src/shared'));
});
