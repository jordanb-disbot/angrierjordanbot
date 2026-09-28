import {randomUUID} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import {pathToFileURL} from 'node:url';
import {productionTarget,GUILD} from './audit-production-race-line.mjs';

const VIEW=1n<<10n,SEND=1n<<11n,HISTORY=1n<<16n;
const REACT=1n<<6n,USE_COMMANDS=1n<<31n,CONNECT=1n<<20n,SPEAK=1n<<21n;
const PUBLIC_THREADS=1n<<35n,PRIVATE_THREADS=1n<<36n,THREAD_SEND=1n<<38n;
const NORMAL_DENY=VIEW|SEND|REACT|USE_COMMANDS|CONNECT|SPEAK|PUBLIC_THREADS|PRIVATE_THREADS|THREAD_SEND;
const HOTSEAT_ALLOW=VIEW|SEND|HISTORY;
const JAIL_CATEGORY='1554032613939740702';
const check=(ok,code)=>{if(!ok)throw Error(code);};
const snowflake=value=>typeof value==='string'&&/^[1-9]\d{16,19}$/.test(value);
const parseBits=value=>{check(typeof value==='string'&&/^\d+$/.test(value),'OVERWRITE_BITS_INVALID');return BigInt(value);};
const otherOverwrites=(channel,roleId)=>(channel.permission_overwrites??[]).filter(row=>row.id!==roleId).map(row=>({id:row.id,type:row.type,allow:row.allow,deny:row.deny})).sort((a,b)=>a.id.localeCompare(b.id));

export function planJailPermissions({roles,channels,botMember,botId,roleId,hotseatId}){
 check(snowflake(roleId)&&snowflake(hotseatId)&&snowflake(botId)&&Array.isArray(roles)&&Array.isArray(channels)&&Array.isArray(botMember?.roles),'JAIL_PREFLIGHT_INPUT_INVALID');
 const role=roles.find(row=>row.id===roleId),owned=roles.filter(row=>row.id===GUILD||botMember.roles.includes(row.id));
 check(role&&!role.managed&&role.id!==GUILD,'JAIL_ROLE_INVALID');
 check((BigInt(role.permissions)&(1n<<3n))===0n,'JAIL_ROLE_ADMINISTRATOR_UNSAFE');
 const permissions=owned.reduce((bits,row)=>bits|BigInt(row.permissions),0n),top=Math.max(0,...owned.map(row=>row.position));
 check(Boolean(permissions&((1n<<3n)|(1n<<28n)))&&top>role.position,'BOT_JAIL_ROLE_UNMANAGEABLE');
 const hotseat=channels.find(channel=>channel.id===hotseatId);
 check(hotseat?.guild_id===GUILD&&hotseat.type===0,'HOTSEAT_CHANNEL_INVALID');
 const jailCategory=channels.find(channel=>channel.id===JAIL_CATEGORY);
 check(jailCategory?.guild_id===GUILD&&jailCategory.type===4,'JAIL_CATEGORY_INVALID');
 check(hotseat.parent_id===JAIL_CATEGORY,'HOTSEAT_PARENT_CATEGORY_INVALID');
 const targets=[];
 for(const channel of channels){
  check(snowflake(channel.id)&&channel.guild_id===GUILD&&Array.isArray(channel.permission_overwrites),'GUILD_CHANNEL_INVALID');
  const old=channel.permission_overwrites.find(row=>row.id===roleId);
  check(!old||old.type===0,'JAIL_OVERWRITE_INVALID');
  const allow=old?parseBits(old.allow):0n,deny=old?parseBits(old.deny):0n,isHotseat=channel.id===hotseatId,isJailCategory=channel.id===JAIL_CATEGORY;
  const nextAllow=isHotseat?allow|HOTSEAT_ALLOW:isJailCategory?(allow&~NORMAL_DENY)|VIEW:allow&~NORMAL_DENY;
  const nextDeny=isHotseat?deny&~HOTSEAT_ALLOW:isJailCategory?(deny|NORMAL_DENY)&~VIEW:deny|NORMAL_DENY;
  targets.push({id:channel.id,name:channel.name??'',type:channel.type,isHotseat,isJailCategory,before:old?{allow:old.allow,deny:old.deny}:null,allow:nextAllow.toString(),deny:nextDeny.toString(),change:!old||old.allow!==nextAllow.toString()||old.deny!==nextDeny.toString()});
 }
 return targets.sort((a,b)=>(Number(a.isHotseat)-Number(b.isHotseat))||((a.type===4?0:1)-(b.type===4?0:1))||a.id.localeCompare(b.id));
}

