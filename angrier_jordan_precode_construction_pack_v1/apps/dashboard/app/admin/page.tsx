import { requireAdmin } from '../../lib/auth';
import { readSettings } from '../../lib/settings';
import { AccessError, settingsWritesEnabled } from '../../lib/security.mjs';
import { draftService } from '../../lib/drafts';
import { readRecentAudit } from '../../lib/audit';
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
  let draft:ConfigDraft;let activity:Awaited<ReturnType<typeof readRecentAudit>>;
  try { [settings,draft,activity] = await Promise.all([readSettings(auth.config.guildId),draftService().view(auth.config.guildId,{...auth.access,userId:auth.session.userId}),readRecentAudit(auth.config.guildId)]); }
  catch { return <main className="entry"><section className="window sign-in"><h1>Settings unavailable</h1><p>The server’s live settings could not be loaded. Please try again shortly.</p><a href="/admin">Try again</a></section></main>; }
  const sections = [...new Set(settings.map(control => control.section))];
  const enabledFeatures=settings.filter(control=>control.key.startsWith('features.')&&control.value===true).length;
  const restartRequired=settings.filter(control=>control.restartRequired).length;
  const reviewedOnly=settings.filter(control=>control.risk!=='normal'||control.dashboardWrite!=='live').length;
  return <div className="dashboard"><header className="topbar"><a className="brand" href="/admin">Angrier Jordan <span>Control Center</span></a>
    <form action="/api/auth/logout" method="post"><input type="hidden" name="csrf" value={auth.session.csrf} /><button className="quiet" type="submit">Sign out</button></form></header>
    <aside className="sidebar"><p className="eyebrow">Chairs · Control Center</p><nav aria-label="Dashboard sections"><a href="#overview">Overview</a><a href="#activity">Recent activity</a>{sections.map(section => <a key={section} href={`#${section}`}>{section.replaceAll('_', ' ')}</a>)}</nav></aside>
    <main className="content"><section className="window intro"><p className="eyebrow">{auth.access.isGuildOwner ? 'Server owner' : 'Administrator'} · Verified with Discord</p>
      <h1>Your server, at a glance.</h1><p>Review the settings that shape Chairs.</p>
      <div className="notice" role="status">{settingsWritesEnabled()?'Low-risk settings may save live. Broader changes require a reviewed shared draft.':'Read-only preview. Changes remain disabled until dashboard acceptance.'}</div></section>
      <section id="overview" className="overview-grid" aria-label="Dashboard overview"><article className="window overview-card"><span>Access</span><strong>{auth.access.isGuildOwner?'Server owner':'Administrator'}</strong><p>Verified through your current Discord permissions.</p></article><article className="window overview-card"><span>Shared draft</span><strong>{Object.keys(draft.changes).length} staged</strong><p>{draft.editorId?'An Administrator currently holds the edit lock.':'No active editor lock.'}</p></article><article className="window overview-card"><span>Feature switches</span><strong>{enabledFeatures} enabled</strong><p>Live feature settings currently enabled for this server.</p></article><article className="window overview-card"><span>Safeguards</span><strong>{reviewedOnly} reviewed</strong><p>{restartRequired} settings also require a worker restart after publishing.</p></article></section>
      <section id="activity" className="window activity-section"><div className="section-title"><h2>Recent activity</h2><span className="badge">Last {activity.length}</span></div>{activity.length?<ol className="audit-list">{activity.map(entry=><li key={entry.id}><div><strong>{entry.action.replaceAll('.', ' ')}</strong><span>{entry.source}{entry.targetType?` · ${entry.targetType}`:''}{entry.targetId?` · ${entry.targetId}`:''}</span></div><time dateTime={entry.createdAt.toISOString()}>{entry.createdAt.toISOString().replace('T',' ').replace('.000Z',' UTC')}</time></li>)}</ol>:<p className="description">No audited activity has been recorded yet.</p>}</section>
      <SettingsControls settings={settings.map(({updatedAt,...control})=>control)} draft={draft} csrf={auth.session.csrf} memberId={auth.session.userId} isOwner={auth.access.isGuildOwner} writesEnabled={settingsWritesEnabled()}/>
    </main></div>;
}
