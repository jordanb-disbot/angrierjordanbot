import fs from 'node:fs';
import path from 'node:path';
import {DiscordEventsCoordinator} from '../dist/apps/bot/src/discord/events-coordinator.js';
import {planRace,raceSnapshot} from '../dist/packages/features-events/src/domain.js';
import {rasterizeSvg} from '../dist/packages/renderer/src/raster.js';
const output='review-gate-a/race';fs.mkdirSync(output,{recursive:true});
const racers=['Jordan','Alex','Sam','Morgan','Taylor','Casey'].map((name,i)=>({userId:'fixture-'+i,name,chair:i+1}));
let seed=42;const random=max=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed%max;};
const plan=planRace(racers,random),winnerId=plan.winnerId;
const base={id:'runtime-review-race',guildId:'fixture-server',channelId:'fixture-main',messageId:'fixture-message',ownerId:racers[0].userId,state:'OPEN',expiresAt:new Date('2026-09-25T12:01:00Z'),extensionUsed:false,racers,pool:'2400',bets:[]};
const states={entry:{...base,racers:racers.slice(0,2),pool:'0'},betting:base,live:{...base,state:'LOCKED',motion:raceSnapshot(plan,plan.durationMs*.58)},result:{...base,state:'CLOSED',motion:raceSnapshot(plan,plan.durationMs),winnerId,result:{pool:'2400',rake:'120',payouts:{[winnerId]:'2280'},refunded:false,settlement:'PROPORTIONAL_PAYOUT'}}};
const coordinator=new DiscordEventsCoordinator({}, {},async()=>true);
const escape=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const wrap=(s,max)=>{const out=[];let line='';for(const word of s.split(/\s+/)){if(line.length+word.length>max){out.push(line);line='';}line+=(line?' ':'')+word;}if(line)out.push(line);return out;};
const manifest={source:'Actual DiscordEventsCoordinator.payload and production renderer, using explicit fixture members. Host frames are review renders, not live Discord screenshots.',timing:{entryAndBettingSeconds:60,hostExtensionSeconds:30,extensionUses:1,sprintMs:plan.durationMs},states:[]};
for(const [name,view] of Object.entries(states)){
 const payload=await coordinator.payload(view),embed=payload.embeds[0].toJSON(),card=payload.files[0].attachment;
 fs.writeFileSync(path.join(output,name+'-card.png'),card);
 const rows=payload.components.map(r=>r.toJSON().components.map(c=>({label:c.label,disabled:c.disabled??false,style:c.style,customId:c.custom_id})));
 fs.writeFileSync(path.join(output,name+'-payload.json'),JSON.stringify({embed,rows,mentions:payload.allowedMentions},null,2)+'\n');
 for(const size of ['desktop','mobile']){
  const mobile=size==='mobile',width=mobile?390:900,left=mobile?16:90,cardWidth=mobile?358:440,cardHeight=(170+view.racers.length*128)*cardWidth/440;
  const description=(embed.description??'').replace(/<t:\d+:R>/g,'in 1 minute').replace(/<@([^>]+)>/g,(_,id)=>racers.find(r=>r.userId===id)?.name??id);
  const lines=wrap(description,mobile?38:53);const top=126+lines.length*22,height=Math.ceil(top+cardHeight+rows.length*46+66);
  let controls='';for(let r=0;r<rows.length;r++){const row=rows[r],buttonWidth=(cardWidth-(row.length-1)*8)/row.length;for(let i=0;i<row.length;i++){const b=row[i],x=left+i*(buttonWidth+8),y=top+cardHeight+12+r*46;controls+=`<rect x="${x}" y="${y}" width="${buttonWidth}" height="36" rx="5" fill="${b.style===1?'#5865f2':'#4e5058'}" opacity="${b.disabled?.5:1}"/><text x="${x+buttonWidth/2}" y="${y+23}" text-anchor="middle" font-size="${mobile?12:14}" fill="#ffffff" opacity="${b.disabled?.5:1}">${escape(b.label)}</text>`;}}
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="${width}" height="${height}" fill="#313338"/><g font-family="Poppins"><text x="${left}" y="28" font-size="12" fill="#b5bac1">RUNTIME REVIEW · FIXTURE MEMBERS · ${name.toUpperCase()}</text><text x="${left}" y="59" font-size="18" font-weight="600" fill="#f2f3f5">${escape(embed.author.name)}</text><rect x="${left+159}" y="44" width="30" height="18" rx="3" fill="#5865f2"/><text x="${left+164}" y="57" font-size="10" fill="white">APP</text><text x="${left}" y="89" font-size="19" font-weight="600" fill="#ffffff">${escape(embed.title)}</text>${lines.map((line,i)=>`<text x="${left}" y="${114+i*22}" font-size="14" fill="#dbdee1">${escape(line)}</text>`).join('')}<image href="data:image/png;base64,${card.toString('base64')}" x="${left}" y="${top}" width="${cardWidth}" height="${cardHeight}"/>${controls}<text x="${left}" y="${height-16}" font-size="11" fill="#b5bac1">Same production card and controls · no live Discord session</text></g></svg>`;
  fs.writeFileSync(path.join(output,`${name}-${size}.png`),await rasterizeSvg(svg));
 }
 manifest.states.push({state:name,card:name+'-card.png',desktop:name+'-desktop.png',mobile:name+'-mobile.png',payload:name+'-payload.json'});
}
fs.writeFileSync(path.join(output,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
fs.writeFileSync(path.join(output,'README.md'),'# Race runtime review — partial Gate A preparation\n\nThese images execute the production Discord adapter and raster renderer with clearly identified fixture members. Desktop/mobile host frames are review renders, not live Discord screenshots. The same card and component rows are used in both.\n\nEntry and betting: 60 seconds; host extension: +30 seconds once; sprint: 15–20 seconds. A full race still accepts wagers until the deadline. One authoritative message is updated through the result, with no rematch or Play Again.\n\nPostgreSQL Race acceptance: 10 passed, including concurrent settlement, source-aware no-winning-bet refunds and restart recovery. Fight materials are not present; Gate A is not ready and no approval is requested yet.\n');
console.log('Race runtime review renders written to '+output);
