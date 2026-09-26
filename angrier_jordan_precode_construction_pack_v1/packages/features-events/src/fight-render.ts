import {renderWideFight} from './wide-render.js';
import type {RaceView} from './prisma-repository.js';
import {art,footer,heading,ink,lines,panel,shell,text,type EventMotion} from './visual.js';
/** Saved HP and move logs are authoritative; visual breathing never changes combat. */
export function renderFight(view:RaceView,motion:EventMotion={},layout:'compact'|'wide'='compact'){
 if(layout==='wide')return renderWideFight(view);
 const hp=view.combat?.hp??[100,100],closed=view.state==='CLOSED',cancelled=view.state==='CANCELLED',live=view.state==='LOCKED',phase=motion.phase??0,height=790;
 const logs=view.combat?.log??['Choose a fighter below. Your wager stays private.'],wrapped=logs.map(s=>lines(s,39));
 const winner=view.racers.find(f=>f.userId===view.winnerId);
 let body=heading(closed?'LIVE EVENTS / OFFICIAL RESULT':live?'LIVE EVENTS / COMBAT IN PROGRESS':'LIVE EVENTS / BETTING OPEN',cancelled?'Fight cancelled':closed?'Knockout':'Robo Chair Fight',cancelled?'All wagers refunded.':closed?`${winner?.name??'Winner'} wins`.slice(0,37):live?'Combat is live. Betting is locked.':'Two chairs. Equal odds. One winner.');
 body+=`<ellipse cx="220" cy="350" rx="184" ry="31" fill="#02151a" opacity=".62"/><ellipse cx="220" cy="350" rx="178" ry="28" fill="none" stroke="#F4C542" stroke-opacity=".45"/><ellipse cx="220" cy="350" rx="165" ry="24" fill="none" stroke="#12CCB0" stroke-opacity=".22"/>`;
 body+=view.racers.map((f,i)=>{const x=18+i*210,value=hp[i]??100,win=closed&&f.userId===view.winnerId,bob=live?Math.sin(phase*2*Math.PI+i)*.65:0;return panel(x,132,194,41,win?ink.gold:ink.slate)+text(x+97,159,f.name.slice(0,17),18,ink.white,'text-anchor="middle" font-family="Space Grotesk" font-weight="600"')+`<image href="${art('robo_fighter',f.chair)}" x="${x-5}" y="${178+bob}" width="204" height="174"/>`+text(x+97,383,`${value} HP`,21,value===0?ink.muted:ink.white,'text-anchor="middle" font-family="Space Grotesk" font-weight="700"')+`<rect x="${x+16}" y="398" width="162" height="12" rx="6" fill="#011318" stroke="#237877"/><rect x="${x+16}" y="398" width="${162*value/100}" height="12" rx="6" fill="${i?'url(#gold)':'url(#rail)'}"/>`+text(x+97,431,win?'WINNER':closed?'FIGHT COMPLETE':`FIGHTER ${String(i+1).padStart(2,'0')}`,10,win?ink.warm:ink.white,'text-anchor="middle" letter-spacing="1"');}).join('');
 body+=`<circle cx="220" cy="254" r="20" fill="#03171D" stroke="#F4C542"/>`+text(220,260,closed?'KO':'VS',14,ink.warm,'text-anchor="middle" font-family="Space Grotesk" font-weight="700"');
 body+=panel(18,450,404,252,ink.slate)+text(32,476,closed?'FINAL EXCHANGES':live?'LIVE COMBAT':'PLACE YOUR WAGER',11,'#83E8D0','font-family="Space Grotesk" font-weight="600" letter-spacing="1.2"');
 let y=505;wrapped.forEach((rows,i)=>{body+=`<rect x="32" y="${y-12}" width="3" height="${rows.length*22-5}" rx="1.5" fill="${i===wrapped.length-1?ink.emerald:'#38595E'}"/>`;rows.forEach(line=>{body+=text(44,y,line,16,i===wrapped.length-1?ink.white:'#B7CFCF');y+=22;});y+=12;});
 body+=footer(height-53,view.result?.pool??view.pool,closed?view.result?.refunded?'FULL REFUND · NO RAKE':`RAKE ${view.result?.rake??0}`:'5% RAKE');return shell(height,body,phase);
}
