import {pathToFileURL} from 'node:url';

export const GUILD='1524964384642957432', MAIN_CHAT='1524964386077151365', RACE_PING='1542643684833632306';
const keys=['features.race','features.line','features.special_commands','special_commands.enabled','channels.main_chat','special_commands.access_roles','special_commands.builtin_role_map'];
const snowflake=v=>typeof v==='string'&&/^\d{17,20}$/.test(v);
const safeId=v=>snowflake(v)?v:v===null?null:'INVALID';
const roleArray=v=>Array.isArray(v)&&v.every(snowflake)?v:'INVALID';
const emit=(write,ok,key,value,extra={})=>write(`${ok?'PASS':'WARN'}: ${key} ${JSON.stringify({value,...extra})}`);

export function productionTarget(env){
 if(env.NODE_ENV!=='production'||env.AJ_DATABASE_PURPOSE!=='production'||env.DISCORD_GUILD_ID!==GUILD)throw Error('TARGET');
 const url=new URL(env.DATABASE_URL);
 if(!['postgres:','postgresql:'].includes(url.protocol)||!url.hostname.endsWith('.railway.internal'))throw Error('TARGET');
 return {guildId:GUILD,databaseUrl:env.DATABASE_URL};
}

// This audit deliberately avoids services that bootstrap, reconcile, seed or audit writes.
// PostgreSQL enforces READ ONLY before the first SELECT in every transaction.
export async function inspectDatabase(db,definitions,memberId){
 return db.$transaction(async tx=>{
  await tx.$executeRawUnsafe('SET TRANSACTION READ ONLY');
  const rows=await tx.configValue.findMany({where:{guildId:GUILD,key:{in:keys}},select:{key:true,value:true}});
  const settings=Object.fromEntries(keys.map(key=>{const row=rows.find(r=>r.key===key);return[key,{value:row?row.value:definitions.find(d=>d.key===key)?.default,origin:row?'persisted':'default'}];}));
  const mapped=settings['channels.main_chat'].value;
  const sessions=await tx.gameSession.findMany({where:{guildId:GUILD,channelId:{in:[...new Set([MAIN_CHAT,...(snowflake(mapped)?[mapped]:[])])]},type:{in:['race','fight','line']},state:{in:['OPEN','LOCKED','SETTLING']}},select:{id:true,type:true,state:true,channelId:true}});
  const security=await tx.securityModeState.findUnique({where:{guildId:GUILD},select:{mode:true,panicActive:true}});
  let containment;
  if(memberId){
   const moderation=await tx.jailSentence.findFirst({where:{guildId:GUILD,userId:memberId,type:'MODERATION',active:true},select:{id:true}});
   const crime=await tx.jailSentence.findFirst({where:{guildId:GUILD,userId:memberId,type:'CRIME',active:true,OR:[{pausedAt:{not:null}},{endsAt:{gt:new Date()}}]},select:{id:true}});
   const verification=await tx.verificationState.findUnique({where:{guildId_userId:{guildId:GUILD,userId:memberId}},select:{status:true}});
   containment={moderationJailed:Boolean(moderation),crimeJailed:Boolean(crime),verificationRequired:verification?.status==='REQUIRED'};
  }
  return {settings,sessions,security:security??{mode:'NORMAL',panicActive:false},containment};
 },{timeout:15000});
}

