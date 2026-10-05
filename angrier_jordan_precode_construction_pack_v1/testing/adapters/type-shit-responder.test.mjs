import test from 'node:test';
import assert from 'node:assert/strict';
import {TypeShitResponder} from '../../dist/apps/bot/src/discord/type-shit-responder.js';

const message=({content='',stickers=[],attachments=[]}={})=>{const replies=[],sent=[];return{guild:{id:'guild'},author:{bot:false},content,stickers:new Map(stickers.map((name,index)=>[String(index),{name}])),attachments:new Map(attachments.map((name,index)=>[String(index),{name}])),channel:{isSendable:()=>true,send:async payload=>{sent.push(payload);}},delete:async()=>{},reply:async payload=>{replies.push(payload);},replies,sent};};

test('type_shit message emoji and TS sticker each receive a reply without mentions',async()=>{
  const responder=new TypeShitResponder(),m=message({content:'<:type_shit:1> <:type_shit:2>',stickers:['TS']});
  await responder.message(m);
  assert.equal(m.replies.length,3);assert.deepEqual(m.replies[0],{content:'Shit',allowedMentions:{parse:[]}});
});

test('plain type shit is case-insensitive and replies for each use',async()=>{
  const responder=new TypeShitResponder(),m=message({content:'Type shit, then type   shit again.'});
  await responder.message(m);
  assert.equal(m.replies.length,2);
});

test('a user-posted type-shit GIF receives one reply regardless of playback loops',async()=>{
  const responder=new TypeShitResponder(),m=message({attachments:['type-shit.gif']});
  await responder.message(m);
  assert.equal(m.replies.length,1);
});

test('each type_shit reaction replies to its source message once',async()=>{
  const responder=new TypeShitResponder(),m=message(),reaction={emoji:{name:'type_shit'},partial:false,message:m};
  await responder.reaction(reaction,{bot:false});
  await responder.reaction(reaction,{bot:false});
  assert.equal(m.replies.length,2);
});

test('!typeshit removes the trigger and sends the packaged animated GIF',async()=>{
  const responder=new TypeShitResponder(),m=message({content:'!typeshit'});
  await responder.message(m);
  assert.equal(m.sent.length,1);assert.equal(m.sent[0].files[0].name,'type-shit.gif');
});
