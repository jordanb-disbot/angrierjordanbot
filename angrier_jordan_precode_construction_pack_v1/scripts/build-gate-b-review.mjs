import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';

// Review packaging only: every image is produced by the feature's runtime renderer.
const root = new URL('../', import.meta.url);
const approval = JSON.parse(fs.readFileSync(new URL('docs/approved_visuals/gate-b-2026-09-25.json', root), 'utf8'));
assert.equal(approval.status, 'PASSED');
const groups = ['family-events', 'casino-profiles', 'community', 'chairisms', 'superlative'];
const read = file => fs.readFileSync(new URL(file, root));
const hash = file => crypto.createHash('sha256').update(read(file)).digest('hex');
const output = (file, value) => {
  if(process.argv.includes('--check'))assert.equal(read(file).toString().replaceAll('\r\n','\n'),value,file+' is stale; regenerate the Gate B review package.');
  else fs.writeFileSync(new URL(file,root),value);
};
const esc = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const relative = file => path.posix.relative('review-gate-b', file);
const controls = item => (item.controls ?? []).map(control => typeof control === 'string' ? control : `${control.label ?? control.placeholder ?? 'Select'}${control.disabled ? ' (disabled)' : ''}`).join(' · ') || 'None';
const items = groups.flatMap(group => JSON.parse(read(`review-gate-b/${group}/review-items.json`)).map(item => ({...item, group, key:`${group}/${item.id}`, classification:[item.classification].flat(), liveDiscordCapture:false})));
assert.equal(new Set(items.map(item => item.key)).size, items.length, 'Duplicate review key');
for (const item of items) {
  assert.equal(item.fixture, true);
  assert.ok(['READY FOR OWNER REVIEW','ENGINEERING ISSUE','NOT YET IMPLEMENTED','NO VISUAL REVIEW REQUIRED'].includes(item.status));
  assert.ok(item.name && item.scenario && item.renderer);
  read(item.renderer.split('#')[0]);
  item.hashes = {};
  for (const [kind, width] of [['desktop',440],['mobile',360]]) {
    const png = read(item[kind]);
    assert.equal(png.subarray(1,4).toString(), 'PNG', item[kind]);
    assert.equal(png.readUInt32BE(16), width, item[kind]);
    assert.ok(png.readUInt32BE(20) > 0);
    item.hashes[kind] = hash(item[kind]);
  }
  item.rendererHash = hash(item.renderer.split('#')[0]);
  item.ownerApproval = item.status === 'NO VISUAL REVIEW REQUIRED' ? 'INTERNAL_FIXTURE' : 'APPROVED';
  if(item.ownerApproval === 'APPROVED')item.status='APPROVED_BY_OWNER';
}
const review = items.filter(item => item.status !== 'NO VISUAL REVIEW REQUIRED');
const diagnostic = items.filter(item => item.status === 'NO VISUAL REVIEW REQUIRED');
review.forEach((item,index) => {item.number=index+1;});
const intro = 'Deterministic fictional fixtures from the current runtime renderers. These are not live Discord captures, production events, or live acceptance. Family/Casino/Profile images are runtime attachments; their native controls are listed separately. Community/Chairisms/Superlative images use clearly labeled Discord-equivalent fixture windows with actual adapter controls. Full payload transcripts remain in each feature folder.';
const preferences = [
  'Review the corrected centered, content-sized lounge panels and brass-framed member portraits across all Gate B features. Packaged chair portraits are fictional fixture avatars; runtime uses current Discord avatars or a deterministic monogram.',
  'Review maximum-length Chairism and multi-winner Spotlight images at mobile size; opening a long attachment may still be necessary in Discord’s constrained preview.',
  'Confirm the public placement and wording of staff-only Community controls. Authorization remains enforced when clicked; visibility does not grant access.'
];
const md = ['# Gate B owner review', '', intro, '', '**Gate B PASSED by explicit owner approval. No production deployment or live Discord acceptance has occurred.**', '', `Review ${review.length} items below. Two internal estate diagnostics are listed separately and require no visual approval.`, '', '## Approved review scope', '', ...preferences.map(p=>`- ${p}`), '', '## Numbered review items', ''];
for (const item of review) md.push(`${item.number}. **${item.name}** — ${item.status}`, `   - [Desktop](${relative(item.desktop)}) · [Mobile](${relative(item.mobile)})`, `   - Scenario: ${item.scenario}`, `   - Controls: ${controls(item)}.`, `   - Classification: ${item.classification.join(', ')}.`, `   - Source: [${item.renderer}](${relative(item.renderer.split('#')[0])}).`, ...(item.controlsNote?[`   - ${item.controlsNote}`]:[]), '');
md.push('## Internal diagnostics — no visual review required', '');
for(const item of diagnostic) md.push(`- ${item.name}: ${item.scenario} [Desktop](${relative(item.desktop)}) · [Mobile](${relative(item.mobile)}).`);
md.push('', '## Engineering evidence', '', '[Current visual correction report](VISUAL_CORRECTIONS.md). [Prior integration and validation report](INTEGRATION_REPORT.md). [Machine-readable review manifest](manifest.json). [Frozen visual authority](../docs/APPROVED_VISUAL_SYSTEM.md).', '');
output('review-gate-b/OWNER_REVIEW.md',md.join('\n'));
const card = item => `<article data-group="${esc(item.group)}" data-search="${esc((item.name+' '+item.scenario).toLowerCase())}" id="item-${item.number ?? item.id}"><header><small>${esc(item.group)} · ${esc(item.status)}</small><h2>${item.number ? `${item.number}. ` : ''}${esc(item.name)}</h2></header><p>${esc(item.scenario)}</p><p><strong>Classification:</strong> ${esc(item.classification.join(' · '))}</p><p><strong>Actual controls:</strong> ${esc(controls(item))}</p>${item.controlsNote?`<p>${esc(item.controlsNote)}</p>`:''}<div class="images"><figure><a href="${relative(item.desktop)}"><img loading="lazy" src="${relative(item.desktop)}" alt="Desktop fixture: ${esc(item.name)}"></a><figcaption><a href="${relative(item.desktop)}">Open desktop image</a></figcaption></figure><figure><a href="${relative(item.mobile)}"><img loading="lazy" src="${relative(item.mobile)}" alt="Mobile fixture: ${esc(item.name)}"></a><figcaption><a href="${relative(item.mobile)}">Open mobile image</a></figcaption></figure></div><details><summary>Renderer and fixture evidence</summary><p><a href="${relative(item.renderer.split('#')[0])}">${esc(item.renderer)}</a></p>${item.transcript?`<a href="${relative(item.transcript)}">Full payload transcript</a>`:''}<p>Fixture only · not live Discord · owner visual approval recorded.</p></details></article>`;
const html = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Angrier Jordan — Gate B owner review</title><style>
@font-face{font-family:Inter;src:url('../apps/dashboard/public/fonts/Inter-Variable.ttf')}@font-face{font-family:Space;src:url('../apps/dashboard/public/fonts/SpaceGrotesk-Variable.ttf')}
*{box-sizing:border-box}body{margin:0;background:#0b1220;color:#e6eaf0;font:16px/1.6 Inter,sans-serif}main{max-width:1100px;margin:auto;padding:28px}h1,h2,h3{font-family:Space,sans-serif;line-height:1.2}h1{color:#f4c542}a{color:#6bded9}p{max-width:90ch}article{margin:24px 0;padding:24px;border:1px solid #374151;border-radius:14px;background:#101e2b}small{color:#a0cec8}figure{margin:0;max-width:100%}.images{display:flex;gap:28px;flex-wrap:wrap;align-items:flex-start;margin:20px 0}.images img{display:block;width:auto;max-width:100%;height:auto}.images figure:first-child{width:440px}.images figure:nth-child(2){width:360px}figcaption{margin-top:8px}nav{position:sticky;top:0;background:#0b1220f5;padding:12px 0;z-index:1;display:flex;gap:12px;flex-wrap:wrap}input,select{font:inherit;color:#e6eaf0;background:#152937;border:1px solid #46706c;border-radius:6px;padding:8px;max-width:100%}summary{cursor:pointer}details{margin-top:12px}.notice{border-left:3px solid #f4c542;padding:12px 20px;background:#132a30}[hidden]{display:none!important}@media(max-width:600px){main{padding:16px}article{padding:16px}.images{gap:24px}}
</style><main><h1>Angrier Jordan · Gate B review</h1><div class="notice"><strong>Owner Gate B PASSED · ${review.length} approved review items</strong><p>${intro}</p></div><p><a href="OWNER_REVIEW.md">Numbered review document</a> · <a href="VISUAL_CORRECTIONS.md">Current visual corrections and validation</a> · <a href="../docs/APPROVED_VISUAL_SYSTEM.md">Frozen visual authority</a></p><h2>Approved review scope</h2><ul>${preferences.map(p=>`<li>${esc(p)}</li>`).join('')}</ul><nav aria-label="Review filters"><label>Feature <select id="group"><option value="">All features</option>${groups.map(g=>`<option>${g}</option>`).join('')}</select></label><label>Find <input id="search" type="search" placeholder="State or scenario"></label><span id="count" aria-live="polite">${review.length} items</span></nav>${review.map(card).join('')}<details><summary>Internal diagnostics (${diagnostic.length}) — no visual review required</summary>${diagnostic.map(card).join('')}</details></main><script>const cards=[...document.querySelectorAll('article')];function filter(){const group=document.querySelector('#group').value,search=document.querySelector('#search').value.toLowerCase();for(const card of cards)card.hidden=!!((group&&card.dataset.group!==group)||(search&&!card.dataset.search.includes(search)));document.querySelector('#count').textContent=cards.filter(c=>!c.hidden&&!c.parentElement.matches('details')).length+' review items';}document.querySelector('#group').addEventListener('change',filter);document.querySelector('#search').addEventListener('input',filter);</script></html>`;
output('review-gate-b/index.html',html);
output('review-gate-b/manifest.json',JSON.stringify({version:1,status:'OWNER_GATE_B_PASSED',fixture:true,liveDiscordCapture:false,reviewCount:review.length,diagnosticCount:diagnostic.length,items:[...review,...diagnostic]},null,2)+'\n');
console.log(`Gate B package: ${review.length} numbered review items, ${diagnostic.length} internal diagnostics, ${items.length*2} verified images.`);
