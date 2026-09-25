import test from 'node:test';
import assert from 'node:assert/strict';
import {DiscordItemsCoordinator} from '../../dist/apps/bot/src/discord/items-coordinator.js';
const config=enabled=>({get:async(_g,k)=>k==='features.items'?enabled:k==='channels.bot_channel'?'bot':k==='shop.personalized_bonus_slots'?2:k.includes('floor')?35:k.includes('ceiling')?70:k.includes('percent')?50:k.endsWith('_min')?10:k.endsWith('_max')?30:25});
function interaction(customId='items:open:member:box'){
 const calls=[];return{calls,id:'request',guildId:'g',guild:{members:{fetch:async()=>({user:{bot:false}})}},channelId:'bot',user:{id:'member'},customId,replied:false,deferred:false,
 isChatInputCommand:()=>false,isButton:()=>true,isStringSelectMenu:()=>false,isModalSubmit:()=>false,
 reply:async function(p){this.replied=true;calls.push(p);},followUp:async p=>calls.push(p),editReply:async p=>calls.push(p),deferReply:async function(){this.deferred=true;}};
}
const forbiddenRepo={read:async()=>{throw new Error('Repository must not be reached');},transact:async()=>{throw new Error('Repository must not be reached');}};
test('disabled item flag rejects even forged component interactions',async()=>{const i=interaction();await new DiscordItemsCoordinator(forbiddenRepo,config(false),async()=>true).handle(i);assert.match(i.calls[0].content,/not enabled/);});
test('restricted members cannot submit item controls',async()=>{const i=interaction();await new DiscordItemsCoordinator(forbiddenRepo,config(true),async()=>false).handle(i);assert.match(i.calls[0].content,/restricted/);});
test('foreign owner component cannot invoke an item mutation',async()=>{const i=interaction('items:open:other:box');await new DiscordItemsCoordinator(forbiddenRepo,config(true),async()=>true).handle(i);assert.match(i.calls[0].content,/own item controls/);});
test('disabled flag also blocks modal submissions',async()=>{const i=interaction('items:buyamount:member:wood');i.isButton=()=>false;i.isModalSubmit=()=>true;await new DiscordItemsCoordinator(forbiddenRepo,config(false),async()=>true).handle(i);assert.match(i.calls[0].content,/not enabled/);});
test('item commands honor configured bot channel',async()=>{const i=interaction();i.isButton=()=>false;i.isChatInputCommand=()=>true;i.commandName='shop';i.channelId='elsewhere';await new DiscordItemsCoordinator(forbiddenRepo,config(true),async()=>true).handle(i);assert.match(i.calls[0].content,/configured bot channel/);});
