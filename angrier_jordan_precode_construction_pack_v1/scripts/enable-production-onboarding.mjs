import {randomUUID} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import {pathToFileURL} from 'node:url';
import {productionTarget,GUILD,MAIN_CHAT} from './audit-production-race-line.mjs';

export const FOLDING_CHAIR='1525538959176896562';
export const LANDING_CHANNEL='1525540109414568188';
export const WELCOME_CATEGORY='1553926850185666601';
export const APPROVED_CATEGORIES=[
 ['dm_status','DM Status','single',['DMs Open','DMs Closed']],
 ['gender','Gender','single',['Male','Female']],
 ['age','Age','single',['18-24','25-34','35+']],
 ['regions','Region','single',['North America','South America','Europe','Africa','Asia','Oceania']],
 ['vices','Interests/Substances','multi',['Stimulants','Disassociatives','Hallucinogens','Depressants','Cannabinoids']],
 ['personalities','Personalities','multi',['Morning Perch','Night Recliner','BeanBag','Swivel Chair','Wobbly Stool','Ghost Chair']],
 ['pings','Notification Pings','multi',['Line Ping','Race Ping','VC Ping','Chess Ping']],
];
const gateKeys=['channels.main_chat','channels.bot_channel','channels.games_channel','channels.counting_channel','channels.last_letter_channel','channels.chairisms_channel','channels.introduction_channel'];
const protectedKeys=['roles.throne','roles.chaise_lounge','roles.recliner','roles.jailed','roles.member_access','music.dj_role'];
const restoreExpected={'onboarding.rules_ack_required':true,'rejoin.require_rules_ack':true,'rejoin.restore_self_roles':true,'rejoin.restore_manual_nonstaff_roles':true,'rejoin.restore_staff_roles':false,'rejoin.restore_nickname':true};
const pingTrigger={'Line Ping':'!line','Race Ping':'!race','VC Ping':'!vc','Chess Ping':'!chess'};
const normalize=value=>value.toLowerCase().replace(/[^a-z0-9+]/g,'');
const snowflake=value=>typeof value==='string'&&/^\d{17,20}$/.test(value);
const check=(ok,code)=>{if(!ok)throw Error(code);};
const containsId=(value,id)=>value===id||Array.isArray(value)&&value.some(v=>containsId(v,id))||Boolean(value&&typeof value==='object'&&!Array.isArray(value)&&Object.values(value).some(v=>containsId(v,id)));
const aliases={'Disassociatives':['Dissociatives']};

export const productionOnboardingTarget=productionTarget;

export function planProductionSelfRoles({roles,channels=[],botMember,configRows,guildId=GUILD,existingPanel}){
 check(Array.isArray(roles)&&Array.isArray(botMember?.roles),'ROLE_INVENTORY_INVALID');
 const botRoles=roles.filter(role=>botMember.roles.includes(role.id)),top=Math.max(0,...botRoles.map(role=>role.position));
 const permissions=roles.filter(role=>role.id===guildId||botMember.roles.includes(role.id)).reduce((bits,role)=>bits|BigInt(role.permissions),0n);
 check(Boolean(permissions&((1n<<3n)|(1n<<28n)))&&top>0,'AJ_MANAGE_ROLES_MISSING');
 const protectedIds=new Set([guildId,FOLDING_CHAIR,...configRows.filter(row=>protectedKeys.includes(row.key)).map(row=>row.value).filter(snowflake)]);
 const current=existingPanel?.config?.categories??[];
 const used=new Set();
 const categories=APPROVED_CATEGORIES.map(([key,label,mode,names])=>({key,label,mode,options:names.map(optionLabel=>{
  const names=[optionLabel,...aliases[optionLabel]??[]].map(normalize);
  const matches=roles.filter(role=>names.includes(normalize(role.name)));
  const old=current.find(category=>category.key===key)?.options?.find(option=>option.label===optionLabel);
  const role=matches.length===1?matches[0]:matches.length===0&&old?roles.find(r=>r.id===old.roleId):undefined;
  check(matches.length<=1&&role,'ROLE_MISSING_OR_AMBIGUOUS');
  check(!used.has(role.id),'ROLE_DUPLICATE_OPTION');used.add(role.id);
  check(role.id!==guildId&&!role.managed&&role.position<top&&BigInt(role.permissions)===0n&&!protectedIds.has(role.id),'UNSAFE_SELF_ROLE');
  check(!channels.some(channel=>channel.permission_overwrites?.some(overwrite=>overwrite.id===role.id&&BigInt(overwrite.allow)!==0n)),'SELF_ROLE_CHANNEL_GRANT');
  const refs=configRows.filter(row=>containsId(row.value,role.id));
  const expectedTrigger=pingTrigger[optionLabel];
  check(refs.every(row=>row.key==='special_commands.builtin_role_map'&&expectedTrigger&&row.value?.[expectedTrigger]===role.id&&Object.entries(row.value).every(([trigger,id])=>id!==role.id||trigger===expectedTrigger)),'SELF_ROLE_HAS_PROTECTED_REFERENCE');
  return {roleId:role.id,label:optionLabel,enabled:true};
 })}));
 check(categories.length===7&&used.size===28,'PANEL_INCOMPLETE');
 return {categories};
}

