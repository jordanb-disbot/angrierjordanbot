import test from 'node:test';
import assert from 'node:assert/strict';
import {DiscordEventsCoordinator} from '../../dist/apps/bot/src/discord/events-coordinator.js';
import {waitingCountdown} from '../../dist/apps/bot/src/discord/event-window.js';

const racer={userId:'host',name:'Host',chair:1};
const view=expiresAt=>({id:'race-id',type:'race',guildId:'guild',channelId:'main',messageId:'message',ownerId:'host',state:'OPEN',expiresAt,extensionUsed:false,racers:[racer],pool:'0',bets:[]});
const text=payload=>payload.components[0].toJSON().components.find(component=>component.type===10)?.content;

test('Race waiting-room countdown is visible and Start Now respects the minimum in the button state',async()=>{
 const coordinator=new DiscordEventsCoordinator({}, {},async()=>true);
 const first=await coordinator.payload(view(new Date(60_000)),{retainImageUrl:'https://cdn.discordapp.com/race-open.png',nowMs:0});
 assert.match(text(first),/01:00 remaining/);
 assert.match(text(first),/Joined \(1\/6\):.*Host/);
 assert.match(text(first),/5 open seats.*Wager pool:.*0 Ottomans/s);
 const buttons=first.components[0].toJSON().components.flatMap(component=>component.components??[]);
 assert.equal(buttons.find(button=>button.custom_id==='event:start_now:race-id')?.disabled,true);
 const ready=await coordinator.payload({...view(new Date(60_000)),racers:[racer,{userId:'guest',name:'Guest',chair:2}],pool:'250'},{retainImageUrl:'https://cdn.discordapp.com/race-open.png',nowMs:0});
 assert.match(text(ready),/Joined \(2\/6\):.*Host · Guest/);
 assert.match(text(ready),/4 open seats.*250 Ottomans/s);
 assert.equal(ready.components[0].toJSON().components.flatMap(component=>component.components??[]).find(button=>button.custom_id==='event:start_now:race-id')?.disabled,false);
 assert.equal(waitingCountdown(new Date(60_000),1_001),'00:59');
});

test('Race second tick edits components against existing art without rasterizing or uploading a new frame',async()=>{
 const expiresAt=new Date(Date.now()+58_000),state=view(expiresAt),edits=[];
 const message={author:{id:'bot'},attachments:[{name:'race-open.png',url:'https://cdn.discordapp.com/race-open.png'}],edit:async payload=>{edits.push(payload);}};
 const client={user:{id:'bot'},channels:{fetch:async()=>({isTextBased:()=>true,messages:{fetch:async()=>message}})}};
 const coordinator=new DiscordEventsCoordinator({publicView:async()=>state}, {},async()=>true);
 coordinator.publishedVersions.set(state.id,coordinator.publicationKey(state));
 coordinator.countdownVersions.set(state.id,'01:00');
 await coordinator.refresh(client,state.id);
 assert.equal(edits.length,1);
 assert.equal(edits[0].files,undefined);
 assert.match(text(edits[0]),/RACE WAITING ROOM/);
 assert.match(JSON.stringify(edits[0].components[0].toJSON()),/https:\/\/cdn.discordapp.com\/race-open.png/);
 await coordinator.refresh(client,state.id);
 assert.equal(edits.length,1,'the same displayed second must not trigger another Discord edit');
 state.state='LOCKED';
 coordinator.publishedVersions.set(state.id,coordinator.publicationKey(state));
 await coordinator.refresh(client,state.id);
 assert.equal(edits.length,1,'a locked race must stop waiting-room ticker edits');
});

test('Fight welcome countdown ticks against existing art without resetting its saved deadline',async()=>{
 const expiresAt=new Date(Date.now()+28_000),state={...view(expiresAt),id:'fight-id',type:'fight',racers:[racer,{userId:'guest',name:'Guest',chair:2}]},edits=[];
 const message={author:{id:'bot'},attachments:[{name:'fight-open.png',url:'https://cdn.discordapp.com/fight-open.png'}],edit:async payload=>{edits.push(payload);}};
 const client={user:{id:'bot'},channels:{fetch:async()=>({isTextBased:()=>true,messages:{fetch:async()=>message}})}};
 const coordinator=new DiscordEventsCoordinator({publicView:async()=>state}, {},async()=>true);
 coordinator.publishedVersions.set(state.id,coordinator.publicationKey(state));coordinator.countdownVersions.set(state.id,'00:30');
 await coordinator.refresh(client,state.id);
 assert.equal(edits.length,1);assert.equal(edits[0].files,undefined);assert.match(text(edits[0]),/FIGHT BETTING WINDOW · 00:2[0-9] remaining/);assert.match(JSON.stringify(edits[0].components[0].toJSON()),/https:\/\/cdn\.discordapp\.com\/fight-open\.png/);
});
