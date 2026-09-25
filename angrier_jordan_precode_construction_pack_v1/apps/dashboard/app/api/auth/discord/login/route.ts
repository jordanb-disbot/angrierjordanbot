import { NextResponse } from 'next/server';
import { errorResponse, privateHeaders } from '../../../../../lib/auth';
import { authConfig, authorizationUrl, cookieNames, cookieOptions, nonce, seal } from '../../../../../lib/security.mjs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET() {
  try {
    const config = authConfig(), state = nonce();
    const response = NextResponse.redirect(authorizationUrl(config, state), { headers: privateHeaders });
    response.cookies.set(cookieNames(config).state, seal({ state, expiresAt: Date.now() + 300_000 }, 'oauth-state', config),
      { ...cookieOptions(config, 300), sameSite: 'lax' });
    return response;
  } catch (error) { return errorResponse(error); }
}
