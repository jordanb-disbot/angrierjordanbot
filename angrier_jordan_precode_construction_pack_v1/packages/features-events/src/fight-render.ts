import type {RaceView} from './prisma-repository.js';
import {art,footer,heading,ink,lines,shell,text,type EventMotion} from './visual.js';
/** HP labels, bars and combat log share one authoritative saved beat; ambient motion is cosmetic. */
export function renderFight(view:RaceView,motion:EventMotion={}){
 const hp=view.combat?.hp??[100,100],closed=view.state==='CLOSED',cancelled=view.state==='CANCELLED',live=view.state==='LOCKED',phase=motion.phase??0;
 const logs=view.combat?.log??['Choose a fighter below to place a private wager.'],wrapped=logs.map(s=>lines(s,37)),logHeight=255,height=790;
 const winner=view.racers.find(f=>f.userId===view.winnerId);
 let body=heading(closed?'CHAIRS / OFFICIAL RESULT':live?'CHAIRS / ARENA LIVE':'CHAIRS / THE LOUNGE ARENA',cancelled?'Fight cancelled':closed?'Knockout':'Robo Chair Fight',cancelled?'All wagers refunded.':closed?`${winner?.name??'Winner'} wins`.slice(0,37):live?'Combat live. Betting is locked.':'Two fighters. One winner. Equal odds.');
 body+=`<path d="M24 322 220 280 416 322 220 362Z" fill="#0F1E3A" stroke="#64748b" stroke-opacity=".4"/><ellipse cx="220" cy="324" rx="177" ry="25" fill="none" stroke="#14B8A6" stroke-opacity="${.18+Math.sin(phase*Math.PI)*.08}"/><path d="M60 327H380M95 345H345" stroke="#14B8A6" stroke-opacity=".12"/>`;
 body+=view.racers.map((f,i)=>{const x=24+i*210,value=hp[i]??100,win=closed&&f.userId===view.winnerId,bob=live?Math.sin(phase*2*Math.PI+i)*1.6:0;
 return `<rect x="${x}" y="120" width="182" height="43" rx="7" fill="url(#glass)" stroke="${win?ink.warm:'#354357'}"/>`+text(x+91,147,f.name.slice(0,15),18,ink.white,'text-anchor="middle" font-weight="600"')+`<image href="${art('robo_fighter',f.chair)}" x="${x-2}" y="${163+bob}" width="190" height="183"/>`+text(x+91,372,`${value} HP`,20,value===0?ink.muted:ink.white,'text-anchor="middle" font-weight="600"')+`<rect x="${x+10}" y="385" width="162" height="9" rx="4.5" fill="#1E293B"/><rect x="${x+10}" y="385" width="${162*value/100}" height="9" rx="4.5" fill="${i?'url(#gold)':'url(#rail)'}"/>`+text(x+91,416,win?'WINNER':closed?'FIGHT COMPLETE':`FIGHTER ${String(i+1).padStart(2,'0')}`,10,win?ink.warm:ink.muted,'text-anchor="middle" letter-spacing="1.4"');}).join('');
 body+=`<circle cx="220" cy="245" r="20" fill="#0B1220" stroke="#64748b" stroke-opacity=".5"/>`+text(220,251,closed?'KO':'VS',13,ink.warm,'text-anchor="middle" font-weight="600"');
 body+=`<rect x="20" y="437" width="400" height="${logHeight+26}" rx="10" fill="url(#glass)" stroke="#354357"/>`;
 let y=463;wrapped.forEach((rows,i)=>{body+=`<rect x="32" y="${y-13}" width="3" height="${rows.length*24-5}" rx="1.5" fill="${i===wrapped.length-1?ink.teal:ink.slate}"/>`;rows.forEach(line=>{body+=text(45,y,line,17,i===wrapped.length-1?ink.white:ink.muted);y+=24;});y+=15;});
 body+=footer(height-53,view.result?.pool??view.pool,closed?view.result?.refunded?'FULL REFUND · NO RAKE':`RAKE ${view.result?.rake??0}`:'5% RAKE');return shell(height,body);
}
