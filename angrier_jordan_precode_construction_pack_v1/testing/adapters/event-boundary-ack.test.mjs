import test from 'node:test';
import assert from 'node:assert/strict';
import {runWithEventAcknowledgement} from '../../dist/apps/bot/src/discord/event-interaction-ack.js';
function fixture(kind,customId=''){
 const calls=[];return{calls,customId,commandName:'race',deferred:false,replied:false,
  isButton:()=>kind==='button',isModalSubmit:()=>kind==='modal',isChatInputCommand:()=>kind==='slash',isRepliable:()=>true,
  deferReply:async function(p){calls.push(['private',p.ephemeral]);this.deferred=true;},deferUpdate:async function(){calls.push(['update']);this.deferred=true;},
  editReply:async p=>calls.push(['edit',p.content]),followUp:async p=>calls.push(['follow',p.ephemeral])};
}
for(const [kind,id,expected] of [['slash','','private'],['button','event:join:x','update'],['button','fight:extend:x','update'],['button','line:ready:x','update'],['button','line:roster:x','private'],['button','event:rules:x','private'],['modal','event:wager:u:x:r','private']]){
 test(`${kind} ${id||'/race'} acknowledges before blocked bootstrap without bypassing it`,async()=>{
  const i=fixture(kind,id);let release;const blocked=new Promise(r=>release=r);
  const pending=runWithEventAcknowledgement('interactionCreate',[i],{events:true,special:true},async()=>{assert.equal(i.calls[0][0],expected);await blocked;return'checked';},async()=>assert.fail('not a bet'));
  await new Promise(r=>setImmediate(r));assert.equal(i.calls.length,1);release();assert.equal(await pending,'checked');
 });
}
test('bet display alone skips bootstrap, while wager submission retains bootstrap',async()=>{
 const i=fixture('button','event:bet:x:r');await runWithEventAcknowledgement('interactionCreate',[i],{events:true,special:true},()=>assert.fail('modal display must not wait for DB'),async button=>{assert.equal(button,i);i.calls.push(['modal']);});assert.deepEqual(i.calls,[['modal']]);
});
test('disabled feature does not acknowledge or bypass normal routing',async()=>{
 const i=fixture('slash');let routed=false;await runWithEventAcknowledgement('interactionCreate',[i],{events:false,special:false},()=>{routed=true;},async()=>assert.fail());assert.ok(routed);assert.deepEqual(i.calls,[]);
});
test('cold bootstrap failure resolves private deferred reply and propagates failure',async()=>{
 const i=fixture('slash');await assert.rejects(runWithEventAcknowledgement('interactionCreate',[i],{events:true,special:true},()=>{throw Error('DB unavailable');},async()=>{}),/DB unavailable/);assert.deepEqual(i.calls.map(c=>c[0]),['private','edit']);
});
