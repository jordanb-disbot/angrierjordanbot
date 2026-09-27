import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import {DiscordEventsCoordinator} from '../../dist/apps/bot/src/discord/events-coordinator.js';
import {DiscordSpecialCoordinator} from '../../dist/apps/bot/src/discord/special-coordinator.js';
const member={id:'member',displayName:'Morgan',roles:{cache:new Map()},displayAvatarURL:()=>undefined};
const guild={members:{fetch:async()=>member}};
const config={get:async(g,key)=>key==='channels.main_chat'?'main':key==='special_commands.access_roles'?{'!race':[]}:key==='special_commands.builtin_role_map'?{}:true};
const view={id:'round',type:'race',guildId:'g',channelId:'main',ownerId:'member',state:'OPEN',expiresAt:new Date(Date.now()+60000),extensionUsed:false,racers:[{userId:'member',name:'Morgan',chair:1}],pool:'0',bets:[]};
test('entry and check-in cards are one PNG frame, never a 61-frame waiting animation',async()=>{
 const race=new DiscordEventsCoordinator({},config,async()=>true),line=new DiscordSpecialCoordinator({},config,async()=>true);
 for(const payload of [await race.payload(view),await race.payload({...view,racers:[...view.racers,{userId:'second',name:'Alex',chair:2}]}),await line.payload({...view,members:[{userId:'member',name:'Morgan',status:'ready'}],remainingMs:60000,elapsedMs:0})]){const meta=await sharp(payload.files[0].attachment,{animated:true}).metadata();assert.equal(meta.format,'png');assert.equal(meta.pages??1,1);}
});
test('prefix and slash collide into one engine creation, frame publication and ping',async()=>{
 let starts=0,sends=0,release;const barrier=new Promise(resolve=>release=resolve),channel={isSendable:()=>true,send:async p=>{sends++;assert.equal(p.nonce,'prefix');return{id:'posted'};}};
 const c=new DiscordEventsCoordinator({startRace:async()=>{starts++;await barrier;return{sessionId:'round'};},publicView:async()=>view,linkMessage:async()=>{}},config,async()=>true);c.payload=async()=>({components:[],files:[]});
 const prefix={id:'prefix',content:'!race',author:{id:'member',bot:false},guild,guildId:'g',channelId:'main',channel,delete:async()=>{}};
 const first=c.message(prefix);while(!starts)await new Promise(resolve=>setImmediate(resolve));
 const calls=[],slash={id:'slash',user:{id:'member'},guild,guildId:'g',channelId:'main',channel,deferred:false,deferReply:async function(){this.deferred=true;calls.push('ack');},deleteReply:async()=>calls.push('done'),editReply:async p=>calls.push(p)};
 const second=c.startRace(slash);await new Promise(resolve=>setImmediate(resolve));release();await Promise.all([first,second]);assert.equal(starts,1);assert.equal(sends,1);assert.deepEqual(calls,['ack','done']);
});
test('join, check-in and slash acknowledge before config/eligibility/session work',async()=>{
 for(const kind of ['join','ready','slash']){const calls=[],settings={get:async()=>{assert.equal(calls[0],'ack');throw Error('blocked');}},i={guildId:'g',guild,channelId:'main',channel:{isSendable:()=>true},user:{id:'member'},customId:kind==='join'?'event:join:round':'line:ready:round',message:{id:'m'},deferred:false,isButton:()=>true,isModalSubmit:()=>false,deferUpdate:async function(){this.deferred=true;calls.push('ack');},deferReply:async function(){this.deferred=true;calls.push('ack');},followUp:async()=>{},editReply:async()=>{},reply:async()=>assert.fail('must acknowledge first')};
 const c=kind==='ready'?new DiscordSpecialCoordinator({},settings,async()=>true):new DiscordEventsCoordinator({},settings,async()=>true);if(kind==='slash')await c.startRace(i);else await c.handle(i);assert.equal(calls[0],'ack');}
});
test('wager modal opens without DB; submit still rejects restricted members before any write',async()=>{
 const forbidden={get:async()=>assert.fail('modal must not read config')};let shown=false;const c=new DiscordEventsCoordinator({},forbidden,async()=>false);
 await c.handle({guildId:'g',guild,channelId:'main',user:{id:'member'},customId:'event:bet:round:member',isButton:()=>true,isModalSubmit:()=>false,showModal:async()=>{shown=true;}});assert.equal(shown,true);
 const calls=[],i={guildId:'g',guild,channelId:'main',user:{id:'member'},customId:'event:wager:member:round:member',isButton:()=>false,isModalSubmit:()=>true,deferred:false,deferReply:async function(){this.deferred=true;},editReply:async p=>calls.push(p)};
 await new DiscordEventsCoordinator(new Proxy({},{get:()=>assert.fail('restricted submit must not read/write repository')}),config,async()=>false).handle(i);assert.match(calls[0].content,/restricted/);
});
