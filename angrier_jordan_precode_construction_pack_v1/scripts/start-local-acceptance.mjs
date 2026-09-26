import {readFileSync} from 'node:fs';
import {parseEnv} from 'node:util';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {randomUUID} from 'node:crypto';
import {testServerTarget} from './test-server.mjs';

const groups={
 MUSIC:['music.enabled'],SOCIAL:['features.social','features.haiku'],INTRODUCTIONS:['features.introductions'],
 LEARNING:['features.learning','features.tldr','tutorial.enabled'],WYR:['features.party_games'],
 ONBOARDING:['roles_panel.enabled'],EVENTS:['features.race','features.fight'],
 SPECIAL:['features.special_commands','features.line','special_commands.enabled'],COMMUNITY:['features.community'],
 CRIME:['features.crime'],CHAIRISMS:['features.chairisms'],PARTY:['features.party_games'],
 CHANNEL_GAMES:['features.channel_games'],PVP:['features.pvp'],SOLO:['features.solo_games'],
 CASINO:['features.casino','features.lottery'],PROFILES:['features.profiles','features.activity','features.spotlight'],
 ITEMS:['features.items'],ECONOMY:[],FAMILY:['features.family'],JAIL:[],MODERATION:[],SECURITY:[]
};
const excluded=new Set(['JAIL','MODERATION','SECURITY']);
const channelInputs={ACCEPTANCE_MAIN_CHAT_CHANNEL_ID:'channels.main_chat',ACCEPTANCE_BOT_CHANNEL_ID:'channels.bot_channel',ACCEPTANCE_GAMES_CHANNEL_ID:'channels.games_channel',ACCEPTANCE_INTRODUCTION_CHANNEL_ID:'channels.introduction_channel'};
export function acceptancePlan(musicText,testText){
 const target=testServerTarget(musicText,testText),local=parseEnv(musicText),environment={...local,NODE_ENV:'development',DATABASE_URL:target.databaseUrl},settings=new Map();
 for(const [name,keys] of Object.entries(groups)){
  const key='ENABLE_'+name+'_SMOKE',raw=local[key];if(raw!==undefined&&!['true','false'].includes(raw))throw Error('INVALID_SMOKE_FLAG');
  const enabled=!excluded.has(name)&&raw==='true';environment[key]=String(enabled);
  for(const setting of keys)settings.set(setting,(settings.get(setting)??false)||enabled);
 }
 // Validate before connecting or synchronizing any test-server settings. Never include the value in errors.
 if(environment.ENABLE_FAMILY_SMOKE==='true'){
  const secret=local.FAMILY_COMPATIBILITY_SECRET??'';
  if(secret.trim().length<32||secret.includes('${'))throw Error('FAMILY_COMPATIBILITY_SECRET_REQUIRED_MIN_32_CHARACTERS');
 }
 // Lore remains content-gated; no prose or unrelated settings are invented here.
 for(const [input,key] of Object.entries(channelInputs))if(local[input]){if(!/^[1-9]\d{16,19}$/.test(local[input]))throw Error('INVALID_ACCEPTANCE_CHANNEL');settings.set(key,local[input]);}
 return{...target,environment,settings};
}
export async function prepareAcceptance(plan,{config,serverExists}){
 if(!await serverExists(plan.guildId))throw Error('TEST_SERVER_NOT_INITIALIZED');
 const required=new Set();
 if(plan.environment.ENABLE_SOCIAL_SMOKE==='true')required.add('channels.main_chat');
 if(plan.environment.ENABLE_INTRODUCTIONS_SMOKE==='true')required.add('channels.introduction_channel');
 if(['COMMUNITY','CRIME','ITEMS','FAMILY'].some(name=>plan.environment['ENABLE_'+name+'_SMOKE']==='true'))required.add('channels.bot_channel');
 if(['WYR','EVENTS','PARTY','PVP','SOLO','CASINO'].some(name=>plan.environment['ENABLE_'+name+'_SMOKE']==='true'))required.add('channels.games_channel');
 const missing=[];for(const key of required){const value=plan.settings.get(key)??await config.get(plan.guildId,key);if(typeof value!=='string'||!/^[1-9]\d{16,19}$/.test(value))missing.push(key);}
 if(missing.length){const error=Error('ACCEPTANCE_CHANNELS_REQUIRED');error.keys=missing;throw error;}
 for(const [key,value] of plan.settings){const current=await config.getWithMetadata(plan.guildId,key);if(current.value===value)continue;await config.set({guildId:plan.guildId,key,value,expectedVersion:current.version,source:'operator.local-acceptance',requestId:randomUUID()});}
}
export async function runLocalAcceptance(){
 let db;try{
  const root=new URL('../',import.meta.url),plan=acceptancePlan(readFileSync(new URL('.env.music.local',root),'utf8'),readFileSync(new URL('.env.test.local',root),'utf8'));
  const [{PrismaClient},{PrismaConfigRepository,PrismaAuditSink},{ConfigService,AuditService},{SETTINGS}]=await Promise.all([import('@prisma/client'),import('../dist/packages/database/src/prisma-adapters.js'),import('../dist/packages/core/src/index.js'),import('../dist/packages/contracts/src/generated/settings.js')]);
  db=new PrismaClient({datasourceUrl:plan.databaseUrl,log:[]});const config=new ConfigService(SETTINGS,new PrismaConfigRepository(db),new AuditService(new PrismaAuditSink(db)));
  await prepareAcceptance(plan,{config,serverExists:async guildId=>Boolean(await db.guild.findUnique({where:{id:guildId},select:{id:true}}))});await db.$disconnect();db=undefined;
  Object.assign(process.env,plan.environment);process.chdir(fileURLToPath(root));
  const {startProductionBot}=await import('../dist/apps/bot/src/production.js');await startProductionBot();
 }catch(error){
  const known=['DEVELOPMENT_REQUIRED','SERVER_ID_REQUIRED','TEST_DATABASE_REQUIRED','INVALID_TEST_DATABASE','DISPOSABLE_TARGET_REQUIRED','INVALID_SMOKE_FLAG','INVALID_ACCEPTANCE_CHANNEL','TEST_SERVER_NOT_INITIALIZED','ACCEPTANCE_CHANNELS_REQUIRED','FAMILY_COMPATIBILITY_SECRET_REQUIRED_MIN_32_CHARACTERS'];
  const code=known.includes(error?.message)?error.message:'LOCAL_ACCEPTANCE_STARTUP_FAILED';console.error(code+(code==='ACCEPTANCE_CHANNELS_REQUIRED'?': '+error.keys.join(', '):''));process.exitCode=1;
 }finally{await db?.$disconnect();}
}
if(process.argv[1]&&pathToFileURL(process.argv[1]).href===import.meta.url)await runLocalAcceptance();
