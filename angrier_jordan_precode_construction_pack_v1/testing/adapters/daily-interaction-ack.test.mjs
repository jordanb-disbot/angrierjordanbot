import test from 'node:test';
import assert from 'node:assert/strict';
import {Events} from 'discord.js';
import {runWithDailyAcknowledgement,replyDailyRestriction} from '../../dist/apps/bot/src/discord/daily-interaction-ack.js';
import {DiscordServerBootstrap} from '../../dist/apps/bot/src/discord/server-bootstrap.js';

function button(action){
 const calls=[];
 const interaction={customId:`economy:daily:${action}`,guildId:'123456789012345678',isButton:()=>true,isChatInputCommand:()=>false,deferred:false,replied:false,
  async deferUpdate(){calls.push('ack');this.deferred=true;},async reply(payload){calls.push(['reply',payload]);},async followUp(payload){calls.push(['followUp',payload]);}};
 return{interaction,calls};
}

for(const action of ['claim','spin','fortune'])test(`${action} acknowledges before bootstrap/auth/reward work`,async()=>{
 const {interaction,calls}=button(action);let unblock;
 const barrier=new Promise(resolve=>unblock=resolve);
 const bootstrap=new DiscordServerBootstrap({async ensure(){calls.push('bootstrap');await barrier;}});
 const running=runWithDailyAcknowledgement(Events.InteractionCreate,[interaction],true,()=>bootstrap.run(Events.InteractionCreate,[interaction],async()=>{calls.push('authorization');calls.push('reward');}));
 await new Promise(resolve=>setImmediate(resolve));
 assert.deepEqual(calls,['ack','bootstrap']);
 unblock();await running;assert.deepEqual(calls,['ack','bootstrap','authorization','reward']);
});

test('disabled daily actions explicitly reply without bootstrap, authorization or reward writes',async()=>{
 for(const action of ['claim','spin','fortune']){
  const {interaction,calls}=button(action);
  await runWithDailyAcknowledgement(Events.InteractionCreate,[interaction],false,()=>assert.fail('Disabled action reached work'));
  assert.equal(calls.length,1);assert.equal(calls[0][0],'reply');assert.equal(calls[0][1].ephemeral,true);assert.match(calls[0][1].content,/not enabled/);
 }
});

test('daily restriction after early acknowledgement remains private and cannot grant a reward',async()=>{
 const {interaction,calls}=button('claim');let reward=false;
 await runWithDailyAcknowledgement(Events.InteractionCreate,[interaction],true,async()=>{
  const denied=true;if(denied){await replyDailyRestriction(interaction,'Access denied.');return;}reward=true;
 });
 assert.equal(reward,false);assert.deepEqual(calls,['ack',['followUp',{ephemeral:true,content:'Access denied.'}]]);
});

test('bootstrap failure after acknowledgement gives a sanitized private error',async()=>{
 const {interaction,calls}=button('spin');
 await assert.rejects(runWithDailyAcknowledgement(Events.InteractionCreate,[interaction],true,async()=>{throw new Error('private connection details');}));
 assert.equal(calls[1][0],'followUp');assert.equal(calls[1][1].ephemeral,true);assert.doesNotMatch(calls[1][1].content,/connection details/);
});

test('bank modal controls, unrelated interactions and non-interaction events are not pre-acknowledged',async()=>{
 for(const customId of ['economy:bank:deposit','economy:daily:unknown','items:inspect:1']){
  const {interaction,calls}=button('claim');interaction.customId=customId;
  await runWithDailyAcknowledgement(Events.InteractionCreate,[interaction],true,()=>calls.push('work'));
  assert.deepEqual(calls,['work']);
 }
 const {interaction,calls}=button('claim');
 await runWithDailyAcknowledgement(Events.MessageCreate,[interaction],true,()=>calls.push('work'));assert.deepEqual(calls,['work']);
});

test('non-daily restriction response retains the existing reply path',async()=>{
 const {interaction,calls}=button('claim');interaction.customId='items:inspect:1';
 await replyDailyRestriction(interaction,'Access denied.');assert.equal(calls[0][0],'reply');
});
