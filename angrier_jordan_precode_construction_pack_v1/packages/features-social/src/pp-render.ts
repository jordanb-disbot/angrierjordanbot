const esc=(value:string)=>value.replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]!));

/** Non-explicit Chairs visual for /pp: a playful recliner with an extending footrest. */
export function renderReclinerCheck(name:string,extension:number):string{
  const safe=esc(name).slice(0,80), length=Math.max(1,Math.min(12,extension)),rest=180+length*48;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="520" viewBox="0 0 1200 520">
<defs><linearGradient id="bg" x2="1" y2="1"><stop stop-color="#071b24"/><stop offset="1" stop-color="#172d35"/></linearGradient><linearGradient id="seat" x2="0" y2="1"><stop stop-color="#174b52"/><stop offset="1" stop-color="#0b292f"/></linearGradient><filter id="glow"><feGaussianBlur stdDeviation="7" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
<rect x="8" y="8" width="1184" height="504" rx="28" fill="url(#bg)" stroke="#c9a768" stroke-width="3"/>
<text x="62" y="72" fill="#c9a768" font-family="Inter,Arial" font-size="20" letter-spacing="4">ANGRIER JORDAN · CHAIR CHECK</text>
<text x="62" y="122" fill="#eef4f5" font-family="Space Grotesk,Arial" font-size="38" font-weight="700">${safe}'s recliner is ready</text>
<text x="62" y="158" fill="#9fc1c2" font-family="Inter,Arial" font-size="20">A comfortable, decidedly non-serious seat inspection.</text>
<g filter="url(#glow)"><path d="M245 365V225c0-62 48-104 108-104h112c59 0 106 43 106 104v140" fill="url(#seat)" stroke="#19a7a4" stroke-width="6"/><rect x="195" y="337" width="330" height="70" rx="28" fill="#123e45" stroke="#19a7a4" stroke-width="6"/><path d="M520 370h${rest}" stroke="#c9a768" stroke-width="26" stroke-linecap="round"/><path d="M520 370h${rest}" stroke="#e8c779" stroke-width="8" stroke-linecap="round"/><circle cx="195" cy="372" r="18" fill="#c9a768"/><circle cx="${520+rest}" cy="370" r="18" fill="#c9a768"/></g>
<text x="62" y="458" fill="#d9e4e4" font-family="Inter,Arial" font-size="22">Footrest extension: ${length}/12 · Sit. Play. Belong.</text></svg>`;
}