function effectivePermissions(roles,channel,roleIds){
 let bits=roles.filter(role=>role.id===GUILD||roleIds.includes(role.id)).reduce((value,role)=>value|BigInt(role.permissions),0n);
 if(bits&8n)return bits;
 const overwrites=channel.permission_overwrites??[];
 const everyone=overwrites.find(row=>row.id===GUILD);
 if(everyone)bits=(bits&~BigInt(everyone.deny))|BigInt(everyone.allow);
 let allow=0n,deny=0n;
 for(const row of overwrites.filter(row=>row.type===0&&roleIds.includes(row.id))){allow|=BigInt(row.allow);deny|=BigInt(row.deny);}
 return(bits&~deny)|allow;
}

export function verifyFoldingGate({roles,channels,mappings,onCategories=()=>{},onIssue=()=>{}}){
 const ids=[...new Set(gateKeys.map(key=>mappings[key]).filter(snowflake))];
 check(mappings['channels.main_chat']===MAIN_CHAT,'MAIN_CHAT_MAPPING_INVALID');
 check(ids.length>0,'MEMBER_CHANNEL_MAPPINGS_MISSING');
 const view=1n<<10n,landing=channels.find(row=>row.id===LANDING_CHANNEL);
 check(landing?.guild_id===GUILD&&landing.type===0,'LANDING_CHANNEL_INVALID');
 check(landing.parent_id===WELCOME_CATEGORY,'LANDING_WELCOME_CATEGORY_MISMATCH');
 const welcome=channels.find(row=>row.id===WELCOME_CATEGORY);
 check(welcome?.guild_id===GUILD&&welcome.type===4,'WELCOME_CATEGORY_INVALID');
 const mapped=ids.filter(id=>id!==LANDING_CHANNEL).map(id=>{
  const channel=channels.find(row=>row.id===id);
  check(channel?.guild_id===GUILD&&snowflake(channel.parent_id),`MEMBER_CHANNEL_CATEGORY_MISSING_${id}`);
  return channel;
 });
 const categoryIds=[...new Set(mapped.map(channel=>channel.parent_id))];
 check(categoryIds.length>0,'MEMBER_CATEGORIES_MISSING');
 check(!categoryIds.includes(WELCOME_CATEGORY),'WELCOME_CATEGORY_MEMBER_MAPPING');
 onCategories(categoryIds);
 const issues=[];
 if(!(effectivePermissions(roles,welcome,[])&view))issues.push('WELCOME_CATEGORY_NOT_PUBLIC');
 if(!(effectivePermissions(roles,landing,[])&view))issues.push('LANDING_NOT_PUBLIC');
 for(const id of categoryIds){
  const category=channels.find(row=>row.id===id);
  check(category?.guild_id===GUILD&&category.type===4,`MEMBER_CATEGORY_INVALID_${id}`);
  const everyone=effectivePermissions(roles,category,[]),member=effectivePermissions(roles,category,[FOLDING_CHAIR]);
  if(everyone&view)issues.push(`EVERYONE_CATEGORY_VIEW_BYPASS_${id}`);
  if(!(member&view))issues.push(`FOLDING_CATEGORY_VIEW_MISSING_${id}`);
 }
 for(const category of channels.filter(row=>row.type===4&&row.id!==WELCOME_CATEGORY&&!categoryIds.includes(row.id))){
  if(effectivePermissions(roles,category,[])&view)issues.push(`EVERYONE_CATEGORY_VIEW_BYPASS_${category.id}`);
 }
 // Discord applies category changes to synced children by copying overwrites.
 // Staff-only children may intentionally remain hidden from Folding Chair.
 // Every child must stay hidden from @everyone; mapped member children must unlock.
 for(const channel of channels.filter(row=>categoryIds.includes(row.parent_id)&&row.id!==LANDING_CHANNEL&&[0,2,5,13,15,16].includes(row.type))){
  const everyone=effectivePermissions(roles,channel,[]),member=effectivePermissions(roles,channel,[FOLDING_CHAIR]);
  if(everyone&view)issues.push(`UNSYNCED_MEMBER_VIEW_BYPASS_${channel.id}`);
  if(ids.includes(channel.id)&&!(member&view))issues.push(`FOLDING_MEMBER_VIEW_MISSING_${channel.id}`);
 }
 for(const code of issues)onIssue(code);
 check(issues.length===0,issues.length===1?issues[0]:'CATEGORY_GATE_REVIEW_REQUIRED');
 return categoryIds;
}

