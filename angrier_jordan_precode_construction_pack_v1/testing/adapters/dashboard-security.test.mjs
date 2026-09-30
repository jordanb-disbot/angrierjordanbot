import test from 'node:test';
import assert from 'node:assert/strict';
import { AccessError, authConfig, authorizationUrl, assertSettingsWriteEnabled, cookieNames, cookieOptions, currentAccess, exchangeCode, nonce, seal, unseal, validateCsrf, settingsWritesEnabled } from '../../apps/dashboard/lib/security.mjs';

const env = { NODE_ENV: 'production', PUBLIC_DASHBOARD_URL: 'https://dashboard.example.test',
  DISCORD_OAUTH_CALLBACK_URL: 'https://dashboard.example.test/api/auth/discord/callback',
  DISCORD_OAUTH_CLIENT_ID: '11111111111111111', DISCORD_GUILD_ID: '22222222222222222',
  DISCORD_OAUTH_CLIENT_SECRET: 'fake-client-secret-for-offline-tests', DASHBOARD_SESSION_SECRET: 'fake-session-secret-only-for-offline-tests-0123456789' };
const config = authConfig(env);
const fail = code => error => error instanceof AccessError && error.code === code;
const json = value => new Response(JSON.stringify(value), { status: 200, headers: { 'Content-Type': 'application/json' } });

test('auth configuration fails closed on wrong callback, non-HTTPS, unsafe origin and short secret', () => {
  for (const changes of [ { DISCORD_OAUTH_CALLBACK_URL: `${config.origin}/callback` },
    { DISCORD_OAUTH_CALLBACK_URL: `${config.callback}?redirect=https://evil.test` },
    { PUBLIC_DASHBOARD_URL: 'https://name:pass@dashboard.example.test' },
    { PUBLIC_DASHBOARD_URL: `${config.origin}/nested` }, { DASHBOARD_SESSION_SECRET: 'short' },
    { PUBLIC_DASHBOARD_URL: 'http://localhost:3000', DISCORD_OAUTH_CALLBACK_URL: 'http://localhost:3000/api/auth/discord/callback' } ]) {
    assert.throws(() => authConfig({ ...env, ...changes }), fail('AUTH_NOT_CONFIGURED'));
  }
});

test('cookie encryption rejects tampering, expiry, wrong purpose, origin, server and secret', () => {
  const payload = { accessToken: 'never-plaintext', csrf: nonce(), expiresAt: 10000 };
  const encoded = seal(payload, 'session', config);
  assert.ok(!encoded.includes('never-plaintext'));
  assert.deepEqual(unseal(encoded, 'session', config, 5000), payload);
  const bytes = Buffer.from(encoded, 'base64url'); bytes[30] ^= 1;
  for (const attempt of [() => unseal(bytes.toString('base64url'), 'session', config, 5000),
    () => unseal(encoded, 'session', config, 10000), () => unseal(encoded, 'oauth-state', config, 5000),
    ...[{ origin: 'https://other.test' }, { guildId: '33333333333333333' }, { secret: 'another-secret' }]
      .map(changes => () => unseal(encoded, 'session', { ...config, ...changes }, 5000))]) assert.throws(attempt, fail('SIGN_IN_REQUIRED'));
});

test('cookies use Railway-compatible host-only secure HttpOnly path and OAuth state expires quickly', () => {
  assert.equal(cookieNames(config).session, 'aj-session');
  assert.equal(cookieNames(config).state, 'aj-oauth-state');
  assert.deepEqual(cookieOptions(config, 300), { httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: 300 });
  const state = nonce();
  const url = new URL(authorizationUrl(config, state));
  assert.equal(url.origin, 'https://discord.com');
  assert.equal(url.searchParams.get('state'), state);
  assert.equal(url.searchParams.get('redirect_uri'), config.callback);
  assert.equal(url.searchParams.get('scope'), 'identify guilds');
});

test('CSRF rejects absent token, wrong token and cross-origin requests even with a valid token', () => {
  const session = { csrf: nonce() };
  const request = headers => new Request(`${config.origin}/api/settings`, { method: 'POST', headers });
  validateCsrf(request({ origin: config.origin, 'x-csrf-token': session.csrf }), session, config);
  validateCsrf(request({ referer: `${config.origin}/admin`, 'x-csrf-token': session.csrf }), session, config);
  validateCsrf(request({ origin: 'null', 'x-csrf-token': session.csrf }), session, config);
  for (const headers of [{ origin: config.origin }, { origin: config.origin, 'x-csrf-token': 'wrong' },
    { origin: 'https://evil.test', 'x-csrf-token': session.csrf }, { 'x-csrf-token': session.csrf }]) {
    assert.throws(() => validateCsrf(request(headers), session, config), fail('CSRF_REJECTED'));
  }
});