export async function main(env=process.env,{connect,definitions,fetcher=fetch,write=console.log}={}){
 let target,db;
 try{target=productionTarget(env);}catch{write('WARN: production_target verification_failed');return 1;}
 try{
  db=connect?await connect(target):new (await import('@prisma/client')).PrismaClient({datasourceUrl:target.databaseUrl,log:[]});
  const found=await db.$transaction(async tx=>{await tx.$executeRawUnsafe('SET TRANSACTION READ ONLY');return tx.guild.findUnique({where:{id:GUILD},select:{id:true}});});
  if(!found)throw Error('TARGET');
 }catch{write('WARN: production_target database_guild_verification_failed');await db?.$disconnect().catch(()=>{});return 1;}
 write('PASS: production_target env_guild_private_database_verified');
 const memberId=snowflake(env.AUDIT_MEMBER_ID)?env.AUDIT_MEMBER_ID:undefined;
 let audit;
 try{
  audit=await inspectDatabase(db,definitions??(await import('../dist/packages/contracts/src/generated/settings.js')).SETTINGS,memberId);
  for(const key of keys.slice(0,5)){
   const {value,origin}=audit.settings[key];const channel=key==='channels.main_chat';
   emit(write,channel?value===MAIN_CHAT:value===true,key,channel?safeId(value):typeof value==='boolean'?value:'INVALID',{origin,...(channel?{expected:MAIN_CHAT}:{})});
  }
  for(const trigger of ['!race','!line']){
   const entry=audit.settings['special_commands.access_roles'],value=roleArray(entry.value?.[trigger]);
   emit(write,value!=='INVALID',`special_commands.access_roles[${trigger}]`,value,{origin:entry.origin,meaning:'empty_allows_members_otherwise_requires_listed_role'});
  }
  emit(write,audit.sessions.length===0,'active_sessions',audit.sessions.map(s=>({id:/^[a-zA-Z0-9-]{1,64}$/.test(s.id)?s.id:'INVALID',type:s.type,state:s.state,channelId:safeId(s.channelId)})));
  emit(write,!audit.security.panicActive&&audit.security.mode!=='LOCKDOWN','panic_state',{mode:['NORMAL','ELEVATED','LOCKDOWN'].includes(audit.security.mode)?audit.security.mode:'OTHER',panicActive:audit.security.panicActive});
  if(memberId)emit(write,!Object.values(audit.containment).some(Boolean),'member_containment',audit.containment,{memberId});
  else write('WARN: member_containment unknown; set AUDIT_MEMBER_ID to the invoking Discord member ID');
 }catch{write('WARN: database_audit incomplete; no exception details displayed');}
 try{
  const get=async path=>{if(!env.DISCORD_TOKEN)throw Error('TOKEN');const response=await fetcher('https://discord.com/api/v10'+path,{method:'GET',headers:{Authorization:'Bot '+env.DISCORD_TOKEN},signal:AbortSignal.timeout(15000)});if(!response.ok)throw Error('DISCORD');return response.json();};
  const roles=await get(`/guilds/${GUILD}/roles`),line=roles.filter(r=>r.name==='Line Ping');
  for(const [trigger,expected] of [['!race',RACE_PING],['!line',line.length===1?line[0].id:null]]){
   const entry=audit?.settings['special_commands.builtin_role_map'],value=entry?.value?.[trigger],role=roles.find(r=>r.id===value);
   emit(write,Boolean(expected&&value===expected&&role&&role.permissions==='0'&&!role.managed),`special_commands.builtin_role_map[${trigger}]`,entry?safeId(value):'UNKNOWN',{expected:safeId(expected),origin:entry?.origin??'unknown',roleExists:Boolean(role),zeroPermissions:role?.permissions==='0',mentionable:role?.mentionable===true});
  }
  if(line.length!==1)write('WARN: Line_Ping unique_current_role_not_found; no legacy role substituted');
  if(memberId&&audit){const member=await get(`/guilds/${GUILD}/members/${memberId}`);for(const trigger of ['!race','!line']){const allowed=roleArray(audit.settings['special_commands.access_roles'].value?.[trigger]);emit(write,allowed!=='INVALID'&&(!allowed.length||allowed.some(id=>member.roles.includes(id))),`member_access[${trigger}]`,allowed==='INVALID'?'UNKNOWN':!allowed.length||allowed.some(id=>member.roles.includes(id)));}}
 }catch{
  if(audit)for(const trigger of ['!race','!line']){const entry=audit.settings['special_commands.builtin_role_map'];emit(write,false,`special_commands.builtin_role_map[${trigger}]`,safeId(entry.value?.[trigger]),{origin:entry.origin,discordVerification:'unavailable'});}
  write('WARN: discord_role_or_member_verification incomplete; no exception details displayed');
 }finally{try{await db.$disconnect();}catch{write('WARN: database_disconnect incomplete');}}
 write('PASS: read_only_audit_finished; WARN means missing, blocked or unverified; no writes performed');
 return 0;
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)process.exitCode=await main();
