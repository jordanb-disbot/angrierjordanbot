import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { PermissionEngine } from '../../../../../../../packages/core/src/permissions';
import { CAPABILITY_MATRIX } from '../../../../../../../packages/contracts/src/generated/capabilities';
import { errorResponse, privateHeaders } from '../../../../../lib/auth';
import { AccessError, authConfig, cookieNames, cookieOptions, currentAccess, equalSecret, exchangeCode, seal, unseal } from '../../../../../lib/security.mjs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  let config: ReturnType<typeof authConfig> | undefined;
  let response: NextResponse;
  try {
    config = authConfig();
    const query = new URL(request.url).searchParams;
    const jar = await cookies();
    const pending = unseal(jar.get(cookieNames(config).state)?.value, 'oauth-state', config);
    if (query.getAll('state').length !== 1 || query.getAll('code').length !== 1 || query.has('error') ||
        !equalSecret(query.get('state'), pending.state) || !query.get('code') || query.get('code')!.length > 2048) throw new AccessError('OAUTH_STATE_REJECTED');
    const session = await exchangeCode(query.get('code'), config);
    const access = await currentAccess(session.accessToken, config);
    if (!new PermissionEngine(CAPABILITY_MATRIX.capabilities).canDashboard(access, 'dashboard.access')) throw new AccessError('ADMIN_REQUIRED');
    response = NextResponse.redirect(`${config.origin}/admin`, { headers: privateHeaders });
    response.cookies.set(cookieNames(config).session, seal(session, 'session', config),
      { ...cookieOptions(config, Math.floor((session.expiresAt - Date.now()) / 1000)), sameSite: 'lax' });
  } catch (error) {
    const code=error instanceof AccessError?error.code:'DASHBOARD_UNAVAILABLE';
    console.warn('Dashboard auth diagnostic',JSON.stringify({stage:'oauth-callback',code}));
    response = errorResponse(error);
  }
  if (config) response.cookies.set(cookieNames(config).state, '', { ...cookieOptions(config, 0), sameSite: 'lax' });
  return response;
}
