import {readFileSync} from 'node:fs';
import type {RaceView} from './prisma-repository.js';
const escape=(s:string)=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const robots=new Map<number,string>();
const robot=(n:number)=>{if(!robots.has(n))robots.set(n,'data:image/png;base64,'+readFileSync(new URL(`../../../production/atomic_assets/race_fight/robo_fighter_${n}.png`,import.meta.url)).toString('base64'));return robots.get(n)!;};
const wrap=(s:string,max=38)=>{const result:string[]=[];let line='';for(const word of s.split(/\s+/)){if(line.length+word.length>max){result.push(line);line='';}line+=(line?' ':'')+word;}if(line)result.push(line);return result;};
/** Numeric HP, health fill and action text consume the same persisted combat beat. */
export function renderFight(view:RaceView){
 const hp=view.combat?.hp??[100,100],closed=view.state==='CLOSED',cancelled=view.state==='CANCELLED';
 const log=view.combat?.log??['Betting is open. Choose a fighter below.'];
 const lines=log.flatMap(text=>wrap(text)).slice(-9),height=450+lines.length*25;
 const fighters=view.racers.map((f,i)=>{const x=20+i*210,value=hp[i]??100;return`<rect x="${x}" y="99" width="190" height="236" rx="12" fill="${i?'#222333':'#102b30'}"/><text x="${x+95}" y="125" text-anchor="middle" font-size="17" font-weight="600" fill="#f2eee5">${escape(f.name.slice(0,19))}</text><image href="${robot(f.chair)}" x="${x+30}" y="137" width="130" height="130"/><text x="${x+95}" y="288" text-anchor="middle" font-size="21" font-weight="600" fill="#f2eee5">${value} HP</text><rect x="${x+14}" y="304" width="162" height="12" rx="6" fill="#364252"/><rect x="${x+14}" y="304" width="${162*value/100}" height="12" rx="6" fill="${i?'#d1af70':'#21c6a5'}"/>`;}).join('');
 const title=cancelled?'FIGHT CANCELLED':closed?'KNOCKOUT':'ROBO CHAIR FIGHT',subtitle=closed?`${view.racers.find(f=>f.userId===view.winnerId)?.name??'Winner'} wins`:cancelled?'All wagers refunded.':view.state==='OPEN'?'Two fighters. Equal odds.':'Combat live · betting locked';
 const footer=closed?view.result?.refunded?'Full refunds · no winning wagers':`Pool ${view.result?.pool??0} · Rake ${view.result?.rake??0}`:`Pool ${view.pool} Ottomans · 5% rake`;
 return`<svg xmlns="http://www.w3.org/2000/svg" width="440" height="${height}" viewBox="0 0 440 ${height}"><rect width="440" height="${height}" rx="16" fill="#091520"/><g font-family="Poppins"><text x="20" y="36" font-family="Cinzel" font-size="23" font-weight="700" fill="#e2c786">${title}</text><text x="20" y="70" font-size="17" fill="#e1e8ea">${escape(subtitle.slice(0,39))}</text>${fighters}<text x="20" y="367" font-size="14" font-weight="600" fill="#d9be7b">${closed?'FINAL EXCHANGE':'LATEST EXCHANGES'}</text>${lines.map((line,i)=>`<text x="20" y="${397+i*25}" font-size="18" fill="#e1e8ea">${escape(line)}</text>`).join('')}<text x="20" y="${height-18}" font-size="16" fill="#a8bac5">${escape(footer)}</text></g></svg>`;
}
