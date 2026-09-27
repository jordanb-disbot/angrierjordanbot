import test from 'node:test';
import assert from 'node:assert/strict';
import {DiscordSpecialCoordinator} from '../../dist/apps/bot/src/discord/special-coordinator.js';
import {waitingCountdown} from '../../dist/apps/bot/src/discord/event-window.js';

const view=expiresAt=>({id:'line-id',guildId:'guild',channelId:'main',messageId:'message',ownerId:'host',state:'OPEN',expiresAt,extensionUsed:false,members:[{userId:'host',name:'Host',status:'ready'},{userId:'guest',name:'Guest',status:'waiting'}],remainingMs:60_000,elapsedMs:0});
const countdownText=payload=>payload.components[0].toJSON().components.find(component=>component.type===10)?.content;

test('Line waiting card shows a native live countdown, ready/waiting totals and one-time extension control',async()=>{
 const expiresAt=new Date(Date.now()+60_000),coordinator=new DiscordSpecialCoordinator({}, {},async()=>true);
 const payload=await coordinator.payload(view(expiresAt),undefined,{imageUrl:'https://cdn.discordapp.com/line.png'});
 assert.match(countdownText(payload),/READINESS CLOSES IN 01:00.*extension available/);
 assert.match(countdownText(payload),/\*\*Ready:\*\* Host/);
 assert.match(countdownText(payload),/\*\*Need a second:\*\* Guest/);
 assert.equal(payload.files,undefined,'a text-only tick must not rasterize or upload an image');
 const controls=payload.components[0].toJSON().components.flatMap(component=>component.components??[]);
 assert.equal(controls.find(control=>control.custom_id==='line:extend:line-id')?.disabled,false);
 const extended=await coordinator.payload({...view(expiresAt),extensionUsed:true},undefined,{imageUrl:'https://cdn.discordapp.com/line.png'});
 assert.match(countdownText(extended),/extension used/);
 assert.equal(extended.components[0].toJSON().components.flatMap(component=>component.components??[]).find(control=>control.custom_id==='line:extend:line-id')?.disabled,true);
 assert.equal(waitingCountdown(new Date(60_000),1_001),'00:59');
});

test('Line second tick edits components using the retained image, stops after state transition',async()=>{
 const expiresAt=new Date(Date.now()+58_000),state=view(expiresAt),edits=[];
 const message={author:{id:'bot'},attachments:[{name:'line.png',url:'https://cdn.discordapp.com/line.png'}],edit:async payload=>{edits.push(payload);return message;}};
 const client={user:{id:'bot'},channels:{fetch:async()=>({isTextBased:()=>true,messages:{fetch:async()=>message}})}};
 const coordinator=new DiscordSpecialCoordinator({publicView:async()=>state}, {},async()=>true);
 coordinator.publishedVersions.set(state.id,JSON.stringify([state.state,state.members,state.extensionUsed,state.expiresAt]));
 coordinator.countdowns.set(state.id,'01:00');
 await coordinator.refresh(client,state.id);
 assert.equal(edits.length,1);
 assert.equal(edits[0].files,undefined);
 assert.match(countdownText(edits[0]),/READINESS CLOSES IN/);
 assert.match(JSON.stringify(edits[0].components[0].toJSON()),/https:\/\/cdn.discordapp.com\/line.png/);
 await coordinator.refresh(client,state.id);
 assert.equal(edits.length,1);
 state.state='SETTLING';
 coordinator.publishedVersions.set(state.id,JSON.stringify([state.state,state.members,state.extensionUsed,null]));
 await coordinator.refresh(client,state.id);
 assert.equal(edits.length,1,'the waiting-room timer must stop after Line starts');
 assert.equal(coordinator.countdowns.has(state.id),false);
 assert.equal(coordinator.waitingMessages.has(state.id),false);
});
