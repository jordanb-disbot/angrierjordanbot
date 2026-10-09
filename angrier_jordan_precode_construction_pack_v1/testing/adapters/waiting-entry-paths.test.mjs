import test from 'node:test';
import assert from 'node:assert/strict';
import {DiscordEventsCoordinator} from '../../dist/apps/bot/src/discord/events-coordinator.js';
import {DiscordSpecialCoordinator} from '../../dist/apps/bot/src/discord/special-coordinator.js';

const cd=payload=>payload.components[0].toJSON().components.find(component=>component.type===10)?.content;
const raceView=()=>({id:'race-id',type:'race',guildId:'guild',channelId:'main',messageId:null,ownerId:'host',state:'OPEN',expiresAt:new Date(Date.now()+60_000),extensionUsed:false,racers:[{userId:'host',name:'Host',chair:1}],pool:'0',bets:[]});
const lineView=()=>({id:'line-id',guildId:'guild',channelId:'main',messageId:null,ownerId:'host',state:'OPEN',expiresAt:new Date(Date.now()+60_000),extensionUsed:false,members:[{userId:'host',name:'Host',status:'ready'}],remainingMs:60_000,elapsedMs:0});
const member={id:'host',displayName:'Host',roles:{cache:{has:()=>false,keys:()=>[]}},displayAvatarURL:()=>''};
const raceConfig={get:async(_guild,key)=>({'channels.main_chat':'main','features.race':true,'special_commands.enabled':true,'special_commands.access_roles':{'!race':[]},'special_commands.builtin_role_map':{}})[key]};

test('!race publishes the live waiting presenter on its first card',async()=>{
 const sent=[];let linked=0;
 const channel={isSendable:()=>true,sendTyping:async()=>{},send:async payload=>{sent.push(payload);return{id:'card'};}};
 const guild={id:'guild',members:{fetch:async()=>member}};
 const repo={startRace:async()=>({sessionId:'race-id'}),publicView:async()=>raceView(),linkMessage:async()=>{linked++;}};
 const coordinator=new DiscordEventsCoordinator(repo,raceConfig,async()=>true);
 const realPayload=coordinator.payload.bind(coordinator);
 coordinator.payload=(view,options={})=>realPayload(view,{...options,retainImageUrl:'https://cdn.discordapp.com/race-open.png'});
 coordinator.prepare=()=>{};
 const message={id:'request',content:'!race',author:{id:'host',bot:false},guildId:'guild',guild,channelId:'main',channel,delete:async()=>{}};
 await coordinator.message(message);
 assert.equal(sent.length,1);assert.equal(linked,1);
 assert.match(cd(sent[0]),/RACE WAITING ROOM · closes <t:\d+:R>/);
 assert.match(cd(sent[0]),/Joined \(1\/6\):\*\* Host/);
 assert.equal(sent[0].files,undefined,'the retained-art test path should not rasterize');
});

test('!line publishes the live countdown and readiness list on its first card',async()=>{
 const sent=[];let linked=0;
 const channel={isSendable:()=>true,messages:{fetch:async()=>[]},send:async payload=>{sent.push(payload);return{id:'card',attachments:[]};}};
 const client={user:{id:'bot'},channels:{fetch:async()=>channel},guilds:{fetch:async()=>({id:'guild'})}};
 const delivery={read:async()=>({state:'PENDING'}),claim:async()=>true,complete:async()=>{}};
 const repo={callout:async()=>({payload:{guildId:'guild',channelId:'main',sessionId:'line-id',content:'Ready?',notificationRoleId:null}}),delivery:()=>delivery,publicView:async()=>lineView(),linkMessage:async()=>{linked++;}};
 const coordinator=new DiscordSpecialCoordinator(repo,{},async()=>true);
 const realPayload=coordinator.payload.bind(coordinator);
 coordinator.payload=(view,callout)=>realPayload(view,callout,{imageUrl:'https://cdn.discordapp.com/line.png'});
 coordinator.prepareFinale=()=>{};
 await coordinator.deliver(client,'job');
 assert.equal(sent.length,1);assert.equal(linked,1);
 assert.match(cd(sent[0]),/READINESS CLOSES IN 0[01]:[0-5]\d/);
 assert.match(cd(sent[0]),/Ready:\*\* Host/);
 assert.match(cd(sent[0]),/Need a second:\*\* None yet/);
 assert.equal(sent[0].files,undefined,'the retained-art test path should not rasterize');
});
