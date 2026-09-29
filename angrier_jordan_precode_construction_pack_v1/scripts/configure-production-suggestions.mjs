import {randomUUID} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {GUILD,productionTarget} from './audit-production-race-line.mjs';

export const SUGGESTIONS_CHANNEL='1537330815250333777';
const check=(ok,code)=>{if(!ok)throw Error(code);};

export async function configureProductionSuggestions({db,config,get,write=console.log}){
 check(await db.guild.findUnique({where:{id:GUILD},select:{id:true}}),'PRODUCTION_GUILD_MISSING');
 const channel=await get(`/channels/${SUGGESTIONS_CHANNEL}`);
 check(channel?.id===SUGGESTIONS_CHANNEL&&channel.guild_id===GUILD&&channel.type===0,'SUGGESTIONS_CHANNEL_INVALID');
 const community=await config.getWithMetadata(GUILD,'features.community');
 if(community.value!==true)await config.set({guildId:GUILD,key:'features.community',value:true,expectedVersion:community.version,source:'operator.production-suggestions',requestId:randomUUID()});
 check(await config.get(GUILD,'features.community')===true,'COMMUNITY_ENABLE_VERIFY_FAILED');
 const current=await config.getWithMetadata(GUILD,'channels.suggestions_channel');
 check(current.value===null||current.value===SUGGESTIONS_CHANNEL,'EXISTING_SUGGESTIONS_CHANNEL_REQUIRES_REVIEW');
 if(current.value!==SUGGESTIONS_CHANNEL)await config.set({guildId:GUILD,key:'channels.suggestions_channel',value:SUGGESTIONS_CHANNEL,expectedVersion:current.version,source:'operator.production-suggestions',requestId:randomUUID()});
 check(await config.get(GUILD,'channels.suggestions_channel')===SUGGESTIONS_CHANNEL,'SUGGESTIONS_CHANNEL_VERIFY_FAILED');
 write('PASS: features.community=true.');
 write(`PASS: channels.suggestions_channel=${SUGGESTIONS_CHANNEL}.`);
 write('PASS: Suggestions channel exists in the production guild; no unrelated feature settings changed.');
}

async function connectProduction(target){const [{PrismaClient},{PrismaConfigRepository,PrismaAuditSink},{ConfigService},{AuditService},{SETTINGS}]=await Promise.all([import('@prisma/client'),import('../dist/packages/database/src/prisma-adapters.js'),import('../dist/packages/core/src/config-service.js'),import('../dist/packages/core/src/audit.js'),import('../dist/packages/contracts/src/generated/settings.js')]);const db=new PrismaClient({datasourceUrl:target.databaseUrl,log:[]});return{db,config:new ConfigService(SETTINGS,new PrismaConfigRepository(db),new AuditService(new PrismaAuditSink(db)))}};
export async function main(env=process.env,{connect,fetcher=fetch,write=console.log,error=console.error}={}){let db;try{const target=productionTarget(env);check(typeof env.DISCORD_TOKEN==='string'&&env.DISCORD_TOKEN.length>0,'DISCORD_TOKEN_MISSING');const connection=connect?await connect(target):await connectProduction(target);db=connection.db;const get=async path=>{const response=await fetcher('https://discord.com/api/v10'+path,{headers:{Authorization:'Bot '+env.DISCORD_TOKEN},signal:AbortSignal.timeout(15000)});check(response.ok,'DISCORD_READ_FAILED');return response.json();};await configureProductionSuggestions({...connection,get,write});}catch(cause){error(`FAIL: ${/^[A-Z][A-Z0-9_]+$/.test(cause?.message??'')?cause.message:'PRODUCTION_SUGGESTIONS_FAILED'}. No exception details displayed.`);return 1;}finally{if(db)try{await db.$disconnect();}catch{error('FAIL: DATABASE_DISCONNECT_FAILED.');return 1;}}return 0;}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)process.exitCode=await main();
