import type {RaceView} from './prisma-repository.js';
import {art,footer,heading,ink,panel,shell,text,type EventMotion} from './visual.js';
/** Visual state consumes saved standings; lighting and suspension never change progress. */
export function renderRace(view:RaceView,_layout:'compact'|'wide'='compact',motion:EventMotion={}){
 const live=view.state==='LOCKED',closed=view.state==='CLOSED',cancelled=view.state==='CANCELLED',phase=motion.phase??0;
 const winner=view.racers.find(r=>r.userId===view.winnerId),height=closed?650:live?244+view.racers.length*104:252+Math.ceil(view.racers.length/2)*184;
 let body=heading(closed?'LIVE EVENTS / OFFICIAL RESULT':live?'LIVE EVENTS / SPRINT IN PROGRESS':'LIVE EVENTS / BETTING OPEN',cancelled?'Race cancelled':closed?'Race results':'Chair Race',cancelled?'All wagers refunded.':closed?'The lounge has a new front runner.':live?'One sprint. Equal odds. Betting locked.':'Take your seat. Back your favourite.');
 body+=text(23,142,closed?'FINAL STANDINGS':`${view.racers.length} / 6 RACERS`,11,ink.warm,'font-family="Space Grotesk" font-weight="600" letter-spacing="1"')+text(418,142,closed?'SPRINT COMPLETE':live?'LIVE':'60s ENTRY + BETTING',11,'#ACD9D5','text-anchor="end"');
 if(closed){
  body+=panel(18,158,404,237,ink.gold)+`<ellipse cx="311" cy="348" rx="97" ry="32" fill="url(#lamp)"/><image href="${art('race_chair',winner?.chair??1)}" x="215" y="181" width="190" height="198"/>`+text(34,198,'WINNER',12,ink.warm,'font-family="Space Grotesk" letter-spacing="2"')+text(34,235,winner?.name.slice(0,12)??'Winner',27,ink.white,'font-family="Space Grotesk" font-weight="700"')+text(34,264,'First across the line.',13,'#C3D7D3')+text(34,360,'01',45,ink.gold,'font-family="Space Grotesk" font-weight="600"');
  const ranked=[...view.racers].sort((a,b)=>(view.motion?.rows.find(r=>r.userId===a.userId)?.place??1)-(view.motion?.rows.find(r=>r.userId===b.userId)?.place??1));
  body+=panel(18,408,404,135,ink.slate)+ranked.map((r,i)=>{const x=31+(i%2)*205,y=437+Math.floor(i/2)*42;return text(x,y,String(i+1).padStart(2,'0'),12,i?ink.muted:ink.warm)+text(x+28,y,r.name.slice(0,14),16,ink.white);}).join('');
 }else if(live){
  body+=view.racers.map((r,i)=>{const y=157+i*104,p=view.motion?.rows.find(p=>p.userId===r.userId),progress=p?.progress??0,bob=Math.sin(phase*2*Math.PI+i)*.6;
   return panel(18,y,404,96,'#247473')+text(31,y+25,String(p?.place??i+1).padStart(2,'0'),12,ink.warm,'font-weight="600"')+text(59,y+25,r.name.slice(0,24),17,ink.white,'font-weight="600"')+`<path d="M43 ${y+83}H367" stroke="#295659" stroke-width="3"/><path d="M43 ${y+83}H${43+progress*3.24}" stroke="url(#rail)" stroke-width="3"/>${[0,1,2,3].map(j=>`<path d="M${40+((j*80-phase*320+640)%320)} ${y+74}h14" stroke="#64EACF" stroke-opacity=".1"/>`).join('')}<path d="M367 ${y+40}V${y+83}" stroke="#F4C542" stroke-dasharray="3 3"/><image href="${art('race_chair',r.chair)}" x="${31+progress*2.7}" y="${y+30+bob}" width="70" height="53"/>`+text(408,y+75,`${Math.floor(progress)}%`,12,ink.white,'text-anchor="end"');}).join('');
 }else{
  body+=view.racers.map((r,i)=>{const x=18+(i%2)*207,y=158+Math.floor(i/2)*184;return panel(x,y,197,173,i===0?ink.teal:'#3D686B')+`<ellipse cx="${x+99}" cy="${y+132}" rx="73" ry="18" fill="url(#aura)"/><image href="${art('race_chair',r.chair)}" x="${x+28}" y="${y+31}" width="142" height="113"/>`+text(x+12,y+23,String(i+1).padStart(2,'0'),11,ink.warm)+text(x+100,y+24,r.name.slice(0,14),17,ink.white,'text-anchor="middle" font-family="Space Grotesk" font-weight="600"')+text(x+99,y+159,'EQUAL CHANCE TO WIN',9,'#B0DDD2','text-anchor="middle" letter-spacing="1"');}).join('');
 }
 body+=footer(height-55,view.result?.pool??view.pool,closed?view.result?.refunded?'FULL REFUND · NO RAKE':`RAKE ${view.result?.rake??0}`:'5% RAKE');return shell(height,body,phase);
}
