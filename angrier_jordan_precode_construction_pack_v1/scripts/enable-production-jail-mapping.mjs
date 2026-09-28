import {randomUUID} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {productionTarget,GUILD} from './audit-production-race-line.mjs';

export const JAIL_ROLE='1550658793384312922';
export const HOTSEAT_CHANNEL='1553646766967103570';
export const JAIL_MAPPINGS=[['roles.jailed',JAIL_ROLE],['channels.hotseat_channel',HOTSEAT_CHANNEL]];
const check=(ok,code)=>{if(!ok)throw Error(code);};

export async function enableProductionJailMapping({db,config,get,write=console.log}){
 check(await db.guild.findUnique({where:{id:GUILD},select:{id:true}}),'PRODUCTION_GUILD_MISSING');
 check(config.definition('roles.jailed')?.type==='discord_role'&&config.definition('channels.hotseat_channel')?.type==='discord_channel','JAIL_MAPPING_SCHEMA_INVALID');
 const [bot,roles,channel]=await Promise.all([get('/users/@me'),get(`/guilds/${GUILD}/roles`),get(`/channels/${HOTSEAT_CHANNEL}`)]);
 check(/^\d{17,20}$/.test(bot?.id??'')&&Array.isArray(roles),'DISCORD_ROLE_READ_INVALID');
 const member=await get(`/guilds/${GUILD}/members/${bot.id}`);
 const role=roles.find(row=>row.id===JAIL_ROLE);
 check(role&&!role.managed,'JAIL_ROLE_INVALID');
 const botRoles=roles.filter(row=>member.roles?.includes(row.id)||row.id===GUILD);
 const botTop=Math.max(0,...botRoles.map(row=>row.position));
 const manageRoles=botRoles.some(row=>(BigInt(row.permissions)&((1n<<28n)|(1n<<3n)))!==0n);
 check(manageRoles&&botTop>role.position,'JAIL_ROLE_UNMANAGEABLE');
 check(channel?.id===HOTSEAT_CHANNEL&&channel.guild_id===GUILD&&channel.type===0,'HOTSEAT_CHANNEL_INVALID');
 // All Discord and schema checks complete before the first audited setting write.
 for(const [key,value] of JAIL_MAPPINGS){
  const current=await config.getWithMetadata(GUILD,key);
  if(current.value!==value)await config.set({guildId:GUILD,key,value,expectedVersion:current.version,source:'operator.production-jail-mapping',requestId:randomUUID()});
 }
 for(const [key,value] of JAIL_MAPPINGS)check((await config.getWithMetadata(GUILD,key)).value===value,'JAIL_MAPPING_VERIFY_FAILED');
 write('PASS: production environment, guild, private Railway database, role, channel, and bot hierarchy verified.');
 write(`PASS: roles.jailed=${JAIL_ROLE}; bot_can_manage=true.`);
 write(`PASS: channels.hotseat_channel=${HOTSEAT_CHANNEL}.`);
 write('PASS: only the two Jail mappings were written through audited ConfigService; Discord permissions unchanged.');
}

export async function main(env=process.env,{connect,fetcher=fetch,write=console.log,error=console.error}={}){
 let db,stage='target';
 try{
  const target=productionTarget(env);
  check(typeof env.DISCORD_TOKEN==='string'&&env.DISCORD_TOKEN.length>0,'DISCORD_TOKEN_MISSING');
  stage='connect';const connection=connect?await connect(target):await connectProduction(target);db=connection.db;
  const get=async path=>{const response=await fetcher('https://discord.com/api/v10'+path,{method:'GET',headers:{Authorization:'Bot '+env.DISCORD_TOKEN},signal:AbortSignal.timeout(15000)});check(response.ok,'DISCORD_READ_FAILED');return response.json();};
  stage='preflight_and_write';await enableProductionJailMapping({...connection,get,write});
 }catch(cause){const safe=/^[A-Z][A-Z0-9_]+$/.test(cause?.message??'')?cause.message:'PRODUCTION_JAIL_MAPPING_FAILED';error(`FAIL: ${safe} at ${stage}. No exception details displayed.`);return 1;
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
