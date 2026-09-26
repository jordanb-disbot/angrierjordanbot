import test from 'node:test';
import assert from 'node:assert/strict';
import {DiscordEventsCoordinator} from '../../dist/apps/bot/src/discord/events-coordinator.js';
import {DiscordSpecialCoordinator} from '../../dist/apps/bot/src/discord/special-coordinator.js';

const forbidden=new Proxy({},{get:()=>()=>{throw Error('Repository must not be reached');}});
function interaction(customId){
 return {customId,guildId:'server',guild:{},channelId:'main',user:{id:'member'},message:{id:'message'},calls:[],deferred:false,
  isButton:()=>true,isModalSubmit:()=>false,
  deferUpdate:async function(){this.calls.push('ack');this.deferred=true;},
  deferReply:async function(){this.calls.push('ack');this.deferred=true;},
  deleteReply:async function(){this.calls.push('delete');},
  reply:async function(payload){this.calls.push(['reply',payload]);},
  followUp:async function(payload){this.calls.push(['private',payload]);}
 };
}
function blockedConfig(i){
 let release,entered;
 const gate=new Promise(resolve=>{release=resolve;}),seen=new Promise(resolve=>{entered=resolve;});
 return {seen,release,config:{get:async()=>{assert.deepEqual(i.calls,['ack'],'ACK must precede even the first config read');entered();await gate;return false;}}};
}
for(const customId of ['event:join:round','event:extend:round','fight:extend:round','line:ready:round','line:waiting:round','line:extend:round','line:start:round','line:cancel:round']){
 test(`${customId.split(':').slice(0,2).join(':')} acknowledges before blocked guard and rejects privately without mutation`,async()=>{
  const i=interaction(customId),blocked=blockedConfig(i),Coordinator=customId.startsWith('line:')?DiscordSpecialCoordinator:DiscordEventsCoordinator;
  const work=new Coordinator(forbidden,blocked.config,async()=>true).handle(i);
  await blocked.seen;assert.deepEqual(i.calls,['ack']);blocked.release();await work;
  assert.equal(i.calls.length,2);assert.equal(i.calls[1][0],'private');assert.equal(i.calls[1][1].ephemeral,true);assert.match(i.calls[1][1].content,/not enabled/);
 });
}
test('slash Fight acknowledges before blocked guard, then removes placeholder and reports denial privately',async()=>{
 const i=interaction('');i.options={getUser:()=>({id:'target',bot:false})};const blocked=blockedConfig(i);
 const work=new DiscordEventsCoordinator(forbidden,blocked.config,async()=>true).startFight(i);
 await blocked.seen;assert.deepEqual(i.calls,['ack']);blocked.release();await work;
 assert.equal(i.calls[1],'delete');assert.equal(i.calls[2][0],'private');assert.equal(i.calls[2][1].ephemeral,true);
});
test('wager buttons retain modal acknowledgement and private roster keeps reply semantics',async()=>{
 const settings={get:async(_g,key)=>key==='channels.main_chat'?'main':true};
 for(const prefix of ['event','fight']){
  const i=interaction(`${prefix}:bet:round:target`);i.showModal=async payload=>i.calls.push(['modal',payload]);
  await new DiscordEventsCoordinator({publicView:async()=>({type:prefix==='fight'?'fight':'race',guildId:'server',channelId:'main',state:'OPEN',expiresAt:new Date(Date.now()+60000),racers:[{userId:'target'}]})},settings,async()=>true).handle(i);
  assert.equal(i.calls.length,1);assert.equal(i.calls[0][0],'modal');assert.equal(i.deferred,false);
 }
 const i=interaction('line:roster:round:0');
 await new DiscordSpecialCoordinator({publicView:async()=>({guildId:'server',channelId:'main',ownerId:'member',members:[{userId:'member',status:'ready'}]})},settings,async()=>true).handle(i);
 assert.equal(i.calls.length,1);assert.equal(i.calls[0][0],'reply');assert.equal(i.calls[0][1].ephemeral,true);assert.equal(i.deferred,false);
});
