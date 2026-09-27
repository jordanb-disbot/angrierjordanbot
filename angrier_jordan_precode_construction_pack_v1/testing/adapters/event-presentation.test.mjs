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
test('wide event timelines use one-shot authoritative frames without external copy',async()=>{
 const coordinator=new DiscordEventsCoordinator({}, {},async()=>true);
 for(const kind of ['race','fight']){
  const racers=kind==='fight'?reviewMembers.slice(0,2):reviewMembers,plan=reviewPlans[kind],view={...common,type:kind,racers,...(kind==='fight'?{combat:fightSnapshot(plan,12000,racers)}:{motion:raceSnapshot(plan,8000)})},before=JSON.stringify(view);
  const result=await coordinator.payload(view,{timeline:{racers,startedAt:new Date(Date.now()+600000).toISOString(),[kind==='fight'?'fightPlan':'plan']:plan}}),buffer=result.files[0].attachment,meta=await sharp(buffer,{animated:true}).metadata();
  assert.equal(meta.format,'gif');assert.ok(meta.pages>1&&meta.pages<=401);assert.equal(meta.loop,1);assert.equal(meta.width,kind==='race'?480:1200);assert.ok(buffer.length<10*1024*1024);assert.deepEqual(result.embeds,[]);assert.equal(JSON.stringify(view),before);
  const nodes=result.components.flatMap(c=>c.toJSON().components);assert.equal(nodes.some(c=>c.type===10),false);
 }
});
test('Fight combat frames keep a stable canvas while escaped names and approved move logs update',()=>{
 const racers=reviewMembers.slice(0,2).map((r,i)=>({...r,name:i?'Alex':'<script>& Jordan'}));
 for(const elapsed of [0,3000,12000,22000]){const svg=renderFight({...common,type:'fight',racers,combat:fightSnapshot(reviewPlans.fight,elapsed,racers)});assert.match(svg,/width="440" height="790"/);assert.doesNotMatch(svg,/<script>/);assert.match(svg,/&lt;script&gt;&amp;/);}
});
import {rasterizeSvg} from '../../dist/packages/renderer/src/raster.js';
test('event typography uses bundled Space Grotesk and Inter rather than the retired event font pairing',async()=>{
 const glyphs=family=>rasterizeSvg(`<svg xmlns="http://www.w3.org/2000/svg" width="440" height="80"><text x="10" y="55" font-family="${family}" font-size="36">Angrier Jordan 123</text></svg>`);
 const [inter,space,poppins,cinzel]=await Promise.all(['Inter','Space Grotesk','Poppins','Cinzel'].map(glyphs));assert.notDeepEqual(inter,poppins);assert.notDeepEqual(space,cinzel);assert.notDeepEqual(space,inter);
 const svg=renderFight({...common,type:'fight',racers:reviewMembers.slice(0,2),combat:fightSnapshot(reviewPlans.fight,12000,reviewMembers.slice(0,2))});assert.match(svg,/font-family="Inter"/);assert.match(svg,/font-family="Space Grotesk"/);assert.doesNotMatch(svg,/Poppins|Cinzel/);
});
