import {readFileSync} from 'node:fs';
import {parseEnv} from 'node:util';
import {randomUUID} from 'node:crypto';
import {testServerTarget} from './test-server.mjs';

let db;
try{
 const localText=readFileSync(new URL('../.env.music.local',import.meta.url),'utf8'),local=parseEnv(localText),target=testServerTarget(localText,readFileSync(new URL('../.env.test.local',import.meta.url),'utf8'));
 const [{PrismaClient},{PrismaConfigRepository,PrismaAuditSink},{ConfigService,AuditService},{SETTINGS}]=await Promise.all([import('@prisma/client'),import('../dist/packages/database/src/prisma-adapters.js'),import('../dist/packages/core/src/index.js'),import('../dist/packages/contracts/src/generated/settings.js')]);
 db=new PrismaClient({datasourceUrl:target.databaseUrl,log:[]});const config=new ConfigService(SETTINGS,new PrismaConfigRepository(db),new AuditService(new PrismaAuditSink(db)));
 const request=async(path,body)=>{const response=await fetch('https://discord.com/api/v10'+path,{method:body?'PATCH':'GET',headers:{Authorization:'Bot '+local.DISCORD_TOKEN,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(15000)});if(!response.ok)throw Error('DISCORD_REQUEST_FAILED_'+response.status);return response.json();};
 const me=await request('/users/@me'),[roles,member,rows,panels]=await Promise.all([request('/guilds/'+target.guildId+'/roles'),request('/guilds/'+target.guildId+'/members/'+me.id),db.configValue.findMany({where:{guildId:target.guildId}}),db.selfRolePanel.findMany({where:{guildId:target.guildId,enabled:true}})]);
 const named=name=>{const matches=roles.filter(r=>r.name===name);if(matches.length>1)throw Error('AMBIGUOUS_ROLE');return matches[0];};
 const old=named('REDOSE'),line=named('Line Ping');if(old&&line)throw Error('LINE_ROLE_REVIEW_REQUIRED');
 const chosen={'!line':line??old,'!race':named('Race Ping'),'!vc':named('VC Ping'),'!chess':named('Chess Ping')};
 const botRoles=roles.filter(r=>member.roles.includes(r.id)),top=Math.max(...botRoles.map(r=>r.position));
 const botPermissions=botRoles.concat(roles.filter(r=>r.id===target.guildId)).reduce((bits,r)=>bits|BigInt(r.permissions),0n);
 if(!(botPermissions&((1n<<3n)|(1n<<28n))))throw Error('BOT_ROLE_MANAGEMENT_REQUIRED');
 for(const role of Object.values(chosen)){
  if(!role||role.managed||role.position>=top||BigInt(role.permissions)!==0n)throw Error('UNSAFE_OR_MISSING_NOTIFICATION_ROLE');
  if(rows.some(r=>r.key!=='special_commands.builtin_role_map'&&JSON.stringify(r.value).includes('"'+role.id+'"')))throw Error('ROLE_HAS_OTHER_CONFIGURED_USE');
 }
 const current=await config.getWithMetadata(target.guildId,'special_commands.builtin_role_map'),mainChat=await config.get(target.guildId,'channels.main_chat'),channel=typeof mainChat==='string'?await request('/channels/'+mainChat):null;
 let effective=botPermissions;
 if(!(effective&8n)&&channel){const overwrites=channel.permission_overwrites??[],everyone=overwrites.find(o=>o.id===target.guildId);if(everyone)effective=(effective&~BigInt(everyone.deny))|BigInt(everyone.allow);let allow=0n,deny=0n;for(const o of overwrites.filter(o=>o.type===0&&member.roles.includes(o.id))){allow|=BigInt(o.allow);deny|=BigInt(o.deny);}effective=(effective&~deny)|allow;const own=overwrites.find(o=>o.type===1&&o.id===me.id);if(own)effective=(effective&~BigInt(own.deny))|BigInt(own.allow);}
 const canMention=Boolean(effective&((1n<<3n)|(1n<<17n))),map=Object.fromEntries(Object.entries(chosen).map(([trigger,role])=>[trigger,role.id]));
 console.log(JSON.stringify({guildId:target.guildId,mainChat,currentMapping:current.value,roles:Object.entries(chosen).map(([trigger,r])=>({trigger,name:r.name,id:r.id,mentionable:r.mentionable,canNotify:r.mentionable||canMention})),rename:old?'REDOSE → Line Ping (same role ID)':null},null,2));
 if(process.argv.includes('--apply')){
  if(!channel||!Object.values(chosen).every(r=>r.mentionable||canMention))throw Error('CHANNEL_MENTION_PERMISSION_REQUIRED');
  if(old)await request('/guilds/'+target.guildId+'/roles/'+old.id,{name:'Line Ping'});
  if(Object.entries(map).some(([key,value])=>current.value?.[key]!==value))await config.set({guildId:target.guildId,key:'special_commands.builtin_role_map',value:map,expectedVersion:current.version,source:'operator.local-notification-acceptance',requestId:randomUUID()});
  for(const panel of panels){const value=structuredClone(panel.config);const pings=value.categories?.find(c=>c.key==='pings');if(!pings)continue;pings.options=Object.entries(chosen).map(([trigger,r])=>({roleId:r.id,label:trigger==='!line'?'Line Ping':r.name,enabled:true}));await db.selfRolePanel.update({where:{id:panel.id},data:{config:value}});}
  const persisted=await config.get(target.guildId,'special_commands.builtin_role_map'),verifiedRoles=await request('/guilds/'+target.guildId+'/roles');
  if(Object.entries(map).some(([key,value])=>persisted?.[key]!==value)||!verifiedRoles.some(r=>r.id===chosen['!line'].id&&r.name==='Line Ping'))throw Error('VERIFICATION_FAILED');
  console.log('PASS: Four mappings verified; existing Line role and member selections preserved. No notifications sent.');
 }
}catch(error){console.error('LOCAL_NOTIFICATION_SETUP_FAILED: '+(/^[A-Z][A-Z0-9_]+$/.test(error?.message??'')?error.message:'READ_OR_DATABASE_ERROR')+'. No credentials displayed.');process.exitCode=1;}
finally{await db?.$disconnect();}
