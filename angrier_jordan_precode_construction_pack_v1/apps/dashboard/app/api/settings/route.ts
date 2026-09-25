import { NextResponse } from 'next/server';
import { errorResponse, privateHeaders, requireAdmin } from '../../../lib/auth';
import { readSettings } from '../../../lib/settings';
import { assertSettingsWriteEnabled, validateCsrf } from '../../../lib/security.mjs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET() {
  try {
    const { config } = await requireAdmin();
    return NextResponse.json({ readOnly: true, controls: await readSettings(config.guildId) }, { headers: privateHeaders });
  } catch (error) { return errorResponse(error); }
}
export async function POST(request: Request) {
  try {
    const { config, session } = await requireAdmin();
    validateCsrf(request, session, config);
    assertSettingsWriteEnabled();
    // One mutation API prevents alternate endpoints from bypassing draft classification.
    return NextResponse.json({ error: 'USE_SHARED_DRAFT_API' }, { status: 405, headers: privateHeaders });
  } catch (error) { return errorResponse(error); }
}
