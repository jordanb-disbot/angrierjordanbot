import {randomUUID} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import {pathToFileURL} from 'node:url';
import {productionTarget,GUILD} from './audit-production-race-line.mjs';

export const GAME_CHANNELS={
 'channels.games_channel':'1537335115359715430',
 'channels.one_word_story_channel':'1542477674780557365',
 'channels.last_letter_channel':'1537683580380123216',
 'channels.counting_channel':'1551003550044262470',
};
export const GAME_SETTINGS=[
 ...Object.entries(GAME_CHANNELS),
 ['solo.reward',0],
 ['solo.daily_reward_cap',0],
 ['features.solo_games',true],
 ['features.party_games',true],
 ['features.channel_games',true],
];
const check=(ok,code)=>{if(!ok)throw Error(code);};

export async function enableProductionGames({db,config,get,write=console.log}){
 check(await db.guild.findUnique({where:{id:GUILD},select:{id:true}}),'PRODUCTION_GUILD_MISSING');
 const channels=await Promise.all(Object.values(GAME_CHANNELS).map(id=>get(`/channels/${id}`)));
 for(let index=0;index<channels.length;index++){
  const channel=channels[index],id=Object.values(GAME_CHANNELS)[index];
  check(channel?.id===id&&channel.guild_id===GUILD&&channel.type===0,'GAME_CHANNEL_INVALID');
 }
 check(new Set(Object.values(GAME_CHANNELS)).size===4,'GAME_CHANNELS_NOT_DISTINCT');
 // All Discord and guild checks finish before any audited setting mutation.
 for(const [key,value] of GAME_SETTINGS){
  const current=await config.getWithMetadata(GUILD,key);
  if(current.version===0||!isDeepStrictEqual(current.value,value))await config.set({guildId:GUILD,key,value,expectedVersion:current.version,source:'operator.production-games-enablement',requestId:randomUUID()});
 }
 for(const [key,value] of GAME_SETTINGS){
  const saved=await config.getWithMetadata(GUILD,key);
  check(saved.version>=1&&isDeepStrictEqual(saved.value,value),'GAME_SETTING_VERIFY_FAILED');
 }
 write('PASS: production guild, private Railway database, and four Discord game channels verified.');
 for(const [key,value] of GAME_SETTINGS)write(`PASS: ${key}=${JSON.stringify(value)}.`);
 write('PASS: solo rewards and daily cap are zero; no game wagers or unrelated feature settings changed.');
}

export async function main(env=process.env,{connect,fetcher=fetch,write=console.log,error=console.error}={}){
 let db;
 try{
  const target=productionTarget(env);
  const connection=connect?await connect(target):await connectProduction(target);db=connection.db;
  const get=async path=>{
   check(env.DISCORD_TOKEN,'DISCORD_TOKEN_MISSING');
   const response=await fetcher('https://discord.com/api/v10'+path,{method:'GET',headers:{Authorization:'Bot '+env.DISCORD_TOKEN},signal:AbortSignal.timeout(15000)});
   check(response.ok,'DISCORD_READ_FAILED');return response.json();
  };
  await enableProductionGames({...connection,get,write});
 }catch(cause){
  const safe=/^[A-Z][A-Z0-9_]+$/.test(cause?.message??'')?cause.message:'PRODUCTION_GAMES_FAILED';
  error(`FAIL: ${safe}. No exception details displayed.`);return 1;
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
