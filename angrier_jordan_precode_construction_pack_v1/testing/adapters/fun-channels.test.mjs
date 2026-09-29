import test from 'node:test';
import assert from 'node:assert/strict';
import {funChannelAllowed} from '../../dist/apps/bot/src/discord/fun-channels.js';
import {DiscordEventsCoordinator} from '../../dist/apps/bot/src/discord/events-coordinator.js';
import {DiscordPartyCoordinator} from '../../dist/apps/bot/src/discord/party-coordinator.js';
import {DiscordWyrCoordinator} from '../../dist/apps/bot/src/discord/wyr-coordinator.js';
import {enableProductionFunChannels,GAMES,FUN,TARGET_SETTINGS} from '../../scripts/enable-production-fun-channels.mjs';
import {GUILD,MAIN_CHAT} from '../../scripts/audit-production-race-line.mjs';

test('Fight and selected party games allow their primary and scoped secondary channels',async()=>{
 const values={'channels.main_chat':MAIN_CHAT,'channels.games_channel':GAMES,'fight.additional_channel_ids':[FUN],'party_games.additional_channel_ids':[FUN]};
 const config={get:async(_g,key)=>values[key]};
 for(const [kind,primary] of [['fight',MAIN_CHAT],['party',GAMES]]){
  assert.equal(await funChannelAllowed(config,GUILD,primary,kind),true);
  assert.equal(await funChannelAllowed(config,GUILD,FUN,kind),true);
  assert.equal(await funChannelAllowed(config,GUILD,'1537683580380123216',kind),false);
 }
 values['party_games.additional_channel_ids']=['bad'];
 assert.equal(await funChannelAllowed(config,GUILD,FUN,'party'),false);
});

test('Interactive games accept Gaming Chair and Bots Don’t Sit while rejecting other channels',async()=>{
 const values={'features.fight':true,'features.party_games':true,'channels.main_chat':MAIN_CHAT,'channels.games_channel':GAMES,'channels.bot_channel':FUN,'fight.additional_channel_ids':[FUN],'party_games.additional_channel_ids':[FUN]};
 const config={get:async(_g,key)=>values[key]};
 const eligible=async()=>true;
 const fight=new DiscordEventsCoordinator({},config,eligible),party=new DiscordPartyCoordinator({},config,eligible),wyr=new DiscordWyrCoordinator({},config,eligible);
 await fight.guard(GUILD,'member',FUN,'fight');
 for(const game of ['fmk','wwyd','truthordare'])await party.guard(GUILD,'member',FUN,game);
 await wyr.guard({guildId:GUILD,guild:{},channelId:FUN,user:{id:'member'}});
 await party.guard(GUILD,'member',FUN,'finishsentence');await fight.guard(GUILD,'member',GAMES,'fight');
 await assert.rejects(()=>party.guard(GUILD,'member','1537683580380123216','finishsentence'),/approved games channel/);
});

function fixture(){
 const values=new Map([['channels.main_chat',MAIN_CHAT],['channels.games_channel',GAMES],['features.party_games',true],['features.fight',false],['fight.additional_channel_ids',[]],['party_games.additional_channel_ids',[]]]),writes=[],output=[];
 const config={get:async(_g,key)=>values.get(key),getWithMetadata:async(_g,key)=>({value:values.get(key),version:values.has(key)?1:0}),definition:key=>({type:key.endsWith('additional_channel_ids')?'json':'boolean'}),set:async row=>{writes.push(row);values.set(row.key,row.value);}};
 const get=async path=>({id:path.split('/').at(-1),guild_id:GUILD,type:0});
 return {values,writes,output,config,get,db:{guild:{findUnique:async()=>({id:GUILD})}},run:()=>enableProductionFunChannels({db:{guild:{findUnique:async()=>({id:GUILD})}},config,get,write:line=>output.push(line)})};
}

test('production pass changes only Fight enablement and scoped channel lists; rerun is idempotent',async()=>{
 const f=fixture();await f.run();
 assert.deepEqual(f.writes.map(row=>row.key),TARGET_SETTINGS.map(([key])=>key));
 assert.equal(f.values.get('channels.main_chat'),MAIN_CHAT);assert.equal(f.values.get('channels.games_channel'),GAMES);
 assert.ok(f.output.every(line=>line.startsWith('PASS:')));
 await f.run();assert.equal(f.writes.length,3);
});

test('invalid channel or primary mapping prevents all writes',async()=>{
 for(const defect of ['channel','mapping']){const f=fixture();if(defect==='channel')f.get=async()=>({id:'0',guild_id:GUILD,type:0});else f.values.set('channels.main_chat','0');
  await assert.rejects(()=>enableProductionFunChannels({db:f.db,config:f.config,get:f.get}),/INVALID/);assert.equal(f.writes.length,0);
 }
});
