import test from 'node:test';
import assert from 'node:assert/strict';
import {testServerTarget,runTestServer} from '../../scripts/test-server.mjs';
const guildId='123456789012345678',music=`NODE_ENV=development\nDISCORD_GUILD_ID=${guildId}`;
const databaseUrl='postgresql://fixture:fixture@ballast.proxy.rlwy.net:14970/railway';
test('test command reads only dedicated test URL and selected Discord server',()=>{
  assert.deepEqual(testServerTarget(music,`TEST_DATABASE_URL=${databaseUrl}`),{guildId,databaseUrl});
  for(const value of ['',`DATABASE_URL=${databaseUrl}`,'TEST_DATABASE_URL=postgresql://fixture:fixture@production:5432/railway',`TEST_DATABASE_URL=${databaseUrl}?schema=production`,`TEST_DATABASE_URL=${databaseUrl.replace('/railway','/other')}`])assert.throws(()=>testServerTarget(music,value));
  for(const value of [music.replace('development','production'),music.replace(guildId,'invalid')])assert.throws(()=>testServerTarget(value,`TEST_DATABASE_URL=${databaseUrl}`));
});
function harness(){const calls=[];let value=false,version=0;return {calls,deps:{guildId,db:{guild:{findUnique:async()=>({id:guildId})}},bootstrap:{ensure:async input=>{calls.push(['bootstrap',input]);return {created:true};}},config:{getWithMetadata:async()=>({value,version}),set:async input=>{calls.push(['set',input]);value=input.value;version++;}},write:message=>calls.push(['output',message])}};}
test('bootstrap uses shared path for DISCORD_GUILD_ID without enabling or reading settings',async()=>{const h=harness();h.deps.config=new Proxy({},{get(){throw new Error('unexpected config access');}});await runTestServer('bootstrap',h.deps);assert.deepEqual(h.calls[0],['bootstrap',{guildId,source:'operator.bootstrap'}]);assert.equal(h.calls.length,2);});
test('verification modes perform reads only and report value/version',async()=>{for(const mode of ['status','music-status']){const h=harness();await runTestServer(mode,h.deps);assert.ok(h.calls.every(c=>c[0]==='output'));assert.match(h.calls[1][1],/music.enabled=false; version=0/);}});
test('Music opt-in changes only music.enabled through versioned ConfigService and repeats no-op',async()=>{const h=harness();await runTestServer('enable-music',h.deps);await runTestServer('enable-music',h.deps);const writes=h.calls.filter(c=>c[0]==='set');assert.equal(writes.length,1);assert.equal(writes[0][1].guildId,guildId);assert.equal(writes[0][1].key,'music.enabled');assert.equal(writes[0][1].expectedVersion,0);assert.equal(writes[0][1].value,true);assert.ok(!h.calls.some(c=>c[0]==='bootstrap'));});
test('missing server and unknown mode cannot write',async()=>{const h=harness();h.deps.db.guild.findUnique=async()=>null;await assert.rejects(runTestServer('enable-music',h.deps),/SERVER_NOT_INITIALIZED/);await assert.rejects(runTestServer('typo',h.deps),/UNKNOWN_COMMAND/);assert.deepEqual(h.calls,[]);});
