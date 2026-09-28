import {pathToFileURL} from 'node:url';
import {productionTarget,GUILD} from './audit-production-race-line.mjs';

const KEYS=['roles.jailed','channels.hotseat_channel'];
const EXPECTED_ROLE='1550658793384312922';
const EXPECTED_CHANNEL='1553646766967103570';
const check=(condition,code)=>{if(!condition)throw Error(code);};
const safeId=value=>typeof value==='string'&&/^\d{17,20}$/.test(value)?value:value===null?null:'INVALID';

export async function auditProductionJail({db,get,write=console.log}){
 const rows=await db.$transaction(async tx=>{
  await tx.$executeRawUnsafe('SET TRANSACTION READ ONLY');
  check(await tx.guild.findUnique({where:{id:GUILD},select:{id:true}}),'PRODUCTION_GUILD_MISSING');
  return tx.configValue.findMany({where:{guildId:GUILD,key:{in:KEYS}},select:{key:true,value:true}});
 });
 const values=Object.fromEntries(KEYS.map(key=>[key,rows.find(row=>row.key===key)?.value??null]));
 const [bot,roles,channel]=await Promise.all([get('/users/@me'),get(`/guilds/${GUILD}/roles`),get(`/channels/${EXPECTED_CHANNEL}`)]);
 check(/^\d{17,20}$/.test(bot?.id??'')&&Array.isArray(roles),'DISCORD_ROLE_READ_INVALID');
 const member=await get(`/guilds/${GUILD}/members/${bot.id}`);
 const role=roles.find(row=>row.id===EXPECTED_ROLE),botRoles=roles.filter(row=>member.roles?.includes(row.id));
 const botTop=Math.max(0,...botRoles.map(row=>row.position));
 const manageRoles=botRoles.some(row=>(BigInt(row.permissions)&((1n<<28n)|(1n<<3n)))!==0n);
 const manageable=Boolean(role&&!role.managed&&manageRoles&&botTop>role.position);
 write(`PASS: roles.jailed configured=${JSON.stringify(safeId(values['roles.jailed']))}; expected=${EXPECTED_ROLE}; match=${values['roles.jailed']===EXPECTED_ROLE}.`);
 write(`PASS: Restraint Chair exists=${Boolean(role)}; name=${JSON.stringify(role?.name??null)}; bot_manage_roles=${manageRoles}; bot_top_position=${botTop}; target_position=${role?.position??'missing'}; manageable=${manageable}.`);
 write(`PASS: channels.hotseat_channel configured=${JSON.stringify(safeId(values['channels.hotseat_channel']))}; expected=${EXPECTED_CHANNEL}; match=${values['channels.hotseat_channel']===EXPECTED_CHANNEL}.`);
 write(`PASS: Hotseat Discord channel exists=${channel?.id===EXPECTED_CHANNEL&&channel.guild_id===GUILD}; name=${JSON.stringify(channel?.name??null)}.`);
 write('PASS: production jail mapping audit finished; database transaction was read-only and no Discord changes were made.');
 return {values,manageable,channelExists:channel?.id===EXPECTED_CHANNEL&&channel.guild_id===GUILD};
}

export async function main(env=process.env,{connect,fetcher=fetch,write=console.log,error=console.error}={}){
 let db,stage='target';
 try{
  const target=productionTarget(env);
  check(typeof env.DISCORD_TOKEN==='string'&&env.DISCORD_TOKEN.length>0,'DISCORD_TOKEN_MISSING');
  stage='connect';db=connect?await connect(target):new (await import('@prisma/client')).PrismaClient({datasourceUrl:target.databaseUrl,log:[]});
  const get=async path=>{const response=await fetcher('https://discord.com/api/v10'+path,{method:'GET',headers:{Authorization:'Bot '+env.DISCORD_TOKEN},signal:AbortSignal.timeout(15000)});check(response.ok,'DISCORD_READ_FAILED');return response.json();};
  stage='audit';await auditProductionJail({db,get,write});
 }catch(cause){const safe=/^[A-Z][A-Z0-9_]+$/.test(cause?.message??'')?cause.message:'PRODUCTION_JAIL_AUDIT_FAILED';error(`FAIL: ${safe} at ${stage}. No exception details displayed.`);return 1;
 }finally{if(db)try{await db.$disconnect();}catch{error('FAIL: DATABASE_DISCONNECT_FAILED.');return 1;}}
 return 0;
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)process.exitCode=await main();
