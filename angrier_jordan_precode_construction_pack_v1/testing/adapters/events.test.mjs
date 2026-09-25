import test from 'node:test';import assert from 'node:assert/strict';
import {DiscordEventsCoordinator} from '../../dist/apps/bot/src/discord/events-coordinator.js';
import {renderRace} from '../../dist/packages/features-events/src/render.js';
import {planRace,raceSnapshot} from '../../dist/packages/features-events/src/domain.js';
const forbidden=new Proxy({},{get:()=>()=>{throw new Error('Repository must not be reached');}});
const config=enabled=>({get:async(_g,k)=>k==='features.race'?enabled:k==='channels.main_chat'?'main':null});
const interaction=()=>({guildId:'g',guild:{},channelId:'main',user:{id:'member'},customId:'event:join:round',calls:[],deferred:false,isButton:()=>true,isModalSubmit:()=>false,reply:async function(p){this.calls.push(p)},editReply:async function(p){this.calls.push(p)},deferReply:async function(){this.deferred=true}});
test('event flag and containment block stale controls before repository access',async()=>{for(const enabled of [false,true]){const i=interaction();await new DiscordEventsCoordinator(forbidden,config(enabled),async()=>false).handle(i);assert.match(i.calls[0].content,enabled?/restricted/:/not enabled/);}});
test('event controls are limited to configured main chat',async()=>{const i=interaction();i.channelId='bot';await new DiscordEventsCoordinator(forbidden,config(true),async()=>true).handle(i);assert.match(i.calls[0].content,/main chat/);});
test('unauthorized special trigger is deleted silently before any session starts',async()=>{
 const calls=[],message={content:'!race',author:{id:'member',bot:false},guildId:'g',guild:{members:{fetch:async()=>({roles:{cache:new Map()}})}},channelId:'main',delete:async()=>calls.push('deleted')};
 const settings={get:async(_g,k)=>k==='channels.main_chat'?'main':k==='special_commands.enabled'?true:k==='special_commands.access_roles'?{'!race':['staff']}:true};await new DiscordEventsCoordinator(forbidden,settings,async()=>true).message(message);assert.deepEqual(calls,['deleted']);
});
test('public race payload uses production raster, private wager buttons and no replay controls',async()=>{
 const racers=[{userId:'1',name:'Chair One',chair:1},{userId:'2',name:'Chair Two',chair:2}],view={id:'round',guildId:'g',channelId:'main',messageId:'m',ownerId:'1',state:'OPEN',expiresAt:new Date('2026-09-25T12:01:00Z'),extensionUsed:false,racers,pool:'100',bets:[]};
 const coordinator=new DiscordEventsCoordinator(forbidden,config(true),async()=>true),payload=await coordinator.payload(view);const controls=payload.components.flatMap(row=>row.toJSON().components);assert.equal(controls.filter(c=>c.custom_id.startsWith('event:bet:')).length,2);assert.equal(controls.filter(c=>c.label==='Join Race').length,1);assert.ok(controls.every(c=>!/(Again|Rematch)/.test(c.label)));assert.equal(payload.embeds[0].toJSON().author.name,'Angrier Jordan');assert.ok(payload.files[0].attachment.length>1000);
 const closed=await coordinator.payload({...view,state:'CLOSED',winnerId:'1',result:{pool:'100',rake:'5',payouts:{'1':'95'},refunded:false,settlement:'PROPORTIONAL_PAYOUT'}});assert.equal(closed.components.length,0);
 const plan=planRace(racers,()=>0),motion=raceSnapshot(plan,7500),svg=renderRace({...view,state:'LOCKED',motion});assert.match(svg,/width="440"/);assert.doesNotMatch(svg,/="NaN"/);for(const r of motion.rows)assert.ok(svg.includes(Math.floor(r.progress)+'%'));
});
