import {randomUUID} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {isDeepStrictEqual} from 'node:util';

const guildId='1524964384642957432';
const channelId='1537333091180355655';

export function productionIntroductionsTarget(env){
  if(env.NODE_ENV!=='production'||env.AJ_DATABASE_PURPOSE!=='production'||env.DISCORD_GUILD_ID!==guildId)throw new Error('Invalid production target');
  let url;try{url=new URL(env.DATABASE_URL);}catch{throw new Error('Invalid database target');}
  if(!['postgres:','postgresql:'].includes(url.protocol)||!url.hostname.endsWith('.railway.internal'))throw new Error('Private PostgreSQL required');
  return {guildId,databaseUrl:env.DATABASE_URL};
}

// Each ConfigService write atomically commits the value, revision and audit.
// A partial failure is safely resumable; matching persisted values are skipped.
export async function enableProductionIntroductions({db,config,repo,domain,write=console.log}){
  if(!await db.guild.findUnique({where:{id:guildId},select:{id:true}}))throw new Error('Production guild missing');
  const currentForm=await config.getWithMetadata(guildId,'introductions.form');
  const valid=value=>{try{domain.validateIntroForm(value,value);return true;}catch{return false;}};
  let form=currentForm.value,origin='existing published form';
  if(!valid(form)){
    const storedConfig=await db.introductionFormConfig.findUnique({where:{guildId}});
    const storedForm=await db.introductionForm.findFirst({where:{guildId,enabled:true},include:{prompts:true},orderBy:[{version:'desc'},{id:'asc'}]});
    const candidate=storedConfig&&storedForm?{title:storedForm.title,prompts:storedForm.prompts.map(({formId,...p})=>p),...Object.fromEntries(['headerText','footerText','showAvatar','showDisplayName','showJoinDate','allowAdminIntroConfig'].map(key=>[key,storedConfig[key]]))}:null;
    if(valid(candidate)){form=candidate;origin='existing runtime form';}
    else{form={title:'Your introduction',headerText:'PULL UP A CHAIR',footerText:'Welcome to Chairs. Make yourself comfortable.',showAvatar:true,showDisplayName:true,showJoinDate:false,allowAdminIntroConfig:false,prompts:domain.INTRO_DEFAULTS.map((p,n)=>({...p,id:guildId+'_'+p.id,sortOrder:n,placeholder:null,minLength:null,enabled:true,showOnCard:true,deletedAt:null}))};origin='approved default form';}
  }
  domain.validateIntroForm(form,form);
  form=JSON.parse(JSON.stringify(form));
  if(!valid(currentForm.value))await config.set({guildId,key:'introductions.form',value:JSON.parse(JSON.stringify(form)),expectedVersion:currentForm.version,source:'operator.production-introductions-enablement',requestId:randomUUID()});
  const settings=[['channels.introduction_channel',channelId],['features.introductions',true]];
  for(const [key,value] of settings){
    if(key==='features.introductions'){
      await repo.configure(guildId,channelId,form);
      const runtime=await repo.configuration(guildId);
      domain.validateIntroForm(runtime.form,runtime.config);
      if(runtime.config.introductionChannelId!==channelId)throw new Error('Runtime destination mismatch');
    }
    const current=await config.getWithMetadata(guildId,key);
    if(current.version===0||current.value!==value)await config.set({guildId,key,value,expectedVersion:current.version,source:'operator.production-introductions-enablement',requestId:randomUUID()});
  }
  const verifiedForm=await config.getWithMetadata(guildId,'introductions.form');
  domain.validateIntroForm(verifiedForm.value,verifiedForm.value);
  if(!isDeepStrictEqual(verifiedForm.value,form))throw new Error('Form changed during setup');
  for(const [key,value] of settings){
    const current=await config.getWithMetadata(guildId,key);
    if(current.value!==value||!Number.isSafeInteger(current.version)||current.version<1)throw new Error('Verification failed');
  }
  write(`PASS: introductions.form valid; ${origin}.`);
  for(const [key,value] of settings)write(`PASS: ${key}=${value}.`);
}

export async function main(env=process.env,{connect,write=console.log,error=console.error}={}){
  let db;
  try{
    const target=productionIntroductionsTarget(env);
    const connection=connect?await connect(target):await connectProduction(target);
    db=connection.db;
    await enableProductionIntroductions({...connection,write});
  }catch{
    error('FAIL: Production Introductions configuration failed; verify target and persisted settings before retrying. No exception details displayed.');
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
  const [domain,{PrismaIntroductionsRepository}]=await Promise.all([import('../dist/packages/features-introductions/src/domain.js'),import('../dist/packages/features-introductions/src/prisma-repository.js')]);
  const db=new PrismaClient({datasourceUrl:target.databaseUrl,log:[]});
  return {db,config:new ConfigService(SETTINGS,new PrismaConfigRepository(db),new AuditService(new PrismaAuditSink(db))),domain,repo:new PrismaIntroductionsRepository(db)};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)process.exitCode=await main();
