import type {RaceView} from './prisma-repository.js';
import {art,ink,lines,panel,shell,text} from './visual.js';
const mid='text-anchor="middle"';
const short=(s:string,n=22)=>s.length>n?s.slice(0,n-1)+'…':s;
const title=(x:number,y:number,s:string,size=26,color:string=ink.white)=>text(x,y,s,size,color,`${mid} font-family="Space Grotesk" font-weight="600"`);
/** Fixed landscape frame: saved positions only, no looping/restarting simulated sprint. */
export function renderWideRace(view:RaceView){
 const live=view.state==='LOCKED',closed=view.state==='CLOSED',cancelled=view.state==='CANCELLED';
 let body=title(480,40,'ANGRIER JORDAN · LIVE EVENTS',15,ink.teal)+title(480,82,closed?'Chair Race · Results':cancelled?'Chair Race · Cancelled':'Chair Race',36)+text(480,111,live?'THE SPRINT IS LIVE · BETTING LOCKED':closed?'THE LOUNGE HAS A NEW FRONT RUNNER':cancelled?'ALL WAGERS REFUNDED':'TAKE YOUR SEAT · BACK YOUR FAVOURITE',14,ink.warm,mid);
 if(live){
  body+=panel(24,132,912,390);
  body+=view.racers.map((r,i)=>{const y=140+i*62,p=view.motion?.rows.find(row=>row.userId===r.userId),progress=p?.progress??0;
   return title(137,y+23,short(r.name,18),19)+text(137,y+44,`PLACE ${p?.place??i+1}`,11,ink.warm,mid)+`<path d="M266 ${y+49}H868" stroke="#32565A" stroke-width="3"/><path d="M266 ${y+49}H${266+progress*6.02}" stroke="url(#rail)" stroke-width="3"/><path d="M868 ${y+4}V${y+51}" stroke="#F4C542" stroke-dasharray="4 4"/><image href="${art('race_chair',r.chair)}" x="${252+progress*5.4}" y="${y-3}" width="80" height="54"/>`+text(904,y+32,`${Math.floor(progress)}%`,13,ink.white,mid);
  }).join('');
 }else if(closed){
  const winner=view.racers.find(r=>r.userId===view.winnerId),ranked=[...view.racers].sort((a,b)=>(view.motion?.rows.find(r=>r.userId===a.userId)?.place??1)-(view.motion?.rows.find(r=>r.userId===b.userId)?.place??1));
  body+=panel(24,132,444,390,ink.gold)+`<ellipse cx="246" cy="383" rx="190" ry="45" fill="url(#lamp)"/><image href="${art('race_chair',winner?.chair??1)}" x="107" y="170" width="278" height="245"/>`+title(246,163,'THE WINNING CHAIR',14,ink.warm)+title(246,452,short(winner?.name??'Winner'),28)+text(246,486,'First across the line.',18,ink.white,mid)+panel(488,132,448,390)+title(712,169,'FINAL STANDINGS',17,ink.warm);
  body+=ranked.map((r,i)=>title(712,218+i*53,`${String(i+1).padStart(2,'0')}  ·  ${short(r.name)}`,22,i?ink.white:ink.gold)).join('');
 }else{
  // Six permanent bays keep the composition full and stable while members join.
  for(let i=0;i<6;i++){const r=view.racers[i],x=24+(i%3)*310,y=132+Math.floor(i/3)*198;
   body+=panel(x,y,292,192,r?ink.teal:ink.slate)+`<ellipse cx="${x+146}" cy="${y+143}" rx="111" ry="29" fill="url(#aura)"/><image href="${art('race_chair',r?.chair??i+1)}" x="${x+64}" y="${y+26}" width="164" height="131" opacity="${r?1:.4}"/>`+title(x+146,y+25,r?short(r.name,20):'An open seat',20,r?ink.white:ink.muted)+text(x+146,y+178,r?'EQUAL CHANCE TO WIN':cancelled?'UNTIL NEXT TIME':'JOIN USING THE CONTROLS BELOW',11,r?ink.warm:ink.muted,mid);
  }
 }
 body+=panel(24,538,912,58,ink.gold)+title(480,562,`${short(view.result?.pool??view.pool,28)} Ottomans · Total pool`,21)+text(480,583,closed?(view.result?.refunded?'FULL REFUND · NO RAKE':`RAKE ${view.result?.rake??0} OTTOMANS`):cancelled?'ALL WAGERS REFUNDED':'5% RAKE WHEN WINNING BETS EXIST · SIT. PLAY. BELONG.',11,ink.warm,mid);
 return shell(620,body,0,960);
}

export function renderWideFight(view:RaceView){
 const closed=view.state==='CLOSED',cancelled=view.state==='CANCELLED',live=view.state==='LOCKED',hp=view.combat?.hp??[100,100];
 let body=title(480,38,'ANGRIER JORDAN · LIVE EVENTS',15,ink.teal)+title(480,80,cancelled?'Fight cancelled':closed?'Robo Chair Fight · Result':'Robo Chair Fight',34)+text(480,109,cancelled?'ALL WAGERS REFUNDED':closed?'THE FINAL BELL':live?'COMBAT LIVE · BETTING LOCKED':'TWO CHAIRS · EQUAL ODDS · ONE WINNER',14,ink.warm,mid);
 body+=panel(24,130,584,390)+`<ellipse cx="316" cy="389" rx="269" ry="45" fill="#041B22" stroke="#C4A055"/><ellipse cx="316" cy="389" rx="250" ry="37" fill="none" stroke="#10B981" stroke-opacity=".45"/>`;
 body+=view.racers.map((f,i)=>{const x=170+i*291,value=hp[i]??100,win=closed&&f.userId===view.winnerId;return title(x,164,short(f.name,19),22)+`<image href="${art('robo_fighter',f.chair)}" x="${x-136}" y="186" width="272" height="220"/>`+title(x,439,`${value} HP`,25,win?ink.gold:ink.white)+`<rect x="${x-112}" y="455" width="224" height="12" rx="6" fill="#011318" stroke="#237877"/><rect x="${x-112}" y="455" width="${224*value/100}" height="12" rx="6" fill="${i?'url(#gold)':'url(#rail)'}"/>`+text(x,496,win?'WINNER':closed?'FIGHT COMPLETE':`FIGHTER ${i+1}`,12,ink.warm,mid);}).join('');
 body+=title(316,291,closed?'KO':'VS',24,ink.gold)+panel(628,130,308,390)+title(782,166,closed?'FINAL EXCHANGES':live?'LIVE COMBAT':'PLACE YOUR WAGER',17,ink.teal);
 const logs=(view.combat?.log??['Choose a fighter using the controls below.','Your selection locks after the first wager.']).slice(-2);
 let y=208;for(const log of logs){for(const line of lines(log,29).slice(0,4)){body+=text(782,y,short(line,32),17,ink.white,mid);y+=23;}y+=20;}
 body+=panel(24,538,912,58,ink.gold)+title(480,562,`${short(view.result?.pool??view.pool,28)} Ottomans · Total pool`,21)+text(480,583,cancelled||view.result?.refunded?'FULL REFUND · NO RAKE':closed?`RAKE ${view.result?.rake??0} OTTOMANS`:'5% RAKE WHEN WINNING BETS EXIST · SIT. PLAY. BELONG.',11,ink.warm,mid);
 return shell(620,body,0,960);
}
