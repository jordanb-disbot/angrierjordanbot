import test from 'node:test';
import assert from 'node:assert/strict';
import {DiscordJailCoordinator} from '../../dist/apps/bot/src/discord/jail-coordinator.js';
test('Jail roster is public to ordinary members and preserves requested sentence type',async()=>{let payload;const service={roster:async(server,type)=>{assert.equal(server,'g');assert.equal(type,'crime');return[];}},i={guildId:'g',guild:{id:'g'},user:{id:'ordinary'},options:{getSubcommand:()=> 'roster',getString:()=> 'crime'},reply:async p=>payload=p};await new DiscordJailCoordinator(service,{},{}).handleCommand(i);assert.match(payload.content,/Current jail roster — crime/);assert.notEqual(payload.ephemeral,true);});
