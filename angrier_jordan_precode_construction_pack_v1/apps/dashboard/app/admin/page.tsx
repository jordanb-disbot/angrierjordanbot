import { requireAdmin } from '../../lib/auth';
import { readSettings } from '../../lib/settings';
import { AccessError, settingsWritesEnabled } from '../../lib/security.mjs';
import { draftService } from '../../lib/drafts';
import SettingsControls from './controls';
import type { ConfigDraft } from '../../../../packages/core/src/config-draft';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export default async function AdminPage() {
  let auth: Awaited<ReturnType<typeof requireAdmin>>;
  try { auth = await requireAdmin(); }
  catch (error) {
    const denied = error instanceof AccessError && error.status === 403;
    return <main className="entry"><section className="window sign-in"><p className="eyebrow">Angrier Jordan</p>
      <h1>{denied ? 'Administrator access required' : 'Sign in to continue'}</h1>
      <p>{denied ? 'Your current Discord permissions do not grant access to this server’s dashboard.' : 'We could not validate your session. Sign in again, or try again when Discord is available.'}</p>
      <a className="button" href="/api/auth/discord/login">Continue with Discord</a></section></main>;
  }
  let settings: Awaited<ReturnType<typeof readSettings>>;
  let draft:ConfigDraft;
  try { [settings,draft] = await Promise.all([readSettings(auth.config.guildId),draftService().view(auth.config.guildId,{...auth.access,userId:auth.session.userId})]); }
  catch { return <main className="entry"><section className="window sign-in"><h1>Settings unavailable</h1><p>The server’s live settings could not be loaded. Please try again shortly.</p><a href="/admin">Try again</a></section></main>; }
  const sections = [...new Set(settings.map(control => control.section))];
  return <div className="dashboard"><header className="topbar"><a className="brand" href="/admin">Angrier Jordan <span>Control Center</span></a>
    <form action="/api/auth/logout" method="post"><input type="hidden" name="csrf" value={auth.session.csrf} /><button className="quiet" type="submit">Sign out</button></form></header>
    <aside className="sidebar"><p className="eyebrow">Chairs · Settings</p><nav aria-label="Setting sections">{sections.map(section => <a key={section} href={`#${section}`}>{section.replaceAll('_', ' ')}</a>)}</nav></aside>
    <main className="content"><section className="window intro"><p className="eyebrow">{auth.access.isGuildOwner ? 'Server owner' : 'Administrator'} · Verified with Discord</p>
      <h1>Your server, at a glance.</h1><p>Review the settings that shape Chairs.</p>
      <div className="notice" role="status">{settingsWritesEnabled()?'Low-risk settings may save live. Broader changes require a reviewed shared draft.':'Read-only preview. Changes remain disabled until dashboard acceptance.'}</div></section>
      <SettingsControls settings={settings.map(({updatedAt,...control})=>control)} draft={draft} csrf={auth.session.csrf} memberId={auth.session.userId} isOwner={auth.access.isGuildOwner} writesEnabled={settingsWritesEnabled()}/>
    </main></div>;
}
