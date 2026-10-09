import test from 'node:test';
import assert from 'node:assert/strict';
import {TypeShitResponder,isTypeShitEmojiName} from '../../dist/apps/bot/src/discord/type-shit-responder.js';

const collection=items=>new Map(items.map((value,index)=>[String(index),value]));
function message(overrides={}){
 const calls=[];
 return {id:'message-1',guild:{id:'guild'},author:{bot:false},webhookId:null,content:'',stickers:collection([]),attachments:collection([]),reply:async payload=>{calls.push(payload);},calls,...overrides};
}
test('matching type-shit triggers receive one plain reply even with multiple matches',async()=>{
 const responder=new TypeShitResponder(),m=message({content:'type shit <a:type_shit:1>',stickers:collection([{name:'TS'}]),attachments:collection([{name:'type-shit.gif'}])});
 await responder.message(m);
 assert.deepEqual(m.calls,[{content:'Shit',allowedMentions:{parse:[]}}]);
 await responder.message(m);
 assert.equal(m.calls.length,1);
});
test('webhooks and bots are excluded and reactions share the same one-event guard',async()=>{
 const responder=new TypeShitResponder(),m=message({webhookId:'webhook',content:'type shit'});
 await responder.message(m);assert.equal(m.calls.length,0);
 const eligible=message();
 await responder.reaction({partial:false,emoji:{name:'type_shit'},message:eligible},{bot:false});
 await responder.reaction({partial:false,emoji:{name:'type_shit'},message:eligible},{bot:false});
 assert.equal(eligible.calls.length,1);
});
test('recognizes the supported Type Shit emoji aliases only',()=>{
 assert.equal(isTypeShitEmojiName('typeshit'),true);
 assert.equal(isTypeShitEmojiName('type_shit'),true);
 assert.equal(isTypeShitEmojiName('TypeShiiit'),false);
 assert.equal(isTypeShitEmojiName('other_emoji'),false);
});
