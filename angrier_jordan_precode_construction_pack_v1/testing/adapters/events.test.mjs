import test from 'node:test';import assert from 'node:assert/strict';
import {DiscordEventsCoordinator} from '../../dist/apps/bot/src/discord/events-coordinator.js';
import {renderRace} from '../../dist/packages/features-events/src/render.js';
import {planFight} from '../../dist/packages/features-events/src/fight.js';
import {rasterizeTimeline} from '../../dist/packages/renderer/src/raster.js';
import {planRace,raceSnapshot} from '../../dist/packages/features-events/src/domain.js';
import {MessageFlags,Collection} from 'discord.js';
const nested=payload=>payload.components.flatMap(c=>c.toJSON().components);
const controlsOf=payload=>nested(payload).filter(c=>c.type===1).flatMap(c=>c.components);
const nativeText=payload=>nested(payload).filter(c=>c.type===10).map(c=>c.content).join('\n');
const forbidden=new Proxy({},{get:()=>()=>{throw new Error('Repository must not be reached');}});
const config=enabled=>({get:async(_g,k)=>k==='features.race'?enabled:k==='channels.main_chat'?'main':null});
const interaction=()=>({guildId:'g',guild:{},channelId:'main',user:{id:'member'},customId:'event:join:round',calls:[],deferred:false,isButton:()=>true,isModalSubmit:()=>false,reply:async function(p){this.calls.push(p)},editReply:async function(p){this.calls.push(p)},deferReply:async function(){this.deferred=true},deferUpdate:async function(){this.deferred=true},followUp:async function(p){this.calls.push(p)}});
test('event flag and containment block stale controls before repository access',async()=>{for(const enabled of [false,true]){const i=interaction();await new DiscordEventsCoordinator(forbidden,config(enabled),async()=>false).handle(i);assert.match(i.calls[0].content,enabled?/restricted/:/not enabled/);}});
test('event controls are limited to configured main chat',async()=>{const i=interaction();i.channelId='bot';await new DiscordEventsCoordinator(forbidden,config(true),async()=>true).handle(i);assert.match(i.calls[0].content,/main chat/);});
test('unauthorized special trigger is deleted silently before any session starts',async()=>{
 const calls=[],message={content:'!race',author:{id:'member',bot:false},guildId:'g',guild:{members:{fetch:async()=>({roles:{cache:new Map()}})}},channelId:'main',delete:async()=>calls.push('deleted')};
 const settings={get:async(_g,k)=>k==='channels.main_chat'?'main':k==='special_commands.enabled'?true:k==='special_commands.access_roles'?{'!race':['staff']}:true};await new DiscordEventsCoordinator(forbidden,settings,async()=>true).message(message);assert.deepEqual(calls,['deleted']);
});
test('public race payload uses production raster, private wager buttons and no replay controls',async()=>{
 const racers=[{userId:'1',name:'Chair One',chair:1},{userId:'2',name:'Chair Two',chair:2}],view={id:'round',guildId:'g',channelId:'main',messageId:'m',ownerId:'1',state:'OPEN',expiresAt:new Date('2026-09-25T12:01:00Z'),extensionUsed:false,racers,pool:'100',bets:[]};
 const coordinator=new DiscordEventsCoordinator(forbidden,config(true),async()=>true),payload=await coordinator.payload(view);const controls=controlsOf(payload);assert.equal(controls.filter(c=>c.custom_id.startsWith('event:bet:')).length,2);assert.equal(controls.filter(c=>c.label==='Join Race').length,1);assert.ok(controls.every(c=>!/(Again|Rematch)/.test(c.label)));assert.equal(payload.flags,MessageFlags.IsComponentsV2);assert.deepEqual(payload.embeds,[]);assert.equal(payload.content,null);assert.equal(nested(payload).filter(c=>c.type===12).length,1);assert.ok(payload.files[0].attachment.length>1000);
 assert.equal(nativeText(payload),'');
 const closed=await coordinator.payload({...view,state:'CLOSED',winnerId:'1',result:{pool:'100',rake:'5',payouts:{'1':'95'},refunded:false,settlement:'PROPORTIONAL_PAYOUT'}});assert.equal(controlsOf(closed).length,0);assert.equal(nativeText(closed),'');
 const plan=planRace(racers,()=>0),motion=raceSnapshot(plan,7500),svg=renderRace({...view,state:'LOCKED',motion});assert.match(svg,/width="440"/);assert.doesNotMatch(svg,/="NaN"/);for(const r of motion.rows)assert.ok(svg.includes(Math.floor(r.progress)+'%'));
});

