import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {acceptancePlan,prepareAcceptance} from '../../scripts/start-local-acceptance.mjs';
const server='111111111111111111',channel='222222222222222222';
const env=(extra='')=>`NODE_ENV=development\nDISCORD_GUILD_ID=${server}\nENABLE_SOCIAL_SMOKE=true\nENABLE_INTRODUCTIONS_SMOKE=true\n${extra}`;
const database='TEST_DATABASE_URL=postgresql://fixture:fixture-only@ballast.proxy.rlwy.net:14970/railway';
function fixture(){const values=new Map(['channels.main_chat','channels.introduction_channel','channels.bot_channel','channels.games_channel'].map(key=>[key,channel])),writes=[];return{values,writes,serverExists:async id=>id===server,config:{get:async(_g,key)=>values.get(key)??false,getWithMetadata:async(_g,key)=>({value:values.get(key)??false,version:1}),set:async input=>{assert.equal(input.guildId,server);assert.equal(input.expectedVersion,1);writes.push(input);values.set(input.key,input.value);}}};}
test('One explicit local snapshot drives runtime flags and persisted test gates, not inherited process flags',async()=>{const plan=acceptancePlan(env('ENABLE_WYR_SMOKE=false\nENABLE_PARTY_SMOKE=true'),database),f=fixture();await prepareAcceptance(plan,f);assert.equal(plan.environment.ENABLE_SOCIAL_SMOKE,'true');assert.equal(f.values.get('features.social'),true);assert.equal(f.values.get('features.introductions'),true);assert.equal(f.values.get('features.party_games'),true);assert.equal(plan.environment.ENABLE_EVENTS_SMOKE,'false');assert.equal(await f.config.get(server,'features.race'),false);assert.ok(f.writes.every(w=>w.source==='operator.local-acceptance'));const count=f.writes.length;await prepareAcceptance(plan,f);assert.equal(f.writes.length,count);});
test('Jail opts in independently; Moderation and Security stay excluded and Lore stays untouched',()=>{const plan=acceptancePlan(env('ENABLE_FAMILY_SMOKE=false\nENABLE_JAIL_SMOKE=true\nENABLE_MODERATION_SMOKE=true\nENABLE_SECURITY_SMOKE=true\nENABLE_LEARNING_SMOKE=true'),database);for(const name of ['FAMILY','MODERATION','SECURITY'])assert.equal(plan.environment['ENABLE_'+name+'_SMOKE'],'false');assert.equal(plan.environment.ENABLE_JAIL_SMOKE,'true');assert.equal(acceptancePlan(env(),database).environment.ENABLE_JAIL_SMOKE,'false');for(const key of ['features.lore','channels.main_chat'])assert.equal(plan.settings.has(key),false);});
test('Every runtime smoke flag is explicitly resolved before runtime import',()=>{const source=readFileSync(new URL('../../apps/bot/src/production.ts',import.meta.url),'utf8'),plan=acceptancePlan(env(),database);for(const match of source.matchAll(/process\.env\.(ENABLE_[A-Z_]+_SMOKE)/g))assert.ok(['true','false'].includes(plan.environment[match[1]]),match[1]);const launcher=readFileSync(new URL('../../scripts/start-local-acceptance.mjs',import.meta.url),'utf8');assert.ok(launcher.indexOf('await prepareAcceptance(plan')<launcher.indexOf('Object.assign(process.env'));assert.ok(launcher.indexOf('Object.assign(process.env')<launcher.indexOf("import('../dist/apps/bot/src/production.js')"));});
test('Production, ambient DATABASE_URL and invalid values cannot select a database',()=>{for(const [music,db] of [[env().replace('development','production'),database],[env(),'DATABASE_URL=postgresql://fixture:fixture@localhost/db'],[env(),database.replace('ballast.proxy.rlwy.net','localhost')],[env('ENABLE_MUSIC_SMOKE=yes'),database]])assert.throws(()=>acceptancePlan(music,db));});
test('Missing required channels fail before any writes; explicit test mappings use ConfigService',async()=>{const f=fixture();f.values.clear();await assert.rejects(prepareAcceptance(acceptancePlan(env(),database),f),{message:'ACCEPTANCE_CHANNELS_REQUIRED'});assert.equal(f.writes.length,0);const plan=acceptancePlan(env(`ACCEPTANCE_MAIN_CHAT_CHANNEL_ID=${channel}\nACCEPTANCE_INTRODUCTION_CHANNEL_ID=${channel}`),database);await prepareAcceptance(plan,f);assert.equal(f.values.get('channels.main_chat'),channel);assert.equal(f.values.get('channels.introduction_channel'),channel);});
test('Race and Line remain canonical prefix commands, with Fight as slash',()=>{const commands=JSON.parse(readFileSync(new URL('../../generated/discord/application_commands.json',import.meta.url)));assert.equal(commands.some(c=>['race','line'].includes(c.name)),false);assert.ok(commands.some(c=>c.name==='fight'));const plan=acceptancePlan(env('ENABLE_EVENTS_SMOKE=true\nENABLE_SPECIAL_SMOKE=true'),database);for(const key of ['features.race','features.fight','features.line'])assert.equal(plan.settings.get(key),true);});
const familyFixture='fixture-only-family-key-not-for-runtime';
test('Family opt-in synchronizes only the disposable server through versioned ConfigService and stays idempotent',async()=>{
 const plan=acceptancePlan(env(`ENABLE_FAMILY_SMOKE=true\nFAMILY_COMPATIBILITY_SECRET=${familyFixture}`),database),f=fixture();
 assert.equal(plan.environment.ENABLE_FAMILY_SMOKE,'true');assert.equal(plan.environment.FAMILY_COMPATIBILITY_SECRET,familyFixture);assert.equal(plan.settings.get('features.family'),true);
 await prepareAcceptance(plan,f);assert.equal(f.values.get('features.family'),true);const writes=f.writes.length;await prepareAcceptance(plan,f);assert.equal(f.writes.length,writes);
 assert.ok(f.writes.some(w=>w.key==='features.family'&&w.value===true&&w.guildId===server&&w.expectedVersion===1));
 for(const k of ['features.jail','features.moderation','features.security'])assert.equal(plan.settings.has(k),false);
});
test('Missing, short, whitespace and unresolved Family secrets fail before settings access without disclosing values',()=>{
 for(const secret of [undefined,'x'.repeat(31),' '.repeat(40),'${UNRESOLVED_FAMILY_KEY_WITH_PADDING}']){
  assert.throws(()=>acceptancePlan(env('ENABLE_FAMILY_SMOKE=true'+(secret===undefined?'':`\nFAMILY_COMPATIBILITY_SECRET="${secret}"`)),database),{message:'FAMILY_COMPATIBILITY_SECRET_REQUIRED_MIN_32_CHARACTERS'});
 }
 const plan=acceptancePlan(env('ENABLE_FAMILY_SMOKE=true\nFAMILY_COMPATIBILITY_SECRET='+ 'x'.repeat(32)),database);assert.equal(plan.settings.get('features.family'),true);
});
test('Family off needs no secret and synchronizes its persisted gate off',async()=>{
 const f=fixture();f.values.set('features.family',true);await prepareAcceptance(acceptancePlan(env(),database),f);assert.equal(f.values.get('features.family'),false);
});
test('Family alone requires the bot channel before any settings writes',async()=>{
 const f=fixture();f.values.delete('channels.bot_channel');const plan=acceptancePlan(`NODE_ENV=development\nDISCORD_GUILD_ID=${server}\nENABLE_FAMILY_SMOKE=true\nFAMILY_COMPATIBILITY_SECRET=${familyFixture}`,database);
 await assert.rejects(prepareAcceptance(plan,f),e=>e.message==='ACCEPTANCE_CHANNELS_REQUIRED'&&e.keys.join(',')==='channels.bot_channel');assert.equal(f.writes.length,0);
});
test('Family opt-in cannot bypass development or disposable database restrictions',()=>{
 const text=env(`ENABLE_FAMILY_SMOKE=true\nFAMILY_COMPATIBILITY_SECRET=${familyFixture}`);
 assert.throws(()=>acceptancePlan(text.replace('development','production'),database),{message:'DEVELOPMENT_REQUIRED'});
 assert.throws(()=>acceptancePlan(text,database.replace('ballast.proxy.rlwy.net','production.example')),{message:'DISPOSABLE_TARGET_REQUIRED'});
});
