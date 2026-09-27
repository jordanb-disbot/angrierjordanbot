import {randomUUID} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import {pathToFileURL} from 'node:url';
import {productionTarget,GUILD,MAIN_CHAT,RACE_PING} from './audit-production-race-line.mjs';

const triggers=['!race','!line','!vc','!chess'];
const protectedKeys=['roles.throne','roles.chaise_lounge','roles.recliner','roles.jailed','roles.member_access','music.dj_role'];
const snowflake=v=>typeof v==='string'&&/^\d{17,20}$/.test(v);
const requireSafe=(ok,code)=>{if(!ok)throw Error(code);};

export function resolveMappings(roles,lineRoleId){
 const named=name=>{const matches=roles.filter(r=>r.name===name);requireSafe(matches.length===1,'PING_ROLE_MISSING_OR_AMBIGUOUS');return matches[0];};
 const line=lineRoleId?roles.find(r=>r.id===lineRoleId):named('Line Ping');
 const chosen={'!race':roles.find(r=>r.id===RACE_PING),'!line':line,'!vc':named('VC Ping'),'!chess':named('Chess Ping')};
 requireSafe(new Set(Object.values(chosen).map(r=>r?.id)).size===4,'PING_ROLES_NOT_DISTINCT');
 for(const role of Object.values(chosen))requireSafe(role&&snowflake(role.id)&&role.id!==GUILD&&!role.managed&&role.permissions==='0','UNSAFE_PING_ROLE');
 return Object.fromEntries(triggers.map(t=>[t,chosen[t].id]));
}

export function channelPermissions(roles,member,channel){
 let bits=roles.filter(r=>r.id===GUILD||member.roles.includes(r.id)).reduce((b,r)=>b|BigInt(r.permissions),0n);
 if(bits&8n)return {required:true,mention:true};
 const overwrites=channel.permission_overwrites??[],everyone=overwrites.find(o=>o.id===GUILD);
 if(everyone)bits=(bits&~BigInt(everyone.deny))|BigInt(everyone.allow);
 let allow=0n,deny=0n;for(const o of overwrites.filter(o=>o.type===0&&member.roles.includes(o.id))){allow|=BigInt(o.allow);deny|=BigInt(o.deny);}bits=(bits&~deny)|allow;
 const own=overwrites.find(o=>o.id===member.user.id);if(own)bits=(bits&~BigInt(own.deny))|BigInt(own.allow);
 const required=[10n,11n,13n,14n,15n,16n].reduce((b,n)=>b|(1n<<n),0n);
 return {required:(bits&required)===required,mention:Boolean(bits&(1n<<17n))};
}

export async function enableProductionRaceLine({db,config,get,lineRoleId,write=console.log}){
 requireSafe(await db.guild.findUnique({where:{id:GUILD},select:{id:true}}),'PRODUCTION_GUILD_MISSING');
 const [roles,channel,me]=await Promise.all([get(`/guilds/${GUILD}/roles`),get(`/channels/${MAIN_CHAT}`),get('/users/@me')]);
 requireSafe(channel.id===MAIN_CHAT&&channel.guild_id===GUILD&&channel.type===0,'MAIN_CHAT_INVALID');
 const member=await get(`/guilds/${GUILD}/members/${me.id}`),permissions=channelPermissions(roles,member,channel),map=resolveMappings(roles,lineRoleId);
 requireSafe(permissions.required,'BOT_CHANNEL_PERMISSIONS_MISSING');
 for(const id of Object.values(map))requireSafe(roles.find(r=>r.id===id).mentionable||permissions.mention,'PING_NOT_MENTIONABLE');
 const protectedRoles=await Promise.all(protectedKeys.map(key=>config.getWithMetadata(GUILD,key).then(r=>r.value)));
 requireSafe(!Object.values(map).some(id=>protectedRoles.includes(id)),'PROTECTED_ROLE_MAPPING');
 const access=await config.getWithMetadata(GUILD,'special_commands.access_roles');
 for(const trigger of triggers)requireSafe(Array.isArray(access.value?.[trigger])&&access.value[trigger].every(id=>snowflake(id)&&roles.some(r=>r.id===id)),'ACCESS_ROLES_INVALID_REVIEW_REQUIRED');
 // Invalid access policy is never repaired by silently broadening access.
 const {validateCustomSpecialCommands}=await import('../dist/packages/features-special/src/domain.js');
 validateCustomSpecialCommands((await config.getWithMetadata(GUILD,'special_commands.custom_commands')).value);
 const pools=(await config.getWithMetadata(GUILD,'special_commands.builtin_response_pools')).value;
 for(const trigger of ['!line','!vc','!chess'])requireSafe(Array.isArray(pools?.[trigger])&&pools[trigger].every(s=>typeof s==='string'&&s.trim()&&s.length<=1500),'RESPONSE_POOL_INVALID');
 const settings=[['channels.main_chat',MAIN_CHAT],['special_commands.builtin_role_map',map],['special_commands.enabled',true],['features.special_commands',true],['features.line',true],['features.race',true]];
 // All preflight checks finish before any audited mutation. Matching values are skipped.
 for(const [key,value] of settings){const current=await config.getWithMetadata(GUILD,key);if(current.version===0||!isDeepStrictEqual(current.value,value))await config.set({guildId:GUILD,key,value,expectedVersion:current.version,source:'operator.production-race-line-enablement',requestId:randomUUID()});}
 for(const [key,value] of settings){const current=await config.getWithMetadata(GUILD,key);requireSafe(current.version>=1&&isDeepStrictEqual(current.value,value),'PERSISTED_VERIFICATION_FAILED');}
 requireSafe(isDeepStrictEqual((await config.getWithMetadata(GUILD,'special_commands.access_roles')).value,access.value),'ACCESS_POLICY_CHANGED');
 for(const [key,value] of settings)write(`PASS: ${key}=${JSON.stringify(value)}.`);
 write('PASS: all four ping mappings verified; access-role policy preserved.');
}

