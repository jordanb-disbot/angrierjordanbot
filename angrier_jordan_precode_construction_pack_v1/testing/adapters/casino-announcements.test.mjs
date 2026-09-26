import test from 'node:test';
import assert from 'node:assert/strict';
import {DiscordCasinoAnnouncements} from '../../dist/apps/bot/src/discord/casino-announcements.js';

test('disabled casino and lottery announcements reject before Discord or persistence so delivery can retry',async()=>{
 const forbidden=new Proxy({},{get(){throw Error('No external effects allowed');}});
 for(const [jobType,feature] of [['casino.jackpot_announce','features.casino'],['lottery.announce','features.lottery']]){
  const keys=[];
  const announcements=new DiscordCasinoAnnouncements(forbidden,{get:async(_server,key)=>{keys.push(key);return false;}});
  await assert.rejects(()=>announcements.deliver(forbidden,{id:'job',guildId:'server',jobType,payload:{userId:'member',amount:'100'}}),/retain pending delivery/);
  assert.deepEqual(keys,[feature]);
 }
});

test('lottery publication is independent of the ordinary casino feature switch',async()=>{
 const keys=[];
 const announcements=new DiscordCasinoAnnouncements({}, {get:async(_server,key)=>{keys.push(key);return key==='features.lottery';}});
 await assert.rejects(()=>announcements.deliver({}, {id:'job',guildId:'server',jobType:'lottery.announce',payload:{userId:'member',amount:'100'}}),/channel is not configured/);
 assert.deepEqual(keys,['features.lottery','channels.bot_channel']);
});
