const esc=(value:string)=>value.replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]!));

/** Non-explicit Chairs visual for /pp: a playful recliner with an extending footrest. */
export function renderReclinerCheck(name:string,extension:number):string{
  // Keep the fully extended pose inside the 1200px card viewport.
  const safe=esc(name).slice(0,80), length=Math.max(1,Math.min(12,extension)),rest=60+length*40;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="520" viewBox="0 0 1200 520">
<defs><linearGradient id="bg" x2="1" y2="1"><stop stop-color="#071b24"/><stop offset="1" stop-color="#172d35"/></linearGradient><linearGradient id="seat" x2="0" y2="1"><stop stop-color="#174b52"/><stop offset="1" stop-color="#0b292f"/></linearGradient><filter id="glow"><feGaussianBlur stdDeviation="7" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
<rect x="8" y="8" width="1184" height="504" rx="28" fill="url(#bg)" stroke="#c9a768" stroke-width="3"/>
<text x="62" y="72" fill="#c9a768" font-family="Inter,Arial" font-size="20" letter-spacing="4">ANGRIER JORDAN · CHAIR CHECK</text>
<text x="62" y="122" fill="#eef4f5" font-family="Space Grotesk,Arial" font-size="38" font-weight="700">${safe}'s recliner is ready</text>
<text x="62" y="158" fill="#9fc1c2" font-family="Inter,Arial" font-size="20">A comfortable, decidedly non-serious seat inspection.</text>
<g filter="url(#glow)">
  <path d="M180 390L132 190C116 122 160 92 222 82C286 72 342 105 364 160L410 276L570 304L620 372L566 426L236 426C205 426 187 413 180 390Z" fill="url(#seat)" stroke="#19a7a4" stroke-width="7"/>
  <path d="M165 184C150 128 196 101 246 103C294 105 325 137 335 181L349 239L250 256L194 236Z" fill="#15505a" stroke="#c9a768" stroke-width="6"/>
  <path d="M237 269C305 250 397 257 474 289L574 325L556 383L224 383L202 340Z" fill="#0d3540" stroke="#19a7a4" stroke-width="7"/>
  <path d="M184 392Q365 368 560 389L578 426L206 444Q180 427 184 392Z" fill="#241f24" stroke="#c9a768" stroke-width="7"/>
  <path d="M572 334H${570+rest}" stroke="#c9a768" stroke-width="28" stroke-linecap="round"/><path d="M572 334H${570+rest}" stroke="#17606a" stroke-width="18" stroke-linecap="round"/>
  <path d="M610 354L${610+Math.round(rest*.42)} 410M650 360L${650+Math.round(rest*.42)} 410" stroke="#d9a441" stroke-width="10"/><path d="M610 354L${610+Math.round(rest*.42)} 410M650 360L${650+Math.round(rest*.42)} 410" stroke="#6f4316" stroke-width="4"/>
  <circle cx="206" cy="414" r="18" fill="#e8b452" stroke="#7d4d19" stroke-width="5"/><circle cx="${570+rest}" cy="334" r="12" fill="#e8b452" stroke="#7d4d19" stroke-width="4"/>
</g>
<text x="62" y="458" fill="#d9e4e4" font-family="Inter,Arial" font-size="22">Footrest extension: ${length}/12 · Sit. Play. Belong.</text></svg>`;
}
