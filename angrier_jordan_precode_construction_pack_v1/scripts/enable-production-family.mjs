import {randomUUID} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {productionTarget,GUILD} from './audit-production-race-line.mjs';

const FEATURE='features.family';
const POLICY=['family.marriage_vote_hours','family.auction_min_hours','family.auction_max_hours','family.cooldown_base_seconds','family.cooldown_max_seconds','family.cooldown_quiet_hours'];
const check=(ok,code)=>{if(!ok)throw Error(code);};

export function familyTarget(env){
 const target=productionTarget(env);
 const secret=env.FAMILY_COMPATIBILITY_SECRET??'';
 check(secret.trim().length>=32&&!secret.includes('${'),'FAMILY_COMPATIBILITY_SECRET_INVALID');
 check(typeof env.DISCORD_TOKEN==='string'&&env.DISCORD_TOKEN.length>0,'DISCORD_TOKEN_MISSING');
 return target;
}

export async function enableProductionFamily({db,config,get,write=console.log}){
 check(await db.guild.findUnique({where:{id:GUILD},select:{id:true}}),'PRODUCTION_GUILD_MISSING');
 check(config.definition(FEATURE)?.type==='boolean','FAMILY_SCHEMA_INVALID');
 const channel=(await config.getWithMetadata(GUILD,'channels.bot_channel')).value;
 check(typeof channel==='string'&&/^[1-9]\d{16,19}$/.test(channel),'FAMILY_BOT_CHANNEL_MISSING');
 const discordChannel=await get(`/channels/${channel}`);
 check(discordChannel?.id===channel&&discordChannel.guild_id===GUILD&&[0,5].includes(discordChannel.type),'FAMILY_BOT_CHANNEL_INVALID');
 const values=new Map();
 for(const key of POLICY){
  const definition=config.definition(key),value=(await config.getWithMetadata(GUILD,key)).value;
  check(definition?.type==='integer'&&Number.isInteger(value)&&value>=definition.min&&value<=definition.max,'FAMILY_POLICY_INVALID');
  values.set(key,value);
 }
 check(values.get('family.auction_min_hours')<=values.get('family.auction_max_hours'),'FAMILY_POLICY_INVALID');
 check(values.get('family.cooldown_base_seconds')<=values.get('family.cooldown_max_seconds'),'FAMILY_POLICY_INVALID');
 const before=await config.getWithMetadata(GUILD,FEATURE);
 check(typeof before.value==='boolean','FAMILY_FEATURE_INVALID');
 if(before.value!==true)await config.set({guildId:GUILD,key:FEATURE,value:true,expectedVersion:before.version,source:'operator.production-family-enablement',requestId:randomUUID()});
 const after=await config.getWithMetadata(GUILD,FEATURE);
 check(after.value===true&&(before.value===true||after.version>before.version),'FAMILY_FEATURE_VERIFY_FAILED');
 write('PASS: production environment, guild, private Railway database, Family secret, and Discord bot channel verified.');
 write('PASS: existing Family policy settings verified and preserved.');
 write('PASS: features.family=true; no unrelated settings or Family data changed.');
}

export async function main(env=process.env,{connect,fetcher=fetch,write=console.log,error=console.error}={}){
 let db;
 try{
  const target=familyTarget(env);
  const connection=connect?await connect(target):await connectProduction(target);db=connection.db;
  const get=async path=>{
   const response=await fetcher('https://discord.com/api/v10'+path,{method:'GET',headers:{Authorization:'Bot '+env.DISCORD_TOKEN},signal:AbortSignal.timeout(15000)});
   check(response.ok,'DISCORD_READ_FAILED');return response.json();
  };
  await enableProductionFamily({...connection,get,write});
 }catch(cause){
  const safe=/^[A-Z][A-Z0-9_]+$/.test(cause?.message??'')?cause.message:'PRODUCTION_FAMILY_FAILED';
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
