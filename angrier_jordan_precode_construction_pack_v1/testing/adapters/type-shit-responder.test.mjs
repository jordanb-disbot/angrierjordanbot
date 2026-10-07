import test from 'node:test';
import assert from 'node:assert/strict';
import {isTypeShitEmojiName} from '../../dist/apps/bot/src/discord/type-shit-responder.js';

test('recognizes current and legacy Type Shiiit emoji aliases only',()=>{
  assert.equal(isTypeShitEmojiName('TypeShiiit'),true);
  assert.equal(isTypeShitEmojiName('type_shit'),true);
  assert.equal(isTypeShitEmojiName('other_emoji'),false);
});
