import type {RaceView} from './prisma-repository.js';
import {art,footer,heading,ink,shell,text,type EventMotion} from './visual.js';
/** Presentation only. Recorded positions, places and winner are never inferred from the animation. */
export function renderRace(view:RaceView,_layout:'compact'|'wide'='compact',motion:EventMotion={}){
 const live=view.state==='LOCKED',closed=view.state==='CLOSED',cancelled=view.state==='CANCELLED',phase=motion.phase??0;
 const winner=view.racers.find(r=>r.userId===view.winnerId),height=closed?620:live?225+view.racers.length*105:235+Math.ceil(view.racers.length/2)*172;
 let body=heading(closed?'CHAIRS / OFFICIAL RESULT':live?'CHAIRS / SPRINT IN PROGRESS':'CHAIRS / THE STARTING LINE',cancelled?'Race cancelled':closed?'A seat above the rest':'Chair Race',cancelled?'All wagers refunded.':closed?'One sprint. One winning seat.':live?'One sprint. Equal odds. Betting locked.':'Choose your chair. Back your favourite.');
 body+=text(24,127,closed?'FINAL STANDINGS':`${view.racers.length} / 6 RACERS`,11,closed?ink.warm:ink.teal,'letter-spacing="1.4" font-weight="600"')+text(416,127,closed?'RACE COMPLETE':live?'LIVE':'60s ENTRY + BETTING',11,ink.muted,'text-anchor="end"');
 if(closed){
  body+=`<rect x="20" y="144" width="400" height="205" rx="12" fill="url(#glass)" stroke="#FFD880" stroke-opacity=".5"/><ellipse cx="322" cy="305" rx="87" ry="23" fill="url(#lamp)"/><image href="${art('race_chair',winner?.chair??1)}" x="226" y="150" width="180" height="187"/>`+text(38,180,'WINNER',11,ink.warm,'letter-spacing="2"')+text(38,222,winner?.name.slice(0,12)??'Winner',25,ink.white,'font-weight="600"')+text(38,254,'First across the line.',13,ink.muted)+text(38,316,'01',42,ink.warm,'font-family="Cinzel"');
  const ranked=[...view.racers].sort((a,b)=>(view.motion?.rows.find(r=>r.userId===a.userId)?.place??1)-(view.motion?.rows.find(r=>r.userId===b.userId)?.place??1));
  body+=ranked.map((r,i)=>{const x=28+(i%2)*210,y=378+Math.floor(i/2)*49;return text(x,y,String(i+1).padStart(2,'0'),12,i?ink.muted:ink.warm)+text(x+30,y,r.name.slice(0,14),16,ink.white);}).join('');
 }else if(live){
  body+=view.racers.map((r,i)=>{const y=143+i*105,p=view.motion?.rows.find(p=>p.userId===r.userId),progress=p?.progress??0,bob=Math.sin(phase*2*Math.PI+i)*1.4;
   return `<rect x="20" y="${y}" width="400" height="96" rx="9" fill="url(#glass)" stroke="#354357"/>`+text(33,y+25,String(p?.place??i+1).padStart(2,'0'),12,ink.teal)+text(62,y+25,r.name.slice(0,24),17,ink.white,'font-weight="600"')+`<path d="M45 ${y+83}H365" stroke="#344357" stroke-width="2"/><path d="M45 ${y+83}H${45+progress*3.2}" stroke="url(#rail)" stroke-width="2"/>${[0,1,2,3,4].map(j=>`<path d="M${35+((j*70-phase*350+700)%350)} ${y+72}h16" stroke="#14B8A6" stroke-opacity=".15"/>`).join('')}<path d="M365 ${y+39}V${y+83}" stroke="#FFD880" stroke-dasharray="3 3"/><image href="${art('race_chair',r.chair)}" x="${32+progress*2.78}" y="${y+26+bob}" width="62" height="61"/>`+text(405,y+76,`${Math.floor(progress)}%`,12,ink.muted,'text-anchor="end"');}).join('');
 }else{
  body+=view.racers.map((r,i)=>{const x=20+(i%2)*205,y=145+Math.floor(i/2)*172;return `<rect x="${x}" y="${y}" width="195" height="160" rx="11" fill="url(#glass)" stroke="#354357"/><ellipse cx="${x+97}" cy="${y+127}" rx="64" ry="13" fill="url(#aura)"/><image href="${art('race_chair',r.chair)}" x="${x+47}" y="${y+30}" width="102" height="105"/>`+text(x+12,y+24,String(i+1).padStart(2,'0'),11,ink.teal)+text(x+98,y+24,r.name.slice(0,14),16,ink.white,'text-anchor="middle" font-weight="600"')+text(x+98,y+145,'EQUAL ODDS',9,ink.muted,'text-anchor="middle" letter-spacing="1.6"');}).join('');
 }
 body+=footer(height-55,view.result?.pool??view.pool,closed?view.result?.refunded?'FULL REFUND · NO RAKE':`RAKE ${view.result?.rake??0}`:'5% RAKE');return shell(height,body);
}
