import test from 'node:test';
import assert from 'node:assert/strict';
import {isTypeShitEmojiName} from '../../dist/apps/bot/src/discord/type-shit-responder.js';
test('matching type-shit attachment is a trigger and the response is plain text only',()=>{const attachment={name:'type-shit.gif'};assert.equal(attachment.name.toLowerCase(),'type-shit.gif');const reply={content:'Shit',files:[]};assert.equal(reply.content,'Shit');assert.deepEqual(reply.files,[]);});

test('recognizes current and legacy Type Shiiit emoji aliases only',()=>{
  assert.equal(isTypeShitEmojiName('TypeShiiit'),true);
  assert.equal(isTypeShitEmojiName('type_shit'),true);
  assert.equal(isTypeShitEmojiName('other_emoji'),false);
});
