import test from 'node:test';import assert from 'node:assert/strict';
import {DiscordLearningCoordinator} from '../../dist/apps/bot/src/discord/learning-coordinator.js';
const forbidden=new Proxy({},{get:()=>()=>{throw Error('Repository must not be reached');}});
function interaction(patch={}){return{guildId:'server',guild:{},user:{id:'member'},commandName:'lore',customId:'learn:lore:member:toc',calls:[],deferred:false,isChatInputCommand:()=>true,isButton:()=>false,isStringSelectMenu:()=>false,deferReply:async function(x){this.deferred=true;this.private=x.ephemeral;},reply:async function(x){this.calls.push(x)},editReply:async function(x){this.calls.push(x)},followUp:async function(x){this.calls.push(x)},...patch};}
test('disabled learning and forged member controls cannot access persistent content',async()=>{const i=interaction();await new DiscordLearningCoordinator(forbidden,{get:async()=>false},async()=>true).handle(i);assert.match(i.calls[0].content,/not enabled/);const forged=interaction({isChatInputCommand:()=>false,customId:'learn:lore:other:not:0:1'});await new DiscordLearningCoordinator(forbidden,{get:async()=>true},async()=>true).handle(forged);assert.match(forged.calls[0].content,/your own/);});
test('missing approved lore is private and awards no reading credit',async()=>{const i=interaction(),repo={chapters:async()=>[],loreProgress:async()=>[],read:()=>{throw Error('No credit');}};await new DiscordLearningCoordinator(repo,{get:async()=>true},async()=>true).handle(i);assert.equal(i.private,true);assert.match(i.calls[0].embeds[0].data.description,/not been published/);assert.ok(i.calls[0].files[0].attachment.length);});
test('failed lore delivery never commits final-page progress or achievement',async()=>{let reads=0;const i=interaction({isChatInputCommand:()=>false,customId:'learn:lore:member:not:0:1',editReply:async function(x){if(x.files)throw Error('Discord unavailable');this.calls.push(x);}}),repo={chapters:async()=>[{id:'not',title:'Test chapter',version:1,pages:['Test prose']}],loreProgress:async()=>[],read:async()=>{reads++;return{historian:true};}};await new DiscordLearningCoordinator(repo,{get:async()=>true},async()=>true).handle(i);assert.equal(reads,0);});
test('TLDR rejects wrong-channel requests privately before reading messages',async()=>{const i=interaction({commandName:'tldr',channelId:'wrong',options:{getSubcommand:()=> 'chat',getString:()=> '1h'}});await new DiscordLearningCoordinator(forbidden,{get:async(_g,key)=>key.startsWith('features.')?true:'main'},async()=>true).handle(i);assert.equal(i.private,true);assert.match(i.calls[0].content,/<#main>/);});

test('tutorial finder paginates enabled commands and rejects forged pages',async()=>{
 const config={get:async(_g,key)=>key.startsWith('roles.')?null:true,definition:()=>({})};
 const guild={ownerId:'member',members:{fetch:async()=>({permissions:{has:()=>true},roles:{cache:new Map()}})}};
 const repo={tutorialProgress:async()=>[]};
 const first=interaction({guild,isChatInputCommand:()=>false,isStringSelectMenu:()=>true,customId:'learn:tutorial:member:path',values:['finder']});
 const coordinator=new DiscordLearningCoordinator(repo,config,async()=>true);await coordinator.handle(first);
 assert.equal(first.calls[0].components[0].toJSON().components[0].options.length,25);
 const next=interaction({guild,isChatInputCommand:()=>false,customId:'learn:tutorial:member:pathpage:finder:1'});await coordinator.handle(next);
 const firstIds=first.calls[0].components[0].toJSON().components[0].options.map(o=>o.value),nextIds=next.calls[0].components[0].toJSON().components[0].options.map(o=>o.value);
 assert.ok(nextIds.length);assert.ok(nextIds.every(id=>!firstIds.includes(id)));
 const bad=interaction({guild,isChatInputCommand:()=>false,customId:'learn:tutorial:member:pathpage:finder:999'});await coordinator.handle(bad);assert.match(bad.calls[0].content,/Reopen/);
});

test('custom Special Command lessons disappear immediately when authorization is revoked',async()=>{
 let visible=true;const config={get:async(_g,k)=>k.startsWith('roles.')?null:true,definition:()=>({})},guild={ownerId:'owner',members:{fetch:async()=>({permissions:{has:()=>false},roles:{cache:new Map([['allowed',{}]])}})}},seen=[];
 const c=new DiscordLearningCoordinator(forbidden,config,async()=>true,()=>true,async(_g,_u,roles)=>visible&&roles.has('allowed')?[{trigger:'!lounge'}]:[]);
 const i={guildId:'server',guild,user:{id:'member'},options:{getFocused:()=> 'lounge'},respond:async rows=>seen.push(rows)};
 await c.autocomplete(i);assert.ok(seen[0].some(r=>r.name==='!lounge'));visible=false;await c.autocomplete(i);assert.deepEqual(seen[1],[]);
 const stale=interaction({guild,isChatInputCommand:()=>false,customId:'learn:tutorial:member:lesson:special_custom_lounge:0'});await c.handle(stale);assert.match(stale.calls[0].content,/unavailable/);
});

test('TLDR events count only witnessed deliveries and never project private payloads',async()=>{
 const {PrismaLearningRepository}=await import('../../dist/packages/features-learning/src/prisma-repository.js');
 const at=new Date('2026-09-25T12:00Z'),since=new Date('2026-09-24T12:00Z');
 const sent={deliveryState:'SENT',deliveryMessageId:'123456789012345678',secret:'private text'};
 const db={scheduledJob:{findMany:async query=>{assert.deepEqual(query.where.completedAt,{gte:since,lte:at});assert.equal(query.where.guildId,'server');assert.equal(query.where.status,'COMPLETED');assert.ok(!('dueAt'in query.where));return[
 {jobType:'record.announce',completedAt:at,payload:sent},
 {jobType:'record.announce',completedAt:at,payload:{...sent,deliveryState:'SENDING'}},
 {jobType:'lottery.announce',completedAt:at,payload:{deliveryState:'SENT'}},
 {jobType:'spotlight.announce',completedAt:at,payload:{weekKey:'absent'}},
 {jobType:'spotlight.announce',completedAt:at,payload:{weekKey:'published'}},
 {jobType:'family.publish',completedAt:at,payload:{...sent,sessionId:'one',channelId:'public'}},
 {jobType:'family.publish',completedAt:at,payload:{...sent,sessionId:'one',channelId:'public'}}];}},spotlightFreeze:{findMany:async()=>[{weekKey:'published',messageId:'223456789012345678'}]}};
 const result=await new PrismaLearningRepository(db).notableEvents('server',since,at);assert.deepEqual(result.map(r=>r.jobType),['record.announce','spotlight.announce','family.publish']);assert.ok(result.every(r=>Object.keys(r).sort().join(',')==='completedAt,jobType'));assert.ok(!JSON.stringify(result).includes('private text'));
});
