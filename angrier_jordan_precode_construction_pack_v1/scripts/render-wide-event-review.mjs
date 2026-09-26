import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {reviewMembers as racers,reviewPlans} from './event-review-fixtures.mjs';
import {raceSnapshot} from '../dist/packages/features-events/src/domain.js';
import {fightSnapshot} from '../dist/packages/features-events/src/fight.js';
import {DiscordEventsCoordinator} from '../dist/apps/bot/src/discord/events-coordinator.js';
import {DiscordSpecialCoordinator} from '../dist/apps/bot/src/discord/special-coordinator.js';
const output='review-event-polish';fs.mkdirSync(output,{recursive:true});
const events=new DiscordEventsCoordinator({}, {},async()=>true),special=new DiscordSpecialCoordinator({}, {},async()=>true);
const base={id:'fixture',guildId:'fixture',channelId:'fixture',messageId:'fixture',ownerId:racers[0].userId,expiresAt:new Date('2026-09-26T12:01:00Z'),extensionUsed:false,cancelReason:'Event cancelled. All wagers refunded.',racers,pool:'2400',bets:[]};
const manifest={source:'Deterministic production payloads with fixture members. NOT live Discord screenshots.',approval:'Pending owner live review',files:[]};
for(const feature of ['race','fight','line'])for(const state of ['OPEN','LOCKED','CLOSED','CANCELLED']){
 let view={...base,state,type:feature};
 if(feature==='line')view={...view,state:state==='LOCKED'?'SETTLING':state,durationMs:9000,elapsedMs:state==='LOCKED'?0:9000,remainingMs:60000,members:racers.map((r,i)=>({...r,status:i%3?'ready':'waiting'}))};
 else{const plan=reviewPlans[feature],elapsed=state==='CLOSED'?plan.durationMs:plan.durationMs*.58;view={...view,racers:feature==='fight'?racers.slice(0,2):racers,...(feature==='fight'?{combat:state==='OPEN'?undefined:fightSnapshot(plan,elapsed,racers.slice(0,2))}:{motion:raceSnapshot(plan,elapsed)}),...(state==='CLOSED'?{winnerId:plan.winnerId,result:{pool:'2400',rake:'120',refunded:false}}:{})};}
 const payload=await (feature==='line'?special:events).payload(view),buffer=payload.files[0].attachment,file=feature+'-'+state.toLowerCase()+(state==='LOCKED'?'.gif':'.png');
 fs.writeFileSync(output+'/'+file,buffer);manifest.files.push({file,sha256:createHash('sha256').update(buffer).digest('hex'),controls:payload.components.flatMap(r=>r.toJSON().components??[]).filter(c=>c.type===1).flatMap(r=>r.components.map(c=>c.label))});
}
fs.writeFileSync(output+'/manifest.json',JSON.stringify(manifest,null,2)+'\n');
fs.writeFileSync(output+'/index.html','<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>AJ wide event fixtures</title><style>body{background:#0b1220;color:#e6eaf0;font:16px system-ui;margin:24px}main{max-width:960px;margin:auto}img{width:100%;height:auto}article{margin-bottom:32px}small{color:#a4cfc8}</style><main><h1>Wide event review</h1><p>Fixture renders · not live Discord screenshots · owner review pending.</p>'+manifest.files.map(f=>'<article><h2>'+f.file+'</h2><img src="'+f.file+'"><p>Native Discord controls: '+(f.controls.join(' · ')||'None')+'</p></article>').join('')+'</main>');
console.log('Generated 12 wide event fixture renders.');
