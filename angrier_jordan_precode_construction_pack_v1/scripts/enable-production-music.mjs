import {randomUUID} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {GUILD,productionTarget} from './audit-production-race-line.mjs';

const check=(ok,code)=>{if(!ok)throw Error(code);};

export async function enableProductionMusic({db,config,write=console.log}){
 check(await db.guild.findUnique({where:{id:GUILD},select:{id:true}}),'PRODUCTION_GUILD_MISSING');
 check(config.definition('music.enabled')?.type==='boolean','MUSIC_SCHEMA_INVALID');
 const current=await config.getWithMetadata(GUILD,'music.enabled');
 check(typeof current.value==='boolean','MUSIC_SETTING_INVALID');
 if(current.value!==true)await config.set({guildId:GUILD,key:'music.enabled',value:true,expectedVersion:current.version,source:'operator.production-music',requestId:randomUUID()});
 check(await config.get(GUILD,'music.enabled')===true,'MUSIC_ENABLE_VERIFY_FAILED');
 write('PASS: music.enabled=true.');
 write('PASS: production guild and private Railway database verified.');
 write('PASS: no other settings were modified. ENABLE_MUSIC_SMOKE=true, LAVALINK_URL, and LAVALINK_PASSWORD are required on the worker.');
}

async function connectProduction(target){
 const [{PrismaClient},{PrismaConfigRepository,PrismaAuditSink},{ConfigService},{AuditService},{SETTINGS}]=await Promise.all([import('@prisma/client'),import('../dist/packages/database/src/prisma-adapters.js'),import('../dist/packages/core/src/config-service.js'),import('../dist/packages/core/src/audit.js'),import('../dist/packages/contracts/src/generated/settings.js')]);
 const db=new PrismaClient({datasourceUrl:target.databaseUrl,log:[]});
 return {db,config:new ConfigService(SETTINGS,new PrismaConfigRepository(db),new AuditService(new PrismaAuditSink(db)))};
}

export async function main(env=process.env,{connect,write=console.log,error=console.error}={}){
 let db;
 try{const target=productionTarget(env);const connection=connect?await connect(target):await connectProduction(target);db=connection.db;await enableProductionMusic({...connection,write});}
 catch(cause){const safe=/^[A-Z][A-Z0-9_]+$/.test(cause?.message??'')?cause.message:'PRODUCTION_MUSIC_FAILED';error(`FAIL: ${safe}. No exception details displayed.`);return 1;}
 finally{if(db)try{await db.$disconnect();}catch{error('FAIL: DATABASE_DISCONNECT_FAILED.');return 1;}}
 return 0;
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)process.exitCode=await main();
