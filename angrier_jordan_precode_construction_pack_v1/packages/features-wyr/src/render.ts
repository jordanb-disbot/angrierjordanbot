import type { WyrRuntimeSession, WyrResults } from './types.js';

const C={
  bg:'#0B1220',navy:'#0F1E3A',panel:'#111C2E',panel2:'#16253A',border:'#29435F',
  teal:'#14B8A6',cyan:'#22D3EE',gold:'#F5C542',warm:'#FFD880',text:'#F8FAFC',muted:'#94A3B8',
};
const esc=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]??c));
const wrap=(s:string,max:number)=>{const out:string[]=[];let line='';for(const w of s.split(/\s+/)){const n=line?`${line} ${w}`:w;if(n.length>max&&line){out.push(line);line=w;}else line=n;}if(line)out.push(line);return out;};
const text=(value:string,x:number,y:number,size:number,weight=500,fill=C.text,anchor:'start'|'middle'|'end'='start',family='Inter, Arial, sans-serif')=>`<text x="${x}" y="${y}" font-family="${family}" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}">${esc(value)}</text>`;
const tspanLines=(lines:string[],x:number,startY:number,size:number,lineHeight:number,weight=600,fill=C.text,anchor:'start'|'middle'|'end'='middle',family='Inter, Arial, sans-serif')=>lines.map((line,i)=>text(line,x,startY+i*lineHeight,size,weight,fill,anchor,family)).join('');
const frame=(body:string)=>`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675" viewBox="0 0 1200 675">
<defs>
  <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${C.bg}"/><stop offset="0.6" stop-color="${C.navy}"/><stop offset="1" stop-color="#07101D"/></linearGradient>
  <linearGradient id="teal" x1="0" x2="1"><stop stop-color="#0E7490"/><stop offset="1" stop-color="${C.cyan}"/></linearGradient>
  <linearGradient id="gold" x1="0" x2="1"><stop stop-color="#9A6A12"/><stop offset="1" stop-color="${C.warm}"/></linearGradient>
  <filter id="glow"><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
</defs>
<rect width="1200" height="675" rx="28" fill="url(#bg)"/>
<rect x="18" y="18" width="1164" height="639" rx="24" fill="none" stroke="${C.border}" stroke-width="2"/>
<!-- subdued lounge / chair scene; no logo or wordmark -->
<g opacity="0.24">
  <circle cx="1010" cy="125" r="36" fill="#C58A3B" opacity="0.22"/>
  <rect x="980" y="152" width="60" height="8" rx="4" fill="#C58A3B" opacity="0.24"/>
  <path d="M970 300c0-48 32-78 72-78h36c40 0 72 30 72 78v130h-180z" fill="#6C4930"/>
  <rect x="955" y="298" width="210" height="46" rx="22" fill="#7A5234"/>
  <rect x="980" y="335" width="160" height="118" rx="24" fill="#60402C"/>
  <path d="M1000 447l-18 86M1120 447l18 86" stroke="#7A5234" stroke-width="14" stroke-linecap="round"/>
  <path d="M925 315c-32-60-42-122-22-184M917 254c-56-28-74-63-74-108M934 235c38-45 58-94 52-145" stroke="#2D6B5C" stroke-width="10" stroke-linecap="round" fill="none"/>
</g>
${body}</svg>`;

const optionCard=(x:number,y:number,w:number,h:number,key:'A'|'B',label:string,votes?:number,total?:number)=>{
  const accent=key==='A'?C.cyan:C.gold;const gradient=key==='A'?'url(#teal)':'url(#gold)';
  const lines=wrap(label,30).slice(0,3);const pct=votes!==undefined&&total?Math.round(votes/total*100):undefined;
  return `<g><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="18" fill="${C.panel}" stroke="${accent}" stroke-width="2"/>
  ${text(key,x+28,y+38,18,800,accent,'start')}
  ${tspanLines(lines,x+w/2,y+52,22,29,650,C.text,'middle')}
  ${votes===undefined?'':`<rect x="${x+34}" y="${y+h-72}" width="${w-68}" height="16" rx="8" fill="#07101D" stroke="${accent}" stroke-opacity="0.65"/><rect x="${x+34}" y="${y+h-72}" width="${Math.max(8,(w-68)*(pct??0)/100)}" height="16" rx="8" fill="${gradient}" filter="url(#glow)"/>${text(`${pct??0}%`,x+w/2,y+h-26,30,800,C.text,'middle')}${text(`${votes} vote${votes===1?'':'s'}`,x+w/2,y+h-3,14,600,C.muted,'middle')}`}
  </g>`;
};

export function renderWyrOpen(session:WyrRuntimeSession,remainingSeconds:number):string{
  const total=session.data.durationSeconds+(session.extensionUsed?session.data.extensionSeconds:0);
  const ratio=Math.max(0,Math.min(1,remainingSeconds/Math.max(1,total)));
  return frame(`
    ${text('WOULD YOU RATHER',600,92,42,700,C.text,'middle','Space Grotesk, Arial, sans-serif')}
    ${text(session.data.category.toUpperCase(),600,126,15,700,C.gold,'middle')}
    ${tspanLines(wrap(session.data.question,62).slice(0,2),600,174,23,30,650,C.text,'middle')}
    ${optionCard(92,238,470,230,'A',session.data.optionA)}
    ${optionCard(638,238,470,230,'B',session.data.optionB)}
    <circle cx="600" cy="352" r="34" fill="#07101D" stroke="${C.gold}" stroke-width="2"/>${text('OR',600,361,19,800,C.warm,'middle')}
    ${text(`Voting closes in ${remainingSeconds}s`,92,523,18,650,C.text)}
    ${text(session.extensionUsed?'Extension used':`+${session.data.extensionSeconds}s available once`,1108,523,16,600,C.muted,'end')}
    <rect x="92" y="548" width="1016" height="14" rx="7" fill="#07101D"/><rect x="92" y="548" width="${1016*ratio}" height="14" rx="7" fill="url(#teal)"/>
    ${text('Choose with the buttons below this card in Discord.',600,612,15,500,C.muted,'middle')}
  `);
}

export function renderWyrResults(session:WyrRuntimeSession,results:WyrResults):string{
  const winner=results.winner==='NONE'?'No votes were cast.':results.winner==='TIE'?'The room is split.':`Most people chose: ${results.winner==='A'?session.data.optionA:session.data.optionB}`;
  return frame(`
    ${text('WOULD YOU RATHER',600,92,42,700,C.text,'middle','Space Grotesk, Arial, sans-serif')}
    ${text(`${session.data.category.toUpperCase()} • RESULTS`,600,126,15,700,C.gold,'middle')}
    ${tspanLines(wrap(session.data.question,62).slice(0,2),600,174,23,30,650,C.text,'middle')}
    ${optionCard(92,238,470,250,'A',session.data.optionA,results.A,results.total)}
    ${optionCard(638,238,470,250,'B',session.data.optionB,results.B,results.total)}
    <circle cx="600" cy="352" r="34" fill="#07101D" stroke="${C.gold}" stroke-width="2"/>${text('OR',600,361,19,800,C.warm,'middle')}
    <rect x="160" y="528" width="880" height="64" rx="16" fill="${C.panel2}" stroke="${results.winner==='TIE'||results.winner==='NONE'?C.border:C.gold}"/>
    ${text(winner,600,568,20,700,C.text,'middle')}
    ${text(`${results.total} total vote${results.total===1?'':'s'} • Play Again starts a fresh question`,600,626,15,500,C.muted,'middle')}
  `);
}
