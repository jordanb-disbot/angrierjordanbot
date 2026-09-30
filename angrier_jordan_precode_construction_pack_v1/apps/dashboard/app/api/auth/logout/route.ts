import { NextResponse } from 'next/server';
import { errorResponse, privateHeaders, readSession } from '../../../../lib/auth';
import { cookieNames, cookieOptions, validateCsrf } from '../../../../lib/security.mjs';

export const runtime = 'nodejs';
export async function POST(request: Request) {
  try {
    // Signing out must work even after server membership or Administrator permission is removed.
    const { config, session } = await readSession();
    const form = await request.formData();
    validateCsrf(request, session, config, form.get('csrf'));
    // Revocation invalidates copied session cookies too; failures never expose provider responses.
    try {
      await fetch('https://discord.com/api/oauth2/token/revoke', { method: 'POST', cache: 'no-store', redirect: 'error',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, signal: AbortSignal.timeout(8000),
        body: new URLSearchParams({ client_id: config.clientId, client_secret: config.clientSecret, token: session.accessToken, token_type_hint: 'access_token' }) });
    } catch { /* Local logout must still finish when Discord is unavailable. */ }
    const response = NextResponse.redirect(`${config.origin}/`, { status: 303, headers: privateHeaders });
    response.cookies.set(cookieNames(config).session, '', { ...cookieOptions(config, 0), sameSite: 'lax' });
    return response;
  } catch (error) {
    const diagnostic=(error instanceof Error&&'diagnostic'in error&&error.diagnostic&&typeof error.diagnostic==='object'?error.diagnostic:{});
    const code=error instanceof Error&&'code'in error&&typeof error.code==='string'?error.code:'DASHBOARD_UNAVAILABLE';
    console.warn('Dashboard logout diagnostic',JSON.stringify({code,...diagnostic}));
    return errorResponse(error);
  }
}