export async function configureProductionJailPermissions({db,config,audit,get,put,dryRun=false,write=console.log}){
 check(await db.guild.findUnique({where:{id:GUILD},select:{id:true}}),'PRODUCTION_GUILD_MISSING');
 const roleId=await config.get(GUILD,'roles.jailed'),hotseatId=await config.get(GUILD,'channels.hotseat_channel');
 check(snowflake(roleId)&&snowflake(hotseatId),'JAIL_CONFIG_MAPPING_MISSING');
 const [bot,roles,channels]=await Promise.all([get('/users/@me'),get(`/guilds/${GUILD}/roles`),get(`/guilds/${GUILD}/channels`)]);
 check(snowflake(bot?.id),'BOT_ID_INVALID');
 const botMember=await get(`/guilds/${GUILD}/members/${bot.id}`);
 const plan=planJailPermissions({roles,channels,botMember,botId:bot.id,roleId,hotseatId});
 write(`PASS: production guild, private Railway database, configured Jail role ${roleId}, Jail category ${JAIL_CATEGORY}, Hotseat ${hotseatId} inside Jail category, bot permissions and hierarchy verified.`);
 write(`PASS: preflight planned ${plan.length} channel/category overwrites; ${plan.filter(row=>row.change).length} need changes; unrelated roles and settings are out of scope.`);
 if(dryRun){for(const row of plan)write(`PLAN: ${row.type===4?'category':'channel'} ${row.id} ${row.isHotseat?'Hotseat allow view/send/history':row.isJailCategory?'Jail category allow view':'normal deny view/send'} ${row.change?'change':'already_correct'}.`);write('PASS: dry run complete; no Discord or database writes.');return plan;}
 for(const row of plan){
  const channel=await get(`/channels/${row.id}`);
  check(channel?.id===row.id&&channel.guild_id===GUILD&&channel.type===row.type&&(!row.isHotseat||channel.parent_id===JAIL_CATEGORY)&&Array.isArray(channel.permission_overwrites),'CHANNEL_CHANGED_DURING_REPAIR');
  const current=channel.permission_overwrites.find(overwrite=>overwrite.id===roleId);
  const correct=current?.type===0&&current.allow===row.allow&&current.deny===row.deny;
  if(!correct){
   check((current?.allow??null)===(row.before?.allow??null)&&(current?.deny??null)===(row.before?.deny??null),'JAIL_OVERWRITE_CHANGED_DURING_REPAIR');
   const unrelated=otherOverwrites(channel,roleId);
   await put(`/channels/${row.id}/permissions/${roleId}`,{type:0,allow:row.allow,deny:row.deny});
   const verified=await get(`/channels/${row.id}`),actual=verified?.permission_overwrites?.find(overwrite=>overwrite.id===roleId);
   check(verified?.id===row.id&&actual?.type===0&&actual.allow===row.allow&&actual.deny===row.deny&&isDeepStrictEqual(otherOverwrites(verified,roleId),unrelated),'JAIL_OVERWRITE_VERIFY_FAILED');
   await audit.record({guildId:GUILD,source:'operator.production-jail-permissions',action:'discord.permission_overwrite.set',targetType:'channel',targetId:row.id,before:row.before,after:{roleId,allow:row.allow,deny:row.deny},requestId:randomUUID(),createdAt:new Date()});
  }
  write(`PASS: ${row.type===4?'category':'channel'} ${row.id} ${row.isHotseat?'Hotseat view/send/history allowed':row.isJailCategory?'Jail category view allowed':'normal view/send denied'}; ${correct?'already_correct':'updated'}; unrelated overwrites preserved.`);
 }
 write(`PASS: Jail permission maintenance complete for ${plan.length} channels/categories; no other role, setting, or bot configuration changed.`);
 return plan;
}

export async function main(env=process.env,{connect,fetcher=fetch,write=console.log,error=console.error}={}){
 let db,stage='target';
 try{
  const target=productionTarget(env);
  check(typeof env.DISCORD_TOKEN==='string'&&env.DISCORD_TOKEN.length>0,'DISCORD_TOKEN_MISSING');
  const dryRun=env.JAIL_PERMISSIONS_DRY_RUN==='true';
  stage='connect';const connection=connect?await connect(target):await connectProduction(target);db=connection.db;
  const request=async(method,path,body)=>{
   for(let attempt=0;attempt<5;attempt++){
    const response=await fetcher('https://discord.com/api/v10'+path,{method,headers:{Authorization:'Bot '+env.DISCORD_TOKEN,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(15000)});
    if(response.status===429){const wait=Number((await response.json())?.retry_after);check(Number.isFinite(wait)&&wait>=0&&wait<=60,'DISCORD_RATE_LIMIT_INVALID');await new Promise(resolve=>setTimeout(resolve,Math.ceil(wait*1000)+250));continue;}
    check(response.ok,'DISCORD_REQUEST_FAILED');if(method==='GET')return response.json();check(response.status===204,'DISCORD_WRITE_STATUS_INVALID');return;
   }
   throw Error('DISCORD_RATE_LIMIT_EXHAUSTED');
  };
  stage='preflight_and_permissions';await configureProductionJailPermissions({...connection,get:path=>request('GET',path),put:(path,body)=>request('PUT',path,body),dryRun,write});
 }catch(cause){const safe=/^[A-Z][A-Z0-9_]+$/.test(cause?.message??'')?cause.message:'PRODUCTION_JAIL_PERMISSIONS_FAILED';error(`FAIL: ${safe} at ${stage}. No exception details displayed.`);return 1;
 }finally{if(db)try{await db.$disconnect();}catch{error('FAIL: DATABASE_DISCONNECT_FAILED.');return 1;}}
 return 0;
}

async function connectProduction(target){
 const [{PrismaClient},{PrismaConfigRepository,PrismaAuditSink},{ConfigService},{AuditService},{SETTINGS}]=await Promise.all([
  import('@prisma/client'),import('../dist/packages/database/src/prisma-adapters.js'),import('../dist/packages/core/src/config-service.js'),import('../dist/packages/core/src/audit.js'),import('../dist/packages/contracts/src/generated/settings.js')]);
 const db=new PrismaClient({datasourceUrl:target.databaseUrl,log:[]}),audit=new AuditService(new PrismaAuditSink(db));
 return {db,config:new ConfigService(SETTINGS,new PrismaConfigRepository(db),audit),audit};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)process.exitCode=await main();
