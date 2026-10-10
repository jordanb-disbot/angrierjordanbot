import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import {renderRace} from '../../dist/packages/features-events/src/render.js';
import {renderFight} from '../../dist/packages/features-events/src/fight-render.js';
import {renderLine} from '../../dist/packages/features-special/src/render.js';
import {raceSnapshot} from '../../dist/packages/features-events/src/domain.js';
import {DiscordEventsCoordinator} from '../../dist/apps/bot/src/discord/events-coordinator.js';
import {DiscordSpecialCoordinator} from '../../dist/apps/bot/src/discord/special-coordinator.js';
import {reviewMembers,reviewPlans} from '../../scripts/event-review-fixtures.mjs';
const now=Date.parse('2100-01-01T00:00:00Z');
const base={id:'fixture',state:'OPEN',racers:reviewMembers,pool:'100',expiresAt:new Date(now+60000),extensionUsed:false};
const rows=p=>p.components.flatMap(c=>c.toJSON().components).filter(c=>c.type===1).map(c=>c.components);
test('cinematic frames contain branded waiting clocks and no redundant odds labels',()=>{
 for(const [render,type] of [[renderRace,'race'],[renderFight,'fight']]){
  const view={...base,type,racers:type==='fight'?reviewMembers.slice(0,2):reviewMembers};
  for(const remaining of [60000,30000,1000,0]){
   const svg=type==='race'?render(view,'wide',{waitingMs:remaining}):render(view,{waitingMs:remaining},'wide');
   assert.ok(svg.includes('width="1200" height="640"'));
   if(type==='fight')assert.ok(svg.includes('data-waiting-seconds="'+remaining/1000+'"'));else assert.match(svg,/UTC/);
   assert.ok(!svg.includes('EQUAL ODDS'));
  }
 }
 const line=renderLine({state:'CLOSED',ownerId:'fixture-0',members:reviewMembers.map(m=>({...m,status:'ready'})),elapsedMs:9000,durationMs:9000},9000,'wide');
 assert.ok(line.includes('width="1200" height="640"'));assert.ok(!/moment is ours/i.test(line));
});
test('saved race motion never resets and the winner reaches the marked finish',()=>{
 const plan=reviewPlans.race;let previous=Array(6).fill(-1);
 for(let i=0;i<=60;i++){
  const snapshot=raceSnapshot(plan,plan.durationMs*i/60),svg=renderRace({...base,state:'LOCKED',motion:snapshot},'wide');
  const positions=[...svg.matchAll(/data-race-progress="([^"]+)" data-race-nose="([^"]+)"/g)].map(m=>({progress:Number(m[1]),nose:Number(m[2])}));
  assert.equal(positions.length,6);positions.forEach((p,index)=>assert.ok(p.nose>=previous[index]));previous=positions.map(p=>p.nose);
  if(i===60){const winner=positions.find(p=>p.progress===100);assert.ok(winner);assert.equal(winner.nose,1090);assert.ok(svg.includes('FINISH LINE'));
  }
 }
});
test('Fight and Race entry cards are immediate static frames with live waiting details',async()=>{
 const c=new DiscordEventsCoordinator({}, {},async()=>true);
 for(const type of ['race','fight']){
  const p=await c.payload({...base,type,expiresAt:new Date(now+3000),racers:reviewMembers.slice(0,2)},{nowMs:now});
  const buffer=p.files[0].attachment,meta=await sharp(buffer,{animated:true}).metadata();
  assert.equal(meta.width,1200);assert.equal(meta.format,'png');assert.equal(meta.pages??1,1);
  assert.equal(buffer.indexOf('NETSCAPE'),-1);assert.equal(buffer.indexOf('ANIMEXTS'),-1);
  const text=p.components[0].toJSON().components.map(c=>c.content).join('\n');
  assert.match(text,new RegExp(`${type==='fight'?'FIGHT BETTING WINDOW':'RACE WAITING ROOM'} · 00:03 remaining`));
 }
});
test('event controls form balanced member/host/wager groups without changing custom IDs',async()=>{
 const c=new DiscordEventsCoordinator({}, {},async()=>true);
 for(const count of [1,2,4,5,6]){
  const groups=rows(await c.payload({...base,racers:reviewMembers.slice(0,count)},{animate:false,nowMs:now}));
  assert.ok(groups.every(r=>r.length>=2&&r.length<=3));assert.equal(groups.flat().filter(b=>b.custom_id.startsWith('event:bet:')).length,count);
 }
 const fight=rows(await c.payload({...base,type:'fight',racers:reviewMembers.slice(0,2)},{animate:false,nowMs:now}));
 assert.deepEqual(fight.map(r=>r.length),[2,2]);assert.ok(fight[0].every(b=>b.style===1));
 const line=rows(await new DiscordSpecialCoordinator({}, {},async()=>true).payload({...base,ownerId:'fixture-0',elapsedMs:0,remainingMs:60000,members:reviewMembers.map(m=>({...m,status:'ready'}))}));
 assert.deepEqual(line.map(r=>r.map(b=>b.label)),[['I’m In','I Need a Second'],['Start Countdown','+30 Seconds','Cancel Line']]);
});
test('a waiting render cannot overwrite an event that started during rasterization',async()=>{
 let reads=0;const edits=[],states=[],view={...base,id:'race',guildId:'g',channelId:'c',messageId:'m'};
 const c=new DiscordEventsCoordinator({publicView:async()=>({...view,state:++reads===1?'OPEN':'LOCKED'}),get:async()=>({state:'LOCKED',data:{racers:reviewMembers,plan:reviewPlans.race,startedAt:new Date(now).toISOString()}})}, {},async()=>true);
 c.payload=async(v,options)=>{states.push([v.state,!!options?.timeline]);return{state:v.state};};
 const client={user:{id:'bot'},channels:{fetch:async()=>({isTextBased:()=>true,messages:{fetch:async()=>({author:{id:'bot'},edit:async p=>edits.push(p.state)})}})}};
 await c.refresh(client,'race');assert.deepEqual(states,[['OPEN',false],['LOCKED',true]]);assert.deepEqual(edits,['LOCKED']);
});
