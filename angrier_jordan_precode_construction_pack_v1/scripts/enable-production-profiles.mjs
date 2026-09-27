import {randomUUID} from 'node:crypto';
import {pathToFileURL} from 'node:url';

const guildId='1524964384642957432';
const settings=[['features.spotlight',false],['features.profiles',true],['features.activity',true]];

export function productionProfilesTarget(env){
  if(env.NODE_ENV!=='production'||env.AJ_DATABASE_PURPOSE!=='production'||env.DISCORD_GUILD_ID!==guildId)throw new Error('Invalid production target');
  let url;try{url=new URL(env.DATABASE_URL);}catch{throw new Error('Invalid database target');}
  if(!['postgres:','postgresql:'].includes(url.protocol)||!url.hostname.endsWith('.railway.internal'))throw new Error('Private PostgreSQL required');
  return {guildId,databaseUrl:env.DATABASE_URL};
}

// Each ConfigService write atomically commits the value, revision and audit.
// A partial failure is safely resumable; matching persisted values are skipped.
export async function enableProductionProfiles({db,config,write=console.log}){
  if(!await db.guild.findUnique({where:{id:guildId},select:{id:true}}))throw new Error('Production guild missing');
  for(const [key,value] of settings){
    const current=await config.getWithMetadata(guildId,key);
    if(current.version===0||current.value!==value)await config.set({guildId,key,value,expectedVersion:current.version,source:'operator.production-profiles-enablement',requestId:randomUUID()});
  }
  for(const [key,value] of settings){
    const current=await config.getWithMetadata(guildId,key);
    if(current.value!==value||!Number.isSafeInteger(current.version)||current.version<1)throw new Error('Verification failed');
  }
  for(const [key,value] of settings)write(`PASS: ${key}=${value}.`);
}

export async function main(env=process.env,{connect,write=console.log,error=console.error}={}){
  let db;
  try{
    const target=productionProfilesTarget(env);
    const connection=connect?await connect(target):await connectProduction(target);
    db=connection.db;
    await enableProductionProfiles({...connection,write});
  }catch{
    error('FAIL: Production Profiles configuration failed; verify target and persisted settings before retrying. No exception details displayed.');
    return 1;
  }finally{
    if(db)try{await db.$disconnect();}catch{
      error('FAIL: Database disconnect failed.');
      return 1;
    }
  }
  return 0;
}

async function connectProduction(target){
  const [{PrismaClient},{PrismaConfigRepository,PrismaAuditSink},{ConfigService},{AuditService},{SETTINGS}]=await Promise.all([
    import('@prisma/client'),import('../dist/packages/database/src/prisma-adapters.js'),import('../dist/packages/core/src/config-service.js'),import('../dist/packages/core/src/audit.js'),import('../dist/packages/contracts/src/generated/settings.js')]);
  const db=new PrismaClient({datasourceUrl:target.databaseUrl,log:[]});
  return {db,config:new ConfigService(SETTINGS,new PrismaConfigRepository(db),new AuditService(new PrismaAuditSink(db)))};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)process.exitCode=await main();
