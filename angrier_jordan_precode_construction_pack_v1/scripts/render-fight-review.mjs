import {reviewMembers,reviewPlans} from './event-review-fixtures.mjs';
import fs from 'node:fs';
import path from 'node:path';
import {DiscordEventsCoordinator} from '../dist/apps/bot/src/discord/events-coordinator.js';
import {planFight,fightSnapshot} from '../dist/packages/features-events/src/fight.js';
import {rasterizeSvg} from '../dist/packages/renderer/src/raster.js';
const output='review-gate-a/fight';fs.mkdirSync(output,{recursive:true});
const racers=reviewMembers.slice(0,2),plan=reviewPlans.fight,winnerId=plan.winnerId;
const base={type:'fight',id:'runtime-review-fight',guildId:'fixture-server',channelId:'fixture-main',messageId:'fixture-message',ownerId:racers[0].userId,state:'OPEN',expiresAt:new Date('2026-09-25T12:01:00Z'),extensionUsed:false,racers,pool:'1200',bets:[]};
const states={betting:base,combat:{...base,state:'LOCKED',combat:fightSnapshot(plan,plan.durationMs*.55,racers)},result:{...base,state:'CLOSED',combat:fightSnapshot(plan,plan.durationMs,racers),winnerId,result:{pool:'1200',rake:'60',payouts:{[winnerId]:'1140'},refunded:false,settlement:'PROPORTIONAL_PAYOUT'}}};
const coordinator=new DiscordEventsCoordinator({}, {},async()=>true);
const escape=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const wrap=(s,max)=>{const out=[];let line='';for(const word of s.split(/\s+/)){if(line.length+word.length>max){out.push(line);line='';}line+=(line?' ':'')+word;}if(line)out.push(line);return out;};
const manifest={source:'Actual DiscordEventsCoordinator.payload and production renderer, using explicit fixture members. Host frames are review renders, not live Discord screenshots.',timing:{bettingSeconds:30,hostExtensionSeconds:30,extensionUses:1,combatMs:plan.durationMs,beats:plan.beats.map(b=>({atMs:b.atMs,outcome:b.outcome,amount:b.amount,hp:b.hp}))},states:[]};
for(const [name,view] of Object.entries(states)){
 const payload=await coordinator.payload(view),embed=payload.embeds[0].toJSON(),card=payload.files[0].attachment;
 fs.writeFileSync(path.join(output,name+'-card.png'),card);
 const rows=payload.components.map(r=>r.toJSON().components.map(c=>({label:c.label,disabled:c.disabled??false,style:c.style,customId:c.custom_id})));
 fs.writeFileSync(path.join(output,name+'-payload.json'),JSON.stringify({embed,rows,mentions:payload.allowedMentions},null,2)+'\n');
 for(const size of ['desktop','mobile']){
  const mobile=size==='mobile',width=mobile?390:900,left=mobile?16:90,cardWidth=mobile?358:440,cardHeight=card.readUInt32BE(20)*cardWidth/440;
  const description=(embed.description??'').replace(/<t:\d+:R>/g,'in 30 seconds').replace(/<@([^>]+)>/g,(_,id)=>racers.find(r=>r.userId===id)?.name??id);
  const lines=wrap(description,mobile?38:53);const top=126+lines.length*22,height=Math.ceil(top+cardHeight+rows.length*46+66);
  let controls='';for(let r=0;r<rows.length;r++){const row=rows[r],buttonWidth=(cardWidth-(row.length-1)*8)/row.length;for(let i=0;i<row.length;i++){const b=row[i],x=left+i*(buttonWidth+8),y=top+cardHeight+12+r*46;controls+=`<rect x="${x}" y="${y}" width="${buttonWidth}" height="36" rx="5" fill="${b.style===1?'#5865f2':'#4e5058'}" opacity="${b.disabled?.5:1}"/><text x="${x+buttonWidth/2}" y="${y+23}" text-anchor="middle" font-size="${mobile?12:14}" fill="#ffffff" opacity="${b.disabled?.5:1}">${escape(b.label)}</text>`;}}
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="${width}" height="${height}" fill="#313338"/><g font-family="Poppins"><text x="${left}" y="28" font-size="12" fill="#b5bac1">RUNTIME REVIEW · FIXTURE MEMBERS · ${name.toUpperCase()}</text><text x="${left}" y="59" font-size="18" font-weight="600" fill="#f2f3f5">${escape(embed.author.name)}</text><rect x="${left+159}" y="44" width="30" height="18" rx="3" fill="#5865f2"/><text x="${left+164}" y="57" font-size="10" fill="white">APP</text><text x="${left}" y="89" font-size="19" font-weight="600" fill="#ffffff">${escape(embed.title)}</text>${lines.map((line,i)=>`<text x="${left}" y="${114+i*22}" font-size="14" fill="#dbdee1">${escape(line)}</text>`).join('')}<image href="data:image/png;base64,${card.toString('base64')}" x="${left}" y="${top}" width="${cardWidth}" height="${cardHeight}"/>${controls}<text x="${left}" y="${height-16}" font-size="11" fill="#b5bac1">Same production card and controls · no live Discord session</text></g></svg>`;
  fs.writeFileSync(path.join(output,`${name}-${size}.png`),await rasterizeSvg(svg));
 }
 manifest.states.push({state:name,card:name+'-card.png',desktop:name+'-desktop.png',mobile:name+'-mobile.png',payload:name+'-payload.json'});
}
fs.writeFileSync(path.join(output,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
fs.writeFileSync(path.join(output,'README.md'),'# Fight runtime review\n\nProduction Discord adapter and deterministic renderer executed with labeled fixture members. Host frames are desktop/mobile review renders, not live Discord screenshots. Approved move content is used unchanged. Betting is 30 seconds plus one host +30 extension. Combat uses the persisted authoritative plan. No acceptance, join, or replay controls.\n');
console.log('Fight runtime review renders written to '+output);
