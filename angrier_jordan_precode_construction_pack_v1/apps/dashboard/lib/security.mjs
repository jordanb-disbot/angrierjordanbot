import { createCipheriv, createDecipheriv, createHash, randomBytes, timingSafeEqual } from 'node:crypto';

export class AccessError extends Error {
  constructor(code, status = 403) { super(code); this.code = code; this.status = status; }
}

/** Authentication configuration intentionally never includes database credentials. */
export function authConfig(env = process.env) {
  try {
    const origin = new URL(env.PUBLIC_DASHBOARD_URL ?? '');
    const callback = new URL(env.DISCORD_OAUTH_CALLBACK_URL ?? '');
    const local = ['localhost', '127.0.0.1', '[::1]'].includes(origin.hostname);
    if (origin.pathname !== '/' || origin.search || origin.hash || origin.username || origin.password ||
        (origin.protocol !== 'https:' && !(env.NODE_ENV !== 'production' && local && origin.protocol === 'http:')) ||
        callback.href !== `${origin.origin}/api/auth/discord/callback` ||
        !/^\d{17,20}$/.test(env.DISCORD_OAUTH_CLIENT_ID ?? '') || !/^\d{17,20}$/.test(env.DISCORD_GUILD_ID ?? '') ||
        (env.DISCORD_OAUTH_CLIENT_SECRET ?? '').length < 16 || (env.DASHBOARD_SESSION_SECRET ?? '').length < 32) throw new Error();
    return { origin: origin.origin, callback: callback.href, secure: origin.protocol === 'https:',
      clientId: env.DISCORD_OAUTH_CLIENT_ID ?? '', clientSecret: env.DISCORD_OAUTH_CLIENT_SECRET ?? '',
      guildId: env.DISCORD_GUILD_ID ?? '', secret: env.DASHBOARD_SESSION_SECRET ?? '' };
  } catch { throw new AccessError('AUTH_NOT_CONFIGURED', 503); }
}

export const nonce = () => randomBytes(32).toString('base64url');
export function equalSecret(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || !a || !b) return false;
  const left = Buffer.from(a), right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}
export function seal(payload, purpose, config) {
  const iv = randomBytes(12), key = createHash('sha256').update(config.secret).digest();
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  cipher.setAAD(Buffer.from(`aj-dashboard-v1:${purpose}:${config.origin}:${config.guildId}`));
  const data = Buffer.concat([cipher.update(JSON.stringify(payload), 'utf8'), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), data]).toString('base64url');
}
export function unseal(value, purpose, config, now = Date.now()) {
  try {
    if (typeof value !== 'string' || value.length > 3800 || !/^[A-Za-z0-9_-]+$/.test(value)) throw new Error();
    const packed = Buffer.from(value, 'base64url');
    const decipher = createDecipheriv('aes-256-gcm', createHash('sha256').update(config.secret).digest(), packed.subarray(0, 12));
    decipher.setAAD(Buffer.from(`aj-dashboard-v1:${purpose}:${config.origin}:${config.guildId}`));
    decipher.setAuthTag(packed.subarray(12, 28));
    const payload = JSON.parse(Buffer.concat([decipher.update(packed.subarray(28)), decipher.final()]).toString('utf8'));
    if (!payload || !Number.isFinite(payload.expiresAt) || payload.expiresAt <= now) throw new Error();
    return payload;
  } catch { throw new AccessError('SIGN_IN_REQUIRED', 401); }
}
export function cookieNames(config) {
  const prefix = config.secure ? '__Host-' : '';
  return { session: `${prefix}aj-session`, state: `${prefix}aj-oauth-state` };
}
export const cookieOptions = (config, maxAge) => ({ httpOnly: true, secure: config.secure, sameSite: 'lax', path: '/', maxAge });

export function validateCsrf(request, session, config, token) {
  if (request.headers.get('origin') !== config.origin ||
      !equalSecret(token ?? request.headers.get('x-csrf-token'), session.csrf)) throw new AccessError('CSRF_REJECTED');
}

