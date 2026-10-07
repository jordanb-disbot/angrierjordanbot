import test from 'node:test';
import assert from 'node:assert/strict';
import {interactiveGameChannelAllowed} from '../../dist/apps/bot/src/discord/interactive-game-channels.js';
test('legacy prefix mode allows main chat without widening other game modes',async()=>{
 const config={get:async(_g,key)=>({ 'channels.main_chat':'main','channels.games_channel':'games','channels.bot_channel':'bot'}[key])};
 assert.equal(await interactiveGameChannelAllowed(config,'g','main'),false);
 assert.equal(await interactiveGameChannelAllowed(config,'g','main',true),true);
 assert.equal(await interactiveGameChannelAllowed(config,'g','games'),true);
 assert.equal(await interactiveGameChannelAllowed(config,'g','other',true),false);
});