test('only current owner or Administrator of configured server qualifies', async () => {
  for (const guild of [{ id: config.guildId, owner: true, permissions: '0' }, { id: config.guildId, owner: false, permissions: '8' }]) {
    const access = await currentAccess('fake-token', config, async () => json([guild]));
    assert.equal(access.guildId, config.guildId);
    assert.ok(access.isGuildOwner || access.administrator);
  }
  for (const guilds of [[], [{ id: '99999999999999999', owner: true, permissions: '8' }],
    [{ id: config.guildId, owner: false, permissions: '32' }], [{ id: config.guildId, owner: false, permissions: 'not-a-number' }]]) {
    await assert.rejects(currentAccess('fake-token', config, async () => json(guilds)), fail('ADMIN_REQUIRED'));
  }
});

test('permission removal is seen on the next request without cached claims', async () => {
  let calls = 0;
  const fetcher = async (url, init) => {
    assert.equal(init.cache, 'no-store'); assert.equal(init.redirect, 'error');
    assert.equal(init.headers.Authorization, 'Bearer fake-token');
    return json([{ id: config.guildId, owner: false, permissions: ++calls === 1 ? '8' : '0' }]);
  };
  await currentAccess('fake-token', config, fetcher);
  await assert.rejects(currentAccess('fake-token', config, fetcher), fail('ADMIN_REQUIRED'));
  assert.equal(calls, 2);
});

test('permission lookup handles servers beyond the first page', async () => {
  let calls = 0;
  const first = Array.from({ length: 200 }, (_, i) => ({ id: String(10000000000000000n + BigInt(i)), owner: false, permissions: '0' }));
  const access = await currentAccess('fake-token', config, async url => {
    if (++calls === 1) return json(first);
    assert.ok(url.endsWith(`&after=${first.at(-1).id}`));
    return json([{ id: config.guildId, owner: true, permissions: '0' }]);
  });
  assert.equal(access.isGuildOwner, true); assert.equal(calls, 2);
});

test('provider errors, rate limits and malformed responses deny access without leaking bodies', async () => {
  for (const fetcher of [async () => new Response('secret provider body', { status: 429 }), async () => { throw new Error('secret network detail'); },
    async () => json({ unexpected: true }), async () => new Response('invalid json')]) {
    await assert.rejects(currentAccess('fake-token', config, fetcher), fail('DISCORD_UNAVAILABLE'));
  }
  await assert.rejects(currentAccess('fake-token', config, async () => new Response('', { status: 401 })), fail('SIGN_IN_REQUIRED'));
});

test('a short Discord rate limit retries once before authorization fails closed',async()=>{
  let calls=0;
  const access=await currentAccess('fake-token',config,async()=>++calls===1?new Response('',{status:429,headers:{'retry-after':'0.001'}}):json([{id:config.guildId,owner:true,permissions:'0'}]));
  assert.equal(access.isGuildOwner,true);assert.equal(calls,2);
  await assert.rejects(currentAccess('fake-token',config,async()=>new Response('',{status:429,headers:{'retry-after':'5'}})),fail('DISCORD_UNAVAILABLE'));
});

test('OAuth exchanges a code with exact callback, obtains identity, discards refresh token, and caps session age', async () => {
  let calls = 0;
  const started = Date.now();
  const session = await exchangeCode('fixture-code', config, async (url, init) => {
    if (++calls === 1) {
      assert.equal(url, 'https://discord.com/api/oauth2/token');
      const body = new URLSearchParams(init.body);
      assert.equal(body.get('redirect_uri'), config.callback); assert.equal(body.get('code'), 'fixture-code');
      return json({ access_token: 'fake-access-token', refresh_token: 'discard-me', token_type: 'Bearer', expires_in: 86400, scope: 'identify guilds' });
    }
    assert.ok(url.endsWith('/users/@me')); return json({ id: '44444444444444444' });
  });
  assert.equal(session.userId, '44444444444444444'); assert.equal(session.refreshToken, undefined);
  assert.ok(session.expiresAt <= Date.now() + 1800000 && session.expiresAt >= started + 1800000);
  assert.equal(calls, 2);
});

test('OAuth rejects failed exchange, omitted scopes, malformed expiry and missing identity', async () => {
  await assert.rejects(exchangeCode('code', config, async () => new Response('provider detail', { status: 400 })), fail('OAUTH_FAILED'));
  for (const token of [{ access_token: 'a', token_type: 'Bearer', expires_in: 3600, scope: 'identify' },
    { access_token: 'a', token_type: 'Bearer', expires_in: '3600', scope: 'identify guilds' }]) {
    await assert.rejects(exchangeCode('code', config, async () => json(token)), fail('OAUTH_FAILED'));
  }
});

test('writes require explicit dashboard acceptance; no development or test-mode bypass exists', () => {
  for(const env of [{},{AJ_DASHBOARD_ACCEPTED:'false'},{AJ_DASHBOARD_ACCEPTED:'1'},{NODE_ENV:'development',AJ_DASHBOARD_TEST_MUTATIONS:'true'}]){
    assert.equal(settingsWritesEnabled(env),false);assert.throws(() => assertSettingsWriteEnabled(env), fail('DASHBOARD_READ_ONLY'));
  }
  assert.equal(settingsWritesEnabled({AJ_DASHBOARD_ACCEPTED:'true'}),true);
});