export async function enableProductionOnboarding({db,config,get,write=console.log,diagnostic=()=>{}}){
 check(await db.guild.findUnique({where:{id:GUILD},select:{id:true}}),'PRODUCTION_GUILD_MISSING');
 diagnostic('STAGE: discord_inventory');
 const [roles,channels,me,configRows,panels]=await Promise.all([
  get(`/guilds/${GUILD}/roles`),get(`/guilds/${GUILD}/channels`),get('/users/@me'),
  db.configValue.findMany({where:{guildId:GUILD},select:{key:true,value:true}}),db.selfRolePanel.findMany({where:{guildId:GUILD}}),
 ]);
 const botMember=await get(`/guilds/${GUILD}/members/${me.id}`);
 const folding=roles.find(role=>role.id===FOLDING_CHAIR);
 check(folding&&!folding.managed&&folding.name==='Folding Chair','FOLDING_ROLE_INVALID');
 const existing=panels.find(row=>row.name==='Default Roles');
 check(!panels.some(row=>row.enabled&&row.name!=='Default Roles'),'OTHER_ENABLED_PANEL_REVIEW_REQUIRED');
 const rows=[...configRows];
 for(const key of protectedKeys)if(!rows.some(row=>row.key===key))rows.push({key,value:(await config.getWithMetadata(GUILD,key)).value});
 diagnostic('STAGE: role_resolution');
 const planned=planProductionSelfRoles({roles,channels,botMember,configRows:rows,guildId:GUILD,existingPanel:existing});
 const mappings=Object.fromEntries(await Promise.all(gateKeys.map(async key=>[key,(await config.getWithMetadata(GUILD,key)).value])));
 diagnostic('STAGE: channel_permissions');
 const gated=verifyFoldingGate({roles,channels,mappings,onCategories:ids=>diagnostic(`STAGE: member_category_ids=${JSON.stringify(ids)}`),onIssue:code=>diagnostic(`WARN: ${code}`)});
 diagnostic('STAGE: restoration_policy');
 for(const [key,expected] of Object.entries(restoreExpected))check((await config.getWithMetadata(GUILD,key)).value===expected,'RESTORATION_POLICY_INVALID');
 const top=Math.max(0,...roles.filter(role=>botMember.roles.includes(role.id)).map(role=>role.position));
 check(folding.position<top,'AJ_BELOW_FOLDING');
 const desired={categories:planned.categories};
 diagnostic('STAGE: audited_writes');
 if(!existing?.enabled||!isDeepStrictEqual(existing.config,desired)){
  // The panel and its audit event commit together. Member roles and selections are never mutated.
  await db.$transaction(async tx=>{
   await tx.selfRolePanel.upsert({where:{guildId_name:{guildId:GUILD,name:'Default Roles'}},create:{guildId:GUILD,name:'Default Roles',enabled:true,config:desired},update:{enabled:true,config:desired}});
   await tx.auditEvent.create({data:{guildId:GUILD,source:'operator.production-onboarding-enablement',action:'roles.panel_configured',targetType:'self_role_panel',targetId:'Default Roles',before:existing?{enabled:existing.enabled,config:existing.config}:undefined,after:{enabled:true,config:desired},requestId:randomUUID()}});
  });
 }
 for(const [key,value] of [['roles.member_access',FOLDING_CHAIR],['roles_panel.enabled',true]]){
  const current=await config.getWithMetadata(GUILD,key);
  if(current.version===0||!isDeepStrictEqual(current.value,value))await config.set({guildId:GUILD,key,value,expectedVersion:current.version,source:'operator.production-onboarding-enablement',requestId:randomUUID()});
 }
 diagnostic('STAGE: persisted_verification');
 const saved=await db.selfRolePanel.findUnique({where:{guildId_name:{guildId:GUILD,name:'Default Roles'}}});
 check(saved?.enabled&&isDeepStrictEqual(saved.config,desired),'PANEL_VERIFY_FAILED');
 for(const [key,value] of [['roles.member_access',FOLDING_CHAIR],['roles_panel.enabled',true]]){
  const saved=await config.getWithMetadata(GUILD,key);check(saved.version>=1&&isDeepStrictEqual(saved.value,value),'SETTING_VERIFY_FAILED');
 }
  write('PASS: production guild, private database and AJ role hierarchy verified.');
  write(`PASS: welcome category ${WELCOME_CATEGORY} and landing ${LANDING_CHANNEL} are public; Folding Chair gates member categories ${JSON.stringify(gated)}.`);
  write('PASS: 7 approved categories and 28 safe current role IDs persisted; self-role selections untouched.');
  write('PASS: existing member roles and self-role selections unchanged.');
  for(const category of planned.categories)write(`PASS: role_map.${category.key}=${JSON.stringify(category.options.map(({label,roleId})=>({label,roleId})))}.`);
  write('PASS: rules/rejoin restoration policy verified.');
 write(`PASS: roles.member_access=${FOLDING_CHAIR}; roles_panel.enabled=true.`);
}