test('Race and Fight render fixed wide frames, hide IDs, and skip unchanged uploads',async()=>{
 for(const type of ['race','fight']){
  const racers=[{userId:'1',name:'A very long member name & <safe> '.repeat(3),chair:1},{userId:'2',name:'B',chair:2}];
  let view={id:'internal-session',type,guildId:'g',channelId:'main',messageId:'m',state:'OPEN',expiresAt:new Date(),racers,pool:'12345678901234567890',extensionUsed:false};
  const c=new DiscordEventsCoordinator({publicView:async()=>view},config(true),async()=>true);
  const payload=await c.payload(view);assert.doesNotMatch(nativeText(payload),/internal-session/);
  const {default:sharp}=await import('sharp');const meta=await sharp(payload.files[0].attachment).metadata();assert.equal(meta.width,1200);assert.equal(meta.height,640);
  let edits=0;c.payload=async()=>({});const client={user:{id:'bot'},channels:{fetch:async()=>({isTextBased:()=>true,messages:{fetch:async()=>({author:{id:'bot'},edit:async()=>{edits++;}})}})}};
  await c.refresh(client,view.id);await c.refresh(client,view.id);assert.equal(edits,1);
  view={...view,pool:'200'};await c.refresh(client,view.id);assert.equal(edits,2);
 }
});
test('Race/Fight successful controls are silent; errors after acknowledgement stay private',async()=>{
 for(const type of ['race','fight'])for(const fail of [false,true]){
  const i=interaction();i.customId=(type==='fight'?'fight':'event')+':extend:round';
  let refreshed=0;const c=new DiscordEventsCoordinator({publicView:async()=>({type,guildId:'g',channelId:'main'}),extend:async()=>{if(fail)throw Error('failure');}},{get:async(_g,k)=>k==='channels.main_chat'?'main':true},async()=>true);c.refresh=async()=>{refreshed++;};
  await c.handle(i);assert.equal(i.deferred,true);assert.equal(refreshed,fail?0:1);assert.equal(i.calls.length,fail?1:0);if(fail)assert.equal(i.calls[0].ephemeral,true);
 }
});
test('wager submit retains explicit modal but deletes redundant success response',async()=>{
 const i=interaction();i.customId='event:wager:member:round:racer';i.isButton=()=>false;i.isModalSubmit=()=>true;i.fields={getTextInputValue:()=> '25'};i.deleteReply=async()=>i.calls.push('deleted');
 const c=new DiscordEventsCoordinator({publicView:async()=>({guildId:'g',channelId:'main'}),bet:async()=>({total:25n})},config(true),async()=>true);c.policy=async()=>({});c.refresh=async()=>{};await c.handle(i);assert.deepEqual(i.calls,['deleted']);
});

test('live Race and Fight keep one authoritative in-frame timeline for the whole locked phase and after restart',async()=>{
 for(const type of ['race','fight']){
  const racers=[{userId:'1',name:'Chair One',chair:1},{userId:'2',name:'Chair Two',chair:2}];
  let seed=7654;const random=max=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return Math.floor(seed/4294967296*max);};
  const plan=type==='fight'?planFight(racers,[],random):planRace(racers,random),startedAt=new Date(Date.now()+60000).toISOString(),data={racers,startedAt,...(type==='fight'?{fightPlan:plan}:{plan})};
  let view={id:'round',type,guildId:'g',channelId:'main',messageId:'m',state:'LOCKED',expiresAt:new Date(Date.now()+plan.durationMs),racers,pool:'100',bets:[{userId:'bettor',selection:'1',amount:'100'}],extensionUsed:false,motion:{rows:[{userId:'1',place:1,progress:42.2},{userId:'2',place:2,progress:30}]},combat:{hp:[72,49],log:['Chair One strikes.']}};
  const edits=[],attachments=new Collection(),message={author:{id:'bot'},attachments,edit:async payload=>{edits.push(payload);if(payload.files)attachments.set('scene',{name:payload.files[0].name,url:'https://cdn.discordapp.com/attachments/scene.gif'});}};
  const client={user:{id:'bot'},channels:{fetch:async()=>({isTextBased:()=>true,messages:{fetch:async()=>message}})}},repo={publicView:async()=>view,get:async()=>({state:view.state,data})};
  const c=new DiscordEventsCoordinator(repo,config(true),async()=>true);
  await c.refresh(client,view.id);assert.equal(edits.length,1);assert.equal(edits[0].files[0].name,`${type}-locked.gif`);assert.equal(edits[0].files[0].attachment.subarray(0,3).toString(),'GIF');assert.equal(nativeText(edits[0]),'');
  const {default:sharp}=await import('sharp');const metadata=await sharp(edits[0].files[0].attachment,{animated:true}).metadata();assert.equal(metadata.loop,1);assert.ok(metadata.pages>1&&metadata.pages<=401);assert.doesNotMatch(JSON.stringify(edits[0].components),/tracks|usedMoveIds|winnerId|fightPlan/);
  await c.refresh(client,view.id);assert.equal(edits.length,1);
  view={...view,motion:{rows:[{userId:'2',place:1,progress:48},{userId:'1',place:2,progress:43}]},combat:{hp:[60,49],log:['Chair Two counters.']}};
  await c.refresh(client,view.id);assert.equal(edits.length,1,'saved progress advances within the existing timeline without Discord edits');
  const restarted=new DiscordEventsCoordinator(repo,config(true),async()=>true);await restarted.refresh(client,view.id);assert.equal('files' in edits[1],false);assert.equal('attachments' in edits[1],false);assert.equal(nativeText(edits[1]),'');assert.equal(nested(edits[1]).find(c=>c.type===12).items[0].media.url,'https://cdn.discordapp.com/attachments/scene.gif');
  view={...view,state:'CLOSED',winnerId:'2',result:{pool:'100',rake:'5',payouts:{},refunded:false}};await restarted.refresh(client,view.id);assert.equal(edits[2].files[0].name,`${type}-closed.png`);assert.deepEqual(edits[2].attachments,[]);assert.equal(controlsOf(edits[2]).length,0);assert.equal(nativeText(edits[2]),'');
 }
});