async function discordJson(path, accessToken, fetcher) {
  let response;
  try {
    response = await fetcher(`https://discord.com/api/v10${path}`, {
      headers: { Authorization: `Bearer ${accessToken}` }, cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(8000),
    });
  } catch { throw new AccessError('DISCORD_UNAVAILABLE', 503); }
  if (!response.ok) throw new AccessError(response.status === 401 ? 'SIGN_IN_REQUIRED' : 'DISCORD_UNAVAILABLE', response.status === 401 ? 401 : 503);
  try { return await response.json(); } catch { throw new AccessError('DISCORD_UNAVAILABLE', 503); }
}

/** No cached role claims: all callers obtain fresh Discord membership and permissions. */
export async function currentAccess(accessToken, config, fetcher = fetch) {
  let after = '';
  for (let page = 0; page < 10; page++) {
    const guilds = await discordJson(`/users/@me/guilds?limit=200${after ? `&after=${after}` : ''}`, accessToken, fetcher);
    if (!Array.isArray(guilds)) throw new AccessError('DISCORD_UNAVAILABLE', 503);
    const target = guilds.find(guild => guild.id === config.guildId);
    if (target) {
      const isGuildOwner = target.owner === true;
      const administrator = typeof target.permissions === 'string' && /^\d+$/.test(target.permissions) && (BigInt(target.permissions) & 8n) === 8n;
      if (!isGuildOwner && !administrator) throw new AccessError('ADMIN_REQUIRED');
      return { isGuildOwner, administrator, guildId: config.guildId };
    }
    if (guilds.length < 200) break;
    const next = guilds.at(-1)?.id;
    if (typeof next !== 'string' || !/^\d{17,20}$/.test(next) || next === after) throw new AccessError('DISCORD_UNAVAILABLE', 503);
    after = next;
  }
  throw new AccessError('ADMIN_REQUIRED');
}

export function authorizationUrl(config, state) {
  const url = new URL('https://discord.com/oauth2/authorize');
  url.search = new URLSearchParams({ client_id: config.clientId, redirect_uri: config.callback,
    response_type: 'code', scope: 'identify guilds', state, prompt: 'consent' }).toString();
  return url.href;
}

export async function exchangeCode(code, config, fetcher = fetch) {
  let response;
  try {
    response = await fetcher('https://discord.com/api/oauth2/token', { method: 'POST', cache: 'no-store', redirect: 'error',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, signal: AbortSignal.timeout(8000),
      body: new URLSearchParams({ client_id: config.clientId, client_secret: config.clientSecret,
        grant_type: 'authorization_code', code, redirect_uri: config.callback }).toString() });
  } catch { throw new AccessError('DISCORD_UNAVAILABLE', 503); }
  if (!response.ok) throw new AccessError('OAUTH_FAILED', 401);
  let token;
  try { token = await response.json(); } catch { throw new AccessError('OAUTH_FAILED', 401); }
  if (typeof token.access_token !== 'string' || token.access_token.length > 1500 || token.token_type?.toLowerCase() !== 'bearer' ||
      !Number.isFinite(token.expires_in) || token.expires_in <= 0 || !['identify', 'guilds'].every(scope => token.scope?.split(' ').includes(scope))) throw new AccessError('OAUTH_FAILED', 401);
  const member = await discordJson('/users/@me', token.access_token, fetcher);
  if (!/^\d{17,20}$/.test(member?.id ?? '')) throw new AccessError('OAUTH_FAILED', 401);
  return { accessToken: token.access_token, userId: member.id, csrf: nonce(),
    expiresAt: Date.now() + Math.min(1800, token.expires_in) * 1000 };
}

/** Acceptance is controlled by deployment configuration, never by a submitted setting. */
export function settingsWritesEnabled(env = process.env) {
  return env.AJ_DASHBOARD_ACCEPTED === 'true';
}
export function assertSettingsWriteEnabled(env = process.env) {
  if (!settingsWritesEnabled(env)) throw new AccessError('DASHBOARD_READ_ONLY', 423);
}
