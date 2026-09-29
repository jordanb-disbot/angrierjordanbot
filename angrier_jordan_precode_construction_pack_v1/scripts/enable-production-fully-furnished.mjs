import {randomUUID} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {GUILD,productionTarget} from './audit-production-race-line.mjs';

const ROLE_NAME='Fully Furnished';
const END_AT='2026-10-02T16:00:00.000Z';
const check=(ok,code)=>{if(!ok)throw Error(code);};
const definitions=[
 ['event.chair_historian','Chair Historian','lore',{event:'fully_furnished',requirement:'chair_historian'}],
 ['event.properly_introduced','Properly Introduced','community',{event:'fully_furnished',requirement:'properly_introduced'}],
 ['event.armchair_architect','Armchair Architect','community',{event:'fully_furnished',requirement:'armchair_architect'}],
 ['event.house_regular','House Regular','casino',{event:'fully_furnished',requirement:'house_regular',rounds:10}],
 ['event.button_masher','Button Masher','games',{event:'fully_furnished',requirement:'button_masher',commands:5}],
 ['fully_furnished','Fully Furnished','prestige',{event:'fully_furnished',requires:['chair_historian','properly_introduced','armchair_architect','house_regular','button_masher']}]
];

export async function enableProductionFullyFurnished({db,config,get,write=console.log,now=()=>new Date()}){
 check(await db.guild.findUnique({where:{id:GUILD},select:{id:true}}),'PRODUCTION_GUILD_MISSING');
 const roles=await get(`/guilds/${GUILD}/roles`),role=roles.filter(r=>r.name===ROLE_NAME);
 check(role.length===1,'FULLY_FURNISHED_ROLE_INVALID');
 const roleId=role[0].id;
 const me=await get('/users/@me'),botMember=await get(`/guilds/${GUILD}/members/${me.id}`),botPositions=(botMember.roles??[]).map(id=>roles.find(r=>r.id===id)?.position??0);
 check(role[0].managed!==true&&role[0].position<Math.max(...botPositions,0),'FULLY_FURNISHED_ROLE_HIERARCHY_INVALID');
 const existingRole=await config.getWithMetadata(GUILD,'roles.fully_furnished');
 check(existingRole.value===null||existingRole.value===roleId,'FULLY_FURNISHED_ROLE_REQUIRES_REVIEW');
 if(existingRole.value!==roleId)await config.set({guildId:GUILD,key:'roles.fully_furnished',value:roleId,expectedVersion:existingRole.version,source:'operator.production-fully-furnished',requestId:randomUUID()});
 const event=await db.fullyFurnishedEvent.findUnique({where:{guildId:GUILD}}),startsAt=event?.startsAt??now(),endsAt=new Date(END_AT);
 check(startsAt<endsAt,'FULLY_FURNISHED_EVENT_EXPIRED');
 await db.$transaction(async tx=>{
  await tx.fullyFurnishedEvent.upsert({where:{guildId:GUILD},create:{guildId:GUILD,startsAt,endsAt,enabled:true,roleId},update:{enabled:true,roleId}});
  for(const [id,name,achievementClass,criteria] of definitions)await tx.achievement.upsert({where:{id},create:{id,name,class:achievementClass,criteria,enabled:true},update:{name,class:achievementClass,criteria,enabled:true}});
 });
 const enabled=await config.getWithMetadata(GUILD,'features.fully_furnished_event');
 if(enabled.value!==true)await config.set({guildId:GUILD,key:'features.fully_furnished_event',value:true,expectedVersion:enabled.version,source:'operator.production-fully-furnished',requestId:randomUUID()});
 const verify=await db.fullyFurnishedEvent.findUniqueOrThrow({where:{guildId:GUILD}});
 check(verify.enabled&&verify.roleId===roleId&&verify.endsAt.getTime()===endsAt.getTime(),'FULLY_FURNISHED_VERIFY_FAILED');
 check(await config.get(GUILD,'roles.fully_furnished')===roleId,'FULLY_FURNISHED_ROLE_VERIFY_FAILED');
 check(await config.get(GUILD,'features.fully_furnished_event')===true,'FULLY_FURNISHED_FEATURE_VERIFY_FAILED');
 write(`PASS: roles.fully_furnished=${roleId}.`);
 write(`PASS: Fully Furnished event started=${verify.startsAt.toISOString()}.`);
 write(`PASS: Fully Furnished event ends=${verify.endsAt.toISOString()}.`);
 write('PASS: six event achievement definitions verified; no historical activity was credited.');
 write('PASS: features.fully_furnished_event=true. Add ENABLE_FULLY_FURNISHED_SMOKE=true before worker redeploy.');
}

async function connectProduction(target){const [{PrismaClient},{PrismaConfigRepository,PrismaAuditSink},{ConfigService},{AuditService},{SETTINGS}]=await Promise.all([import('@prisma/client'),import('../dist/packages/database/src/prisma-adapters.js'),import('../dist/packages/core/src/config-service.js'),import('../dist/packages/core/src/audit.js'),import('../dist/packages/contracts/src/generated/settings.js')]);const db=new PrismaClient({datasourceUrl:target.databaseUrl,log:[]});return{db,config:new ConfigService(SETTINGS,new PrismaConfigRepository(db),new AuditService(new PrismaAuditSink(db)))};}
export async function main(env=process.env,{connect,fetcher=fetch,write=console.log,error=console.error}={}){let db;try{const target=productionTarget(env);check(typeof env.DISCORD_TOKEN==='string'&&env.DISCORD_TOKEN.length>0,'DISCORD_TOKEN_MISSING');const connection=connect?await connect(target):await connectProduction(target);db=connection.db;const get=async path=>{const response=await fetcher('https://discord.com/api/v10'+path,{headers:{Authorization:'Bot '+env.DISCORD_TOKEN},signal:AbortSignal.timeout(15000)});check(response.ok,'DISCORD_READ_FAILED');return response.json();};await enableProductionFullyFurnished({...connection,get,write});}catch(cause){error(`FAIL: ${/^[A-Z][A-Z0-9_]+$/.test(cause?.message??'')?cause.message:'PRODUCTION_FULLY_FURNISHED_FAILED'}. No exception details displayed.`);return 1;}finally{if(db)try{await db.$disconnect();}catch{error('FAIL: DATABASE_DISCONNECT_FAILED.');return 1;}}return 0;}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)process.exitCode=await main();
