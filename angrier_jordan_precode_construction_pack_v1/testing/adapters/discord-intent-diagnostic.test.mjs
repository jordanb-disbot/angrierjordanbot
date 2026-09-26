import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {applicationIntentAccess,diagnoseIntents} from '../../scripts/check-discord-intents.mjs';
test('unverified test bot limited member flag is bit 15, not presence bit 12',()=>{
  assert.deepEqual(applicationIntentAccess({flags:32768|524288}),{members:{full:false,limited:true},messageContent:{full:false,limited:true}});
  for(const flags of [1<<12,1<<13,1<<1])assert.deepEqual(applicationIntentAccess({flags}).members,{full:false,limited:false});
  assert.deepEqual(applicationIntentAccess({flags:1<<14}).members,{full:true,limited:false});
});
test('current flags_new preserves high bits and legacy flags remain supported',()=>{
  assert.equal(applicationIntentAccess({flags_new:String((1n<<45n)|(1n<<15n)),flags:0}).members.limited,true);
  assert.equal(applicationIntentAccess({flags_new:'0',flags:1<<15}).members.limited,false);
  for(const application of [{},{flags:-1},{flags:Number.MAX_SAFE_INTEGER+1},{flags_new:'bad',flags:32768}])assert.throws(()=>applicationIntentAccess(application));
});
const env={DISCORD_TOKEN:'private-fixture-token',DISCORD_APPLICATION_ID:'111111111111111111'};
test('diagnostic is GET-only, checks app identity, and never claims Gateway acceptance',async()=>{
  const output=[];let calls=0;
  assert.equal(await diagnoseIntents(env,{write:x=>output.push(x),fetcher:async(url,options)=>{calls++;assert.equal(url,'https://discord.com/api/v10/oauth2/applications/@me');assert.equal(options.method,'GET');assert.equal(options.redirect,'error');assert.equal(options.headers.Authorization,'Bot '+env.DISCORD_TOKEN);return {ok:true,json:async()=>({id:env.DISCORD_APPLICATION_ID,flags:32768|524288})};}}),true);
  assert.equal(calls,1);assert.match(output.join('\n'),/limited\/test-bot/);assert.match(output.join('\n'),/NOT TESTED: Gateway/);assert.ok(!output.join('\n').includes(env.DISCORD_TOKEN));
});
test('missing flags are unknown; absent access fails; errors and mismatched identities reveal no payloads',async()=>{
  for(const response of [{ok:true,json:async()=>({id:env.DISCORD_APPLICATION_ID})},{ok:true,json:async()=>({id:env.DISCORD_APPLICATION_ID,flags:0})},{ok:true,json:async()=>({id:'different',secret:env.DISCORD_TOKEN})},{ok:false,status:401}]){
    const output=[];assert.equal(await diagnoseIntents(env,{write:x=>output.push(x),fetcher:async()=>response}),false);assert.ok(!output.join('\n').includes(env.DISCORD_TOKEN));
  }
  const output=[];await diagnoseIntents(env,{write:x=>output.push(x),fetcher:async()=>{throw Error(env.DISCORD_TOKEN);}});assert.deepEqual(output,['FAIL: DISCORD_NETWORK_OR_RESPONSE_ERROR']);
});
test('real runtime still requests GuildMembers and MessageContent independently of diagnostic flags',()=>{
  const source=readFileSync(new URL('../../apps/bot/src/production.ts',import.meta.url),'utf8');
  assert.match(source,/intents:\[[^\]]*GatewayIntentBits\.GuildMembers/);assert.match(source,/intents:\[[^\]]*GatewayIntentBits\.MessageContent/);
});
