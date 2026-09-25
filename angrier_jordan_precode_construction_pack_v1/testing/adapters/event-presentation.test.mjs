import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import {DiscordEventsCoordinator} from '../../dist/apps/bot/src/discord/events-coordinator.js';
import {renderFight} from '../../dist/packages/features-events/src/fight-render.js';
import {renderRace} from '../../dist/packages/features-events/src/render.js';
import {reviewMembers,reviewPlans} from '../../scripts/event-review-fixtures.mjs';
import {fightSnapshot} from '../../dist/packages/features-events/src/fight.js';
import {raceSnapshot} from '../../dist/packages/features-events/src/domain.js';
const common={id:'visual',guildId:'g',channelId:'c',ownerId:'jordan',state:'LOCKED',extensionUsed:false,pool:'1200',bets:[]};
test('animated Discord attachments retain snapshot data and use bounded 20 fps loops',async()=>{
 const coordinator=new DiscordEventsCoordinator({}, {},async()=>true);
 for(const kind of ['race','fight']){
  const racers=kind==='fight'?reviewMembers.slice(0,2):reviewMembers,plan=reviewPlans[kind],view={...common,type:kind,racers,...(kind==='fight'?{combat:fightSnapshot(plan,12000,racers)}:{motion:raceSnapshot(plan,8000)})},before=JSON.stringify(view);
  const result=await coordinator.payload(view),buffer=result.files[0].attachment,meta=await sharp(buffer,{animated:true}).metadata();
  assert.equal(meta.format,'gif');assert.equal(meta.pages,24);assert.equal(meta.loop,0);assert.ok(meta.delay.every(n=>n===50));assert.equal(meta.width,440);assert.ok(buffer.length<2*1024*1024);assert.equal(result.embeds[0].toJSON().image.url,'attachment://event.gif');assert.equal(result.components.length,0);assert.equal(JSON.stringify(view),before);
  const first=await sharp(buffer,{page:0,pages:1}).raw().toBuffer(),later=await sharp(buffer,{page:6,pages:1}).raw().toBuffer();assert.notDeepEqual(first,later,'Cosmetic motion must render different frames');
  for(const phase of [0,.25,.5,.75]){const svg=kind==='fight'?renderFight(view,{phase}):renderRace(view,'compact',{phase});if(kind==='fight')for(const hp of view.combat.hp)assert.ok(svg.includes('>'+hp+' HP<'));else for(const row of view.motion.rows)assert.ok(svg.includes(Math.floor(row.progress)+'%'));}
 }
});
test('Fight combat frames keep a stable canvas while escaped names and approved move logs update',()=>{
 const racers=reviewMembers.slice(0,2).map((r,i)=>({...r,name:i?'Alex':'<script>& Jordan'}));
 for(const elapsed of [0,3000,12000,22000]){const svg=renderFight({...common,type:'fight',racers,combat:fightSnapshot(reviewPlans.fight,elapsed,racers)});assert.match(svg,/width="440" height="790"/);assert.doesNotMatch(svg,/<script>/);assert.match(svg,/&lt;script&gt;&amp;/);}
});
