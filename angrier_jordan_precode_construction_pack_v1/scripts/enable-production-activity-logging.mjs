import {randomUUID} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {productionTarget,GUILD} from './audit-production-race-line.mjs';

export const LOG_CHANNEL='1538321358310867104';
const VIEW=1n<<10n,SEND=1n<<11n,ADMIN=1n<<3n;
const check=(value,code)=>{if(!value)throw Error(code);};
const bits=value=>BigInt(value??'0');
const effective=(roles,overwrites,ids)=>{
 let value=roles.filter(role=>role.id===GUILD||ids.includes(role.id)).reduce((sum,role)=>sum|bits(role.permissions),0n);
 if(value&ADMIN)return value;
 const everyone=overwrites.find(row=>row.id===GUILD);
 if(everyone)value=(value&~bits(everyone.deny))|bits(everyone.allow);
 let allow=0n,deny=0n;for(const row of overwrites.filter(row=>row.type===0&&ids.includes(row.id))){allow|=bits(row.allow);deny|=bits(row.deny);}
 return(value&~deny)|allow;
};

export function verifyAdminOnlyLogChannel({channels,roles,botMember,botId}){
 const channel=channels.find(row=>row.id===LOG_CHANNEL),parent=channels.find(row=>row.id===channel?.parent_id);
 check(channel?.guild_id===GUILD&&channel.type===0,'ACTIVITY_LOG_CHANNEL_INVALID');
 check(parent?.guild_id===GUILD&&parent.type===4,'ACTIVITY_LOG_CATEGORY_INVALID');
 check(Array.isArray(roles)&&Array.isArray(botMember?.roles)&&botMember.user?.id===botId,'ACTIVITY_LOG_BOT_INVALID');
 const botIds=botMember.roles,botPermissions=effective(roles,channel.permission_overwrites??[],botIds);
 check(Boolean(botPermissions&ADMIN)||Boolean(botPermissions&VIEW)&&Boolean(botPermissions&SEND),'ACTIVITY_LOG_BOT_ACCESS_MISSING');
 for(const scope of [parent,channel]){
  const overwrites=scope.permission_overwrites??[];
  check(Array.isArray(overwrites),'ACTIVITY_LOG_OVERWRITES_INVALID');
  for(const row of overwrites.filter(item=>bits(item.allow)&VIEW)){
   const role=roles.find(item=>item.id===row.id);
   check(row.type===0&&role&&(bits(role.permissions)&ADMIN||botIds.includes(row.id)),'ACTIVITY_LOG_NONADMIN_BYPASS');
  }
 }
 check(!(effective(roles,channel.permission_overwrites??[],[])&VIEW),'ACTIVITY_LOG_EVERYONE_BYPASS');
 return {channel,parent};
}

export async function enableProductionActivityLogging({db,config,get,dryRun=false,write=console.log}){
 check(await db.guild.findUnique({where:{id:GUILD},select:{id:true}}),'PRODUCTION_GUILD_MISSING');
 check(config.definition('channels.staff_log')?.type==='discord_channel','STAFF_LOG_SCHEMA_INVALID');
 const [channels,roles,bot]=await Promise.all([get(`/guilds/${GUILD}/channels`),get(`/guilds/${GUILD}/roles`),get('/users/@me')]);
 const botMember=await get(`/guilds/${GUILD}/members/${bot.id}`);
 verifyAdminOnlyLogChannel({channels,roles,botMember,botId:bot.id});
 const before=await config.getWithMetadata(GUILD,'channels.staff_log');
 if(dryRun){write(`PASS: production guild, private Railway database, and admin-only log channel ${LOG_CHANNEL} verified.`);write(`PLAN: channels.staff_log ${before.value===LOG_CHANNEL?'already correct':`will map to ${LOG_CHANNEL}`}; no writes.`);return;}
 if(before.value!==LOG_CHANNEL)await config.set({guildId:GUILD,key:'channels.staff_log',value:LOG_CHANNEL,expectedVersion:before.version,source:'operator.production-activity-logging',requestId:randomUUID()});
 const after=await config.getWithMetadata(GUILD,'channels.staff_log');
 check(after.value===LOG_CHANNEL,'STAFF_LOG_MAPPING_VERIFY_FAILED');
 write(`PASS: production guild, private Railway database, and admin-only log channel ${LOG_CHANNEL} verified.`);
 write('PASS: bot can view and send; @everyone and non-admin roles cannot view the activity log.');
 write(`PASS: channels.staff_log=${LOG_CHANNEL}; unrelated settings and roles unchanged.`);
}

export async function main(env=process.env,{connect,fetcher=fetch,write=console.log,error=console.error}={}){
 let db,stage='target';
 try{
  const target=productionTarget(env);check(typeof env.DISCORD_TOKEN==='string'&&env.DISCORD_TOKEN.length>0,'DISCORD_TOKEN_MISSING');
  stage='connect';const connection=connect?await connect(target):await connectProduction(target);db=connection.db;
  const get=async path=>{const response=await fetcher('https://discord.com/api/v10'+path,{headers:{Authorization:'Bot '+env.DISCORD_TOKEN},signal:AbortSignal.timeout(15000)});check(response.ok,'DISCORD_READ_FAILED');return response.json();};
  stage='verify_and_map';await enableProductionActivityLogging({...connection,get,dryRun:env.ACTIVITY_LOGGING_DRY_RUN==='true',write});
 }catch(cause){const safe=/^[A-Z][A-Z0-9_]+$/.test(cause?.message??'')?cause.message:'PRODUCTION_ACTIVITY_LOGGING_FAILED';error(`FAIL: ${safe} at ${stage}. No exception details displayed.`);return 1;
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
