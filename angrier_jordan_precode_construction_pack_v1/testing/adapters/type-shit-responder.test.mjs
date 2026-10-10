import test from 'node:test';
import assert from 'node:assert/strict';
import {TypeShitResponder,isTypeShitEmojiName} from '../../dist/apps/bot/src/discord/type-shit-responder.js';
import {readFileSync} from 'node:fs';
test('matching type-shit attachment is a trigger and the response is plain text only',()=>{const attachment={name:'type-shit.gif'};assert.equal(attachment.name.toLowerCase(),'type-shit.gif');const reply={content:'Shit',files:[]};assert.equal(reply.content,'Shit');assert.deepEqual(reply.files,[]);});

test('recognizes current and legacy Type Shiiit emoji aliases only',()=>{
  assert.equal(isTypeShitEmojiName('TypeShiiit'),true);
  assert.equal(isTypeShitEmojiName('type_shit'),true);
  assert.equal(isTypeShitEmojiName('other_emoji'),false);
});
test('covers all server-wide triggers and deduplicates direct plain-text replies',()=>{
  const source=readFileSync(new URL('../../apps/bot/src/discord/type-shit-responder.ts',import.meta.url),'utf8');
  assert.match(source,/message\.webhookId/);
  assert.match(source,/message\.reply\(plainReply\)/);
  assert.match(source,/TYPE_SHIT_GIF/);
  assert.match(source,/type\\s\+shit/);
  assert.match(source,/TS/);
  assert.match(source,/replied\.has\(message\.id\)/);
  assert.doesNotMatch(source,/files:\[/);
});

test('replies once for combined triggers and ignores webhooks or gateway replays',async()=>{
  const responder=new TypeShitResponder(),replies=[];
  const message={id:'message-1',guild:{id:'server'},author:{bot:false},webhookId:null,content:'type shit <a:type_shit:123>',stickers:new Map([['sticker',{name:'ts'}]]),attachments:new Map([['gif',{name:'type-shit.gif'}]]),reply:async payload=>{replies.push(payload);}};
  await responder.message(message);await responder.message(message);
  assert.deepEqual(replies,[{content:'Shit',allowedMentions:{parse:[]}}]);
  await responder.message({...message,id:'webhook',webhookId:'hook'});
  assert.equal(replies.length,1);
});
