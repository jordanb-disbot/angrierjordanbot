import test from 'node:test';
import assert from 'node:assert/strict';
import {TypeShitResponder} from '../../dist/apps/bot/src/discord/type-shit-responder.js';

const message=({content='',stickers=[]}={})=>{const replies=[];return{guild:{id:'guild'},author:{bot:false},content,stickers:new Map(stickers.map((name,index)=>[String(index),{name}])),reply:async payload=>{replies.push(payload);},replies};};

test('type_shit message emoji and TS sticker each receive a reply without mentions',async()=>{
  const responder=new TypeShitResponder(),m=message({content:'<:type_shit:1> <:type_shit:2>',stickers:['TS']});
  await responder.message(m);
  assert.equal(m.replies.length,3);assert.deepEqual(m.replies[0],{content:'Shit',allowedMentions:{parse:[]}});
});

test('each type_shit reaction replies to its source message once',async()=>{
  const responder=new TypeShitResponder(),m=message(),reaction={emoji:{name:'type_shit'},partial:false,message:m};
  await responder.reaction(reaction,{bot:false});
  await responder.reaction(reaction,{bot:false});
  assert.equal(m.replies.length,2);
});