test('authoritative timeline crops elapsed frames after rasterization and holds its final frame without replay',async()=>{
 const {default:sharp}=await import('sharp'),frames=['#ff0000','#00ff00','#0000ff'].map(fill=>`<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"><rect width="16" height="16" fill="${fill}"/></svg>`);
 const live=await rasterizeTimeline(frames,[10000,20000,1000],Date.now()-15000),meta=await sharp(live,{animated:true}).metadata();assert.equal(meta.pages,2);assert.equal(meta.loop,1);assert.ok(meta.delay[0]<=15000&&meta.delay[0]>10000);const first=await sharp(live).removeAlpha().raw().toBuffer();assert.deepEqual([...first.subarray(0,3)],[0,255,0]);
 const finished=await rasterizeTimeline(frames,[10000,20000,1000],Date.now()-60000),last=await sharp(finished).removeAlpha().raw().toBuffer();assert.deepEqual([...last.subarray(0,3)],[0,0,255]);assert.equal((await sharp(finished,{animated:true}).metadata()).pages??1,1);
 assert.throws(()=>rasterizeTimeline(frames,[10000,20000,1],Date.now()),/Invalid/);assert.throws(()=>rasterizeTimeline(Array(513).fill(frames[0]),Array(513).fill(10),Date.now()),/Invalid/);
});

test('completion during live rendering cannot overwrite the saved finale',async()=>{
 let reads=0;const base={id:'round',type:'race',guildId:'g',channelId:'main',messageId:'m',state:'LOCKED',expiresAt:new Date(),racers:[],pool:'0'},edits=[];
 const c=new DiscordEventsCoordinator({publicView:async()=>++reads===1?base:{...base,state:'CLOSED',winnerId:'winner'}},config(true),async()=>true);c.payload=async view=>({state:view.state});
 const client={user:{id:'bot'},channels:{fetch:async()=>({isTextBased:()=>true,messages:{fetch:async()=>({author:{id:'bot'},edit:async payload=>edits.push(payload)})}})}};await c.refresh(client,'round');assert.deepEqual(edits,[{state:'CLOSED'}]);
});
test('Race prefix preserves only the authorized role mention outside its artwork',async()=>{
 const sent=[],view={id:'round',state:'OPEN',expiresAt:new Date(),racers:[{userId:'member',name:'Jordan',chair:1}],pool:'0',extensionUsed:false},member={id:'member',displayName:'Jordan',displayAvatarURL:()=>undefined,roles:{cache:new Map()}};
 const message={id:'trigger',content:'!race',author:{id:'member',bot:false},guildId:'g',guild:{id:'g',members:{fetch:async()=>member},roles:{fetch:async()=>({id:'123456789012345678',mentionable:true,managed:false,permissions:{bitfield:0n}})}},channelId:'main',delete:async()=>{},channel:{isSendable:()=>true,send:async payload=>{sent.push(payload);return{id:'published'};}}};
 const settings={get:async(_g,k)=>k==='channels.main_chat'?'main':k==='special_commands.access_roles'?{'!race':[]}:k==='special_commands.builtin_role_map'?{'!race':'123456789012345678'}:true};
 await new DiscordEventsCoordinator({startRace:async()=>({sessionId:'round'}),publicView:async()=>view,linkMessage:async()=>{}},settings,async()=>true).message(message);
 assert.equal(sent.length,1);assert.equal('content' in sent[0],false);assert.equal(sent[0].flags,MessageFlags.IsComponentsV2);assert.equal(nativeText(sent[0]),'<@&123456789012345678>');assert.deepEqual(sent[0].allowedMentions,{parse:[],roles:['123456789012345678'],users:[],repliedUser:false});
});

test('Race and Fight rules remain private and put authored copy entirely inside branded graphics',async()=>{
 for(const type of ['race','fight']){const i=interaction();i.customId=(type==='race'?'event':'fight')+':rules:round';const c=new DiscordEventsCoordinator({publicView:async()=>({type,guildId:'g',channelId:'main'})},{get:async(_g,k)=>k==='channels.main_chat'?'main':true},async()=>true);await c.handle(i);assert.equal(i.calls.length,1);assert.equal(i.calls[0].ephemeral,true);assert.equal(nativeText(i.calls[0]),'');assert.deepEqual(i.calls[0].embeds,[]);assert.equal(i.calls[0].files[0].name,'event-rules.png');}
});
