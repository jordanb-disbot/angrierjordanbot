import {randomUUID} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {productionTarget,GUILD} from './audit-production-race-line.mjs';

const BOT_CHANNEL='1537333882846842930';
const check=(ok,code)=>{if(!ok)throw Error(code);};

/** Enables only the accepted Crime feature after validating its live destination. */
export async function enableProductionCrime({db,config,get,write=console.log}){
 check(await db.guild.findUnique({where:{id:GUILD},select:{id:true}}),'PRODUCTION_GUILD_MISSING');
 const channel=await get(`/channels/${BOT_CHANNEL}`);
 check(channel?.id===BOT_CHANNEL&&channel.guild_id===GUILD&&channel.type===0,'CRIME_BOT_CHANNEL_INVALID');
 const current=await config.getWithMetadata(GUILD,'features.crime');
 if(current.version===0||current.value!==true)await config.set({guildId:GUILD,key:'features.crime',value:true,expectedVersion:current.version,source:'operator.production-crime-enablement',requestId:randomUUID()});
 const saved=await config.getWithMetadata(GUILD,'features.crime');
 check(saved.value===true,'CRIME_FEATURE_VERIFY_FAILED');
 write('PASS: production guild, private Railway database, and Bots Don’t Sit verified.');
 write('PASS: features.crime=true. Add ENABLE_CRIME_SMOKE=true before worker redeploy.');
}

export async function main(env=process.env,{connect,fetcher=fetch,write=console.log,error=console.error}={}){
 let db;
 try{
  const target=productionTarget(env),connection=connect?await connect(target):await connectProduction(target);db=connection.db;
  const get=async path=>{check(env.DISCORD_TOKEN,'DISCORD_TOKEN_MISSING');const response=await fetcher('https://discord.com/api/v10'+path,{headers:{Authorization:'Bot '+env.DISCORD_TOKEN},signal:AbortSignal.timeout(15000)});check(response.ok,'DISCORD_READ_FAILED');return response.json();};
  await enableProductionCrime({...connection,get,write});
 }catch(cause){const safe=/^[A-Z][A-Z0-9_]+$/.test(cause?.message??'')?cause.message:'PRODUCTION_CRIME_ENABLEMENT_FAILED';error(`FAIL: ${safe}. No exception details displayed.`);return 1;
 }finally{if(db)try{await db.$disconnect();}catch{error('FAIL: DATABASE_DISCONNECT_FAILED.');return 1;}}
 return 0;
}

async function connectProduction(target){
 const [{PrismaClient},{PrismaConfigRepository,PrismaAuditSink},{ConfigService},{AuditService},{SETTINGS}]=await Promise.all([import('@prisma/client'),import('../dist/packages/database/src/prisma-adapters.js'),import('../dist/packages/core/src/config-service.js'),import('../dist/packages/core/src/audit.js'),import('../dist/packages/contracts/src/generated/settings.js')]);
 const db=new PrismaClient({datasourceUrl:target.databaseUrl,log:[]});return{db,config:new ConfigService(SETTINGS,new PrismaConfigRepository(db),new AuditService(new PrismaAuditSink(db)))};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)process.exitCode=await main();