export async function main(env=process.env,{connect,fetcher=fetch,write=console.log,error=console.error,diagnostic=error}={}){
 let db;
 try{
  diagnostic('STAGE: target_validation');
  const target=productionOnboardingTarget(env);
  diagnostic('STAGE: dependency_initialization');
  const connection=connect?await connect(target):await connectProduction(target);db=connection.db;
  const get=async path=>{
   check(env.DISCORD_TOKEN,'DISCORD_TOKEN_MISSING');
   for(let attempt=0;attempt<5;attempt++){
    const response=await fetcher('https://discord.com/api/v10'+path,{method:'GET',headers:{Authorization:'Bot '+env.DISCORD_TOKEN},signal:AbortSignal.timeout(15000)});
    if(response.status===429){
     const body=await response.json();const seconds=Number(body?.retry_after);
     check(Number.isFinite(seconds)&&seconds>=0&&seconds<=60,'DISCORD_RATE_LIMIT_INVALID');
     await new Promise(resolve=>setTimeout(resolve,Math.ceil(seconds*1000)+250));continue;
    }
    check(response.ok,'DISCORD_READ_FAILED');
    return response.json();
   }
   throw Error('DISCORD_RATE_LIMIT_EXHAUSTED');
  };
  diagnostic('STAGE: prerequisites');
  await enableProductionOnboarding({...connection,get,write,diagnostic});
 }catch(cause){
  const safe=/^[A-Z][A-Z0-9_]+$/.test(cause?.message??'')?cause.message:'PRODUCTION_ONBOARDING_FAILED';
  error('FAIL: '+safe+'. No exception details displayed.');return 1;
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
