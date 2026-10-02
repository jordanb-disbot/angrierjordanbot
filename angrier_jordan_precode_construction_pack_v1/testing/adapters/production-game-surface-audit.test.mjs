import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluateGameSurface,INTERACTIVE_GAME_FEATURES,DEDICATED_GAME_CHANNELS} from '../../scripts/audit-production-game-surface.mjs';

const values={
 'channels.games_channel':'1537335115359715430',
 'channels.bot_channel':'1537333882846842930',
 'features.channel_games':true,
 'channels.one_word_story_channel':'1542477674780557365',
 'channels.counting_channel':'1551003550044262470',
 'channels.last_letter_channel':'1537683580380123216',
};
for(const[,keys]of INTERACTIVE_GAME_FEATURES)for(const key of keys)values[key]=true;

test('game-surface audit certifies both shared command channels and dedicated message games',()=>{
 const result=evaluateGameSurface(values);
 assert.equal(result.sharedReady,true);
 assert.deepEqual(result.interactive.filter(item=>!item.enabled),[]);
 assert.deepEqual(result.dedicated.filter(item=>!item.enabled||!item.configured),[]);
 assert.equal(result.dedicated.length,DEDICATED_GAME_CHANNELS.length);
});

test('game-surface audit identifies an incomplete feature without treating it as enabled',()=>{
 const result=evaluateGameSurface({...values,'features.lottery':false,'channels.bot_channel':'not-a-channel'});
 assert.equal(result.sharedReady,false);
 assert.equal(result.interactive.find(item=>item.label==='Casino and Lottery').enabled,false);
});
