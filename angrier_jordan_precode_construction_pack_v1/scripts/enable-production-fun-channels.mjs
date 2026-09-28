import {randomUUID} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import {pathToFileURL} from 'node:url';
import {productionTarget,GUILD,MAIN_CHAT} from './audit-production-race-line.mjs';

export const GAMES='1537335115359715430';
export const FUN='1537333882846842930';
export const TARGET_SETTINGS=[
 ['features.fight',true],
 ['fight.additional_channel_ids',[FUN]],
 ['party_games.additional_channel_ids',[FUN]],
];
const check=(ok,code)=>{if(!ok)throw Error(code);};

export async function enableProductionFunChannels({db,config,get,write=console.log}){
 check(await db.guild.findUnique({where:{id:GUILD},select:{id:true}}),'PRODUCTION_GUILD_MISSING');
 const channels=await Promise.all([MAIN_CHAT,GAMES,FUN].map(id=>get(`/channels/${id}`)));
 for(let n=0;n<channels.length;n++)check(channels[n]?.id===[MAIN_CHAT,GAMES,FUN][n]&&channels[n].guild_id===GUILD&&channels[n].type===0,'FUN_CHANNEL_INVALID');
 check(await config.get(GUILD,'channels.main_chat')===MAIN_CHAT,'MAIN_CHAT_MAPPING_INVALID');
 check(await config.get(GUILD,'channels.games_channel')===GAMES,'GAMES_CHANNEL_MAPPING_INVALID');
 check(await config.get(GUILD,'features.party_games')===true,'PARTY_GAMES_DISABLED');
 check(config.definition('fight.additional_channel_ids')?.type==='json'&&config.definition('party_games.additional_channel_ids')?.type==='json','FUN_CHANNEL_SCHEMA_INVALID');
 for(const [key,value] of TARGET_SETTINGS){
  const current=await config.getWithMetadata(GUILD,key);
  check(key==='features.fight'?typeof current.value==='boolean':Array.isArray(current.value)&&current.value.every(id=>typeof id==='string'&&/^\d{17,20}$/.test(id)),'FUN_SETTING_INVALID');
  if(key!=='features.fight')check(current.value.length===0||isDeepStrictEqual(current.value,value),'EXISTING_FUN_CHANNELS_REQUIRE_REVIEW');
  if(!isDeepStrictEqual(current.value,value))await config.set({guildId:GUILD,key,value,expectedVersion:current.version,source:'operator.production-fun-channels',requestId:randomUUID()});
 }
 for(const [key,value] of TARGET_SETTINGS)check(isDeepStrictEqual(await config.get(GUILD,key),value),'FUN_SETTING_VERIFY_FAILED');
 write('PASS: production guild and three Discord text channels verified.');
 write(`PASS: Fight channels=${MAIN_CHAT},${FUN}; features.fight=true.`);
 write(`PASS: FMK/WYR/WWYD/Truth or Dare channels=${GAMES},${FUN}; features.party_games=true.`);
 write('PASS: existing primary channel mappings and unrelated settings preserved.');
}

export async function main(env=process.env,{connect,fetcher=fetch,write=console.log,error=console.error}={}){
 let db;
 try{
  const target=productionTarget(env);
  check(typeof env.DISCORD_TOKEN==='string'&&env.DISCORD_TOKEN.length>0,'DISCORD_TOKEN_MISSING');
  const connection=connect?await connect(target):await connectProduction(target);db=connection.db;
  const get=async path=>{const response=await fetcher('https://discord.com/api/v10'+path,{method:'GET',headers:{Authorization:'Bot '+env.DISCORD_TOKEN},signal:AbortSignal.timeout(15000)});check(response.ok,'DISCORD_READ_FAILED');return response.json();};
  await enableProductionFunChannels({...connection,get,write});
 }catch(cause){const safe=/^[A-Z][A-Z0-9_]+$/.test(cause?.message??'')?cause.message:'PRODUCTION_FUN_CHANNELS_FAILED';error(`FAIL: ${safe}. No exception details displayed.`);return 1;
 }finally{if(db)try{await db.$disconnect();}catch{error('FAIL: DATABASE_DISCONNECT_FAILED.');return 1;}}
 return 0;
}

async function connectProduction(target){
 const [{PrismaClient},{PrismaConfigRepository,PrismaAuditSink},{ConfigService},{AuditService},{SETTINGS}]=await Promise.all([
  import('@prisma/client'),import('../dist/packages/database/src/prisma-adapters.js'),import('../dist/packages/core/src/config-service.js'),import('../dist/packages/core/src/audit.js'),import('../dist/packages/contracts/src/generated/settings.js')]);
 const db=new PrismaClient({datasourceUrl:target.databaseUrl,log:[]});
 return {db,config:new ConfigService(SETTINGS,new PrismaConfigRepository(db),new AuditService(new PrismaAuditSink(db)))};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)process.exitCode=await main();
