import {randomUUID} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import {pathToFileURL} from 'node:url';
import {productionTarget,GUILD} from './audit-production-race-line.mjs';

export const SOCIAL_CHANNEL='1524964386077151365';
const check=(ok,code)=>{if(!ok)throw Error(code);};

export async function enableProductionSocialChannel({db,config,get,write=console.log}){
 check(await db.guild.findUnique({where:{id:GUILD},select:{id:true}}),'PRODUCTION_GUILD_MISSING');
 const channel=await get(`/channels/${SOCIAL_CHANNEL}`);
 check(channel?.id===SOCIAL_CHANNEL&&channel.guild_id===GUILD&&channel.type===0,'SOCIAL_CHANNEL_INVALID');
 check(config.definition('social.additional_channel_ids')?.type==='json'&&config.definition('features.social')?.type==='boolean','SOCIAL_CHANNEL_SCHEMA_INVALID');
 const feature=await config.getWithMetadata(GUILD,'features.social');
 check(typeof feature.value==='boolean','SOCIAL_FEATURE_SETTING_INVALID');
 if(feature.value!==true)await config.set({guildId:GUILD,key:'features.social',value:true,expectedVersion:feature.version,source:'operator.production-social-channel',requestId:randomUUID()});
 const current=await config.getWithMetadata(GUILD,'social.additional_channel_ids');
 check(Array.isArray(current.value)&&current.value.every(id=>typeof id==='string'&&/^\d{17,20}$/.test(id)),'SOCIAL_CHANNEL_SETTING_INVALID');
 const expected=[...new Set([...current.value,SOCIAL_CHANNEL])];
 if(!isDeepStrictEqual(current.value,expected))await config.set({guildId:GUILD,key:'social.additional_channel_ids',value:expected,expectedVersion:current.version,source:'operator.production-social-channel',requestId:randomUUID()});
 check(isDeepStrictEqual(await config.get(GUILD,'social.additional_channel_ids'),expected),'SOCIAL_CHANNEL_VERIFY_FAILED');
 write('PASS: features.social=true.');
 write(`PASS: social.additional_channel_ids includes ${SOCIAL_CHANNEL}.`);
 write('PASS: production guild, private Railway database, and social text channel verified.');
 write('PASS: existing social channels and unrelated settings preserved.');
}

export async function main(env=process.env,{connect,fetcher=fetch,write=console.log,error=console.error}={}){
 let db;
 try{const target=productionTarget(env);check(typeof env.DISCORD_TOKEN==='string'&&env.DISCORD_TOKEN.length>0,'DISCORD_TOKEN_MISSING');const connection=connect?await connect(target):await connectProduction(target);db=connection.db;const get=async path=>{const response=await fetcher('https://discord.com/api/v10'+path,{headers:{Authorization:'Bot '+env.DISCORD_TOKEN},signal:AbortSignal.timeout(15000)});check(response.ok,'DISCORD_READ_FAILED');return response.json();};await enableProductionSocialChannel({...connection,get,write});}
 catch(cause){const safe=/^[A-Z][A-Z0-9_]+$/.test(cause?.message??'')?cause.message:'PRODUCTION_SOCIAL_CHANNEL_FAILED';error(`FAIL: ${safe}. No exception details displayed.`);return 1;}
 finally{if(db)try{await db.$disconnect();}catch{error('FAIL: DATABASE_DISCONNECT_FAILED.');return 1;}}
 return 0;
}

async function connectProduction(target){const [{PrismaClient},{PrismaConfigRepository,PrismaAuditSink},{ConfigService},{AuditService},{SETTINGS}]=await Promise.all([import('@prisma/client'),import('../dist/packages/database/src/prisma-adapters.js'),import('../dist/packages/core/src/config-service.js'),import('../dist/packages/core/src/audit.js'),import('../dist/packages/contracts/src/generated/settings.js')]);const db=new PrismaClient({datasourceUrl:target.databaseUrl,log:[]});return{db,config:new ConfigService(SETTINGS,new PrismaConfigRepository(db),new AuditService(new PrismaAuditSink(db)))};}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)process.exitCode=await main();
