import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { PermissionEngine } from '../../../packages/core/src/permissions';
import { CAPABILITY_MATRIX } from '../../../packages/contracts/src/generated/capabilities';
import { AccessError, authConfig, cookieNames, currentAccess, unseal } from './security.mjs';

export const privateHeaders = { 'Cache-Control': 'no-store, private', 'Pragma': 'no-cache', 'Referrer-Policy': 'no-referrer' };
export async function readSession() {
  const config = authConfig();
  const jar = await cookies();
  const session = unseal(jar.get(cookieNames(config).session)?.value, 'session', config);
  if (typeof session.accessToken !== 'string' || !/^\d{17,20}$/.test(session.userId ?? '') || typeof session.csrf !== 'string') throw new AccessError('SIGN_IN_REQUIRED', 401);
  return { config, session };
}
export async function requireAdmin() {
  const { config, session } = await readSession();
  const access = await currentAccess(session.accessToken, config);
  const permissions = new PermissionEngine(CAPABILITY_MATRIX.capabilities);
  if (!permissions.canDashboard(access, 'dashboard.access')) throw new AccessError('ADMIN_REQUIRED');
  return { config, session, access };
}
export function errorResponse(error: unknown) {
  const known = error instanceof AccessError;
  return NextResponse.json({ error: known ? error.code : 'DASHBOARD_UNAVAILABLE' }, {
    status: known ? error.status : 503, headers: privateHeaders,
  });
}
