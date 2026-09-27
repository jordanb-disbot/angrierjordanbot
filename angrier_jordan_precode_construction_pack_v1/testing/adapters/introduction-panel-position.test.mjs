import test from 'node:test';
import assert from 'node:assert/strict';
import {Collection} from 'discord.js';
import {DiscordIntroductionsCoordinator,introductionDeliveryUrl} from '../../dist/apps/bot/src/discord/introductions-coordinator.js';
function fixture(){
 let sequence=1,panelId='1',job=null,failFinalize=false;
 const messages=new Collection(),deleted=[];
 const controls=[{toJSON:()=>({type:1,components:[{custom_id:'intro:panel:create'}]})}];
 function add(panel){const id=String(sequence++);const m={id,author:{id:'bot'},components:panel?controls:[],embeds:[],delete:async()=>{deleted.push(id);messages.delete(id);}};messages.set(id,m);return m;}
 add(true);const published=add(false);
 const channel={isTextBased:()=>true,isSendable:()=>true,messages:{fetch:async q=>{if(typeof q==='object')return new Collection([...messages].reverse().slice(0,q.limit));if(!messages.has(q))throw{code:10008};return messages.get(q);}},send:async()=>{const m=add(true);m.embeds=[{url:introductionDeliveryUrl('intro-panel:job')}];return m;}};
 const client={user:{id:'bot'},guilds:{cache:new Collection([['g',{id:'g'}]])},channels:{fetch:async()=>channel}};
 const repo={configure:async()=>{},configuration:async()=>({config:{panelMessageId:panelId}}),expireDrafts:async()=>{},configuredServers:async()=>[{guildId:'g',introductionChannelId:'c',panelMessageId:panelId}],panelJob:async()=>{job??={guildId:'g',payload:{channelId:'c',oldPanelMessageId:panelId,deliveryState:'PENDING'}};return{jobId:'job'};},panelDeliveryJob:async()=>job,delivery:()=>({read:async()=>({state:job.payload.deliveryState,messageId:job.payload.deliveryMessageId}),claim:async()=>{if(job.payload.deliveryState!=='PENDING')return false;job.payload.deliveryState='SENDING';return true;},complete:async id=>{job.payload.deliveryState='SENT';job.payload.deliveryMessageId=id;}}),finalizePanel:async()=>{if(failFinalize)throw Error('DB interrupted');panelId=job.payload.deliveryMessageId;}};
 const config={get:async(g,k)=>k==='features.introductions'?true:k==='channels.introduction_channel'?'c':null};
 const coordinator=()=>new DiscordIntroductionsCoordinator(repo,config,async()=>true,async()=>false);
 return{coordinator,client,messages,published,deleted,repo,fail:v=>{failFinalize=v;},panel:()=>panelId};
}
test('publication above panel triggers one bottom replacement; repeated recovery is stable',async()=>{const f=fixture();await f.coordinator().sweep(f.client);assert.equal(f.messages.size,2);assert.equal(f.messages.last().id,f.panel());assert.deepEqual(f.deleted,['1']);assert.equal(f.messages.get(f.published.id),f.published);await f.coordinator().sweep(f.client);assert.equal(f.messages.size,2);assert.deepEqual(f.deleted,['1']);});
test('restart after send before persistence recovers the same panel without duplicates',async()=>{const f=fixture();f.fail(true);await assert.rejects(f.coordinator().sweep(f.client));assert.equal(f.messages.size,2);f.fail(false);await f.coordinator().sweep(f.client);assert.equal(f.messages.size,2);assert.equal(f.messages.last().id,f.panel());assert.equal(f.messages.get(f.published.id),f.published);});
test('a saved published introduction is never deleted as a panel',async()=>{const f=fixture();f.messages.get('1').components=[];await assert.rejects(f.coordinator().sweep(f.client));assert.deepEqual(f.deleted,[]);assert.equal(f.messages.size,2);});