export async function main(env=process.env,{connect,fetcher=fetch,write=console.log,error=console.error}={}){
 let db;
 try{
  const target=productionTarget(env);
  requireSafe(!env.LINE_PING_ROLE_ID||snowflake(env.LINE_PING_ROLE_ID),'LINE_ROLE_ID_INVALID');
  const connection=connect?await connect(target):await connectProduction(target);db=connection.db;
  const get=async path=>{requireSafe(env.DISCORD_TOKEN,'DISCORD_TOKEN_MISSING');const r=await fetcher('https://discord.com/api/v10'+path,{method:'GET',headers:{Authorization:'Bot '+env.DISCORD_TOKEN},signal:AbortSignal.timeout(15000)});requireSafe(r.ok,'DISCORD_READ_FAILED');return r.json();};
  await enableProductionRaceLine({...connection,get,lineRoleId:env.LINE_PING_ROLE_ID,write});
 }catch(e){const codes=['PING_ROLE_MISSING_OR_AMBIGUOUS','UNSAFE_PING_ROLE','PING_ROLES_NOT_DISTINCT','MAIN_CHAT_INVALID','BOT_CHANNEL_PERMISSIONS_MISSING','PING_NOT_MENTIONABLE','PROTECTED_ROLE_MAPPING','ACCESS_ROLES_INVALID_REVIEW_REQUIRED','RESPONSE_POOL_INVALID','PERSISTED_VERIFICATION_FAILED','ACCESS_POLICY_CHANGED','LINE_ROLE_ID_INVALID','DISCORD_TOKEN_MISSING','DISCORD_READ_FAILED'];error('FAIL: '+(codes.includes(e?.message)?e.message:'PRODUCTION_ENABLEMENT_FAILED')+'. No exception details displayed.');return 1;}
 finally{if(db)try{await db.$disconnect();}catch{error('FAIL: DATABASE_DISCONNECT_FAILED.');return 1;}}
 return 0;
}
async function connectProduction(target){
 const [{PrismaClient},{PrismaConfigRepository,PrismaAuditSink},{ConfigService},{AuditService},{SETTINGS}]=await Promise.all([import('@prisma/client'),import('../dist/packages/database/src/prisma-adapters.js'),import('../dist/packages/core/src/config-service.js'),import('../dist/packages/core/src/audit.js'),import('../dist/packages/contracts/src/generated/settings.js')]);
 const db=new PrismaClient({datasourceUrl:target.databaseUrl,log:[]});
 return {db,config:new ConfigService(SETTINGS,new PrismaConfigRepository(db),new AuditService(new PrismaAuditSink(db)))};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)process.exitCode=await main();
