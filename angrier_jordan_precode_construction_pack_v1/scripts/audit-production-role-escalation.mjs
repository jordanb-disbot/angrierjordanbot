import {pathToFileURL} from 'node:url';
import {GUILD,productionTarget} from './audit-production-race-line.mjs';

export const INCIDENT_MEMBERS=Object.freeze([
 {id:'1382596179870617620',label:'NoSmoking'},
 {id:'1531517965093175375',label:'Blowcain'},
]);
const ROLE_UPDATE_ACTION=25;
const ADMINISTRATOR=1n<<3n,MANAGE_ROLES=1n<<28n;
const check=(ok,code)=>{if(!ok)throw Error(code);};
const snowflake=value=>typeof value==='string'&&/^\d{17,20}$/.test(value);
const timestamp=id=>{try{return new Date(Number((BigInt(id)>>22n)+1420070400000n)).toISOString();}catch{return 'unknown';}};
const roleChanges=(entry,roles)=>Object.fromEntries(['$add','$remove'].map(key=>[key,(entry.changes??[]).find(change=>change.key===key)?.new_value?.map(row=>roles.get(row.id)??row.id)??[]]));

export async function inspectRoleEscalation(db){
 return db.$transaction(async tx=>{
  await tx.$executeRawUnsafe('SET TRANSACTION READ ONLY');
  const [panel,selections,audits]=await Promise.all([
   tx.selfRolePanel.findMany({where:{guildId:GUILD},select:{name:true,enabled:true,channelId:true,messageId:true,config:true,updatedAt:true}}),
   tx.selfRoleSelection.findMany({where:{guildId:GUILD,userId:{in:INCIDENT_MEMBERS.map(member=>member.id)}},select:{userId:true,roleId:true,categoryKey:true,active:true,selectedAt:true,archivedAt:true}}),
   tx.auditEvent.findMany({where:{guildId:GUILD,OR:[{actorUserId:{in:INCIDENT_MEMBERS.map(member=>member.id)}},{targetId:{in:INCIDENT_MEMBERS.map(member=>member.id)}}]},select:{actorUserId:true,source:true,action:true,targetType:true,targetId:true,createdAt:true},orderBy:{createdAt:'desc'},take:100}),
  ]);
  return {panel,selections,audits};
 });
}

const privilegeSummary=(member,roles)=>{
 const assigned=(Array.isArray(member?.roles)?member.roles:[]).map(id=>roles.find(role=>role.id===id)).filter(Boolean);
 const permissionRoles=assigned.filter(role=>{const bits=BigInt(role.permissions);return Boolean(bits&ADMINISTRATOR)||Boolean(bits&MANAGE_ROLES);});
 return {currentRoles:assigned.map(role=>({id:role.id,name:role.name,position:role.position,managed:role.managed,permissions:role.permissions})),roleManagementGrants:permissionRoles.map(role=>({id:role.id,name:role.name,position:role.position,administrator:Boolean(BigInt(role.permissions)&ADMINISTRATOR),manageRoles:Boolean(BigInt(role.permissions)&MANAGE_ROLES)}))};
};
export async function inspectDiscordRoleUpdates(get){
 const roles=await get(`/guilds/${GUILD}/roles`);
 const names=new Map(roles.map(role=>[role.id,role.name]));
 const [log,...members]=await Promise.all([get(`/guilds/${GUILD}/audit-logs?action_type=${ROLE_UPDATE_ACTION}&limit=100`),...INCIDENT_MEMBERS.map(member=>get(`/guilds/${GUILD}/members/${member.id}`))]);
 return INCIDENT_MEMBERS.map((member,index)=>({
  ...member,
  ...privilegeSummary(members[index],roles),
  updates:(log.audit_log_entries??[]).filter(entry=>entry.target_id===member.id).map(entry=>({
   entryId:entry.id,occurredAt:timestamp(entry.id),executorId:entry.user_id??null,...roleChanges(entry,names),
  })),
 }));
}

export async function runRoleEscalationAudit({db,get,write=console.log}){
 const database=await inspectRoleEscalation(db);
 const discord=await inspectDiscordRoleUpdates(get);
 for(const panel of database.panel)write(`PASS: panel ${JSON.stringify({name:panel.name,enabled:panel.enabled,channelId:panel.channelId,messageId:panel.messageId,updatedAt:panel.updatedAt.toISOString()})}`);
 for(const member of INCIDENT_MEMBERS){
  const selections=database.selections.filter(row=>row.userId===member.id).map(row=>({roleId:row.roleId,categoryKey:row.categoryKey,active:row.active,selectedAt:row.selectedAt.toISOString(),archivedAt:row.archivedAt?.toISOString()??null}));
  const events=database.audits.filter(row=>row.actorUserId===member.id||row.targetId===member.id).map(row=>({actorUserId:row.actorUserId,source:row.source,action:row.action,targetType:row.targetType,targetId:row.targetId,createdAt:row.createdAt.toISOString()}));
  const live=discord.find(row=>row.id===member.id);
  write(`FINDING: member=${member.label} (${member.id}); self_role_selections=${JSON.stringify(selections)}; bot_audit_events=${JSON.stringify(events)}; discord_role_updates=${JSON.stringify(live?.updates??[])}; current_roles=${JSON.stringify(live?.currentRoles??[])}; role_management_grants=${JSON.stringify(live?.roleManagementGrants??[])}`);
 }
 write('PASS: read-only role escalation audit completed; no Discord or database writes were performed.');
}

async function connect(target){const {PrismaClient}=await import('@prisma/client');return new PrismaClient({datasourceUrl:target.databaseUrl,log:[]});}
export async function main(env=process.env,{connectDatabase=connect,fetcher=fetch,write=console.log,error=console.error}={}){
 let db;
 try{
  const target=productionTarget(env);check(env.DISCORD_TOKEN,'DISCORD_TOKEN_MISSING');db=await connectDatabase(target);
  const get=async path=>{const response=await fetcher('https://discord.com/api/v10'+path,{method:'GET',headers:{Authorization:'Bot '+env.DISCORD_TOKEN},signal:AbortSignal.timeout(15000)});check(response.ok,'DISCORD_READ_FAILED');return response.json();};
  await runRoleEscalationAudit({db,get,write});return 0;
 }catch(cause){error(`FAIL: ${/^[A-Z][A-Z0-9_]+$/.test(cause?.message??'')?cause.message:'ROLE_ESCALATION_AUDIT_FAILED'}. No exception details displayed.`);return 1;
 }finally{await db?.$disconnect().catch(()=>undefined);}
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)process.exitCode=await main();
