import {randomUUID} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {GUILD,productionTarget} from './audit-production-race-line.mjs';
const check=(ok,code)=>{if(!ok)throw Error(code);};
export async function enableProductionCasino({db,config,get,write=console.log}){
 check(await db.guild.findUnique({where:{id:GUILD},select:{id:true}}),'PRODUCTION_GUILD_MISSING');
 const channelId=await config.get(GUILD,'channels.bot_channel');check(typeof channelId==='string'&&/^\d{17,20}$/.test(channelId),'CASINO_BOT_CHANNEL_MISSING');
 const channel=await get(`/channels/${channelId}`);check(channel?.id===channelId&&channel.guild_id===GUILD&&channel.type===0,'CASINO_BOT_CHANNEL_INVALID');
 const [min,max,pot,sizes,roulette,dice]=await Promise.all(['casino.min_bet','casino.max_bet','casino.chair_pot_contribution_percent','casino.slots_wagers','casino.roulette_choices','casino.dice_choices'].map(key=>config.get(GUILD,key)));
 check(Number.isSafeInteger(min)&&Number.isSafeInteger(max)&&min>0&&max>=min&&max<=1_000_000,'CASINO_WAGER_LIMITS_INVALID');
 check(Number.isInteger(pot)&&pot>=0&&pot<=100&&Array.isArray(sizes)&&sizes.length>0&&sizes.every(n=>Number.isSafeInteger(n)&&n>=min&&n<=max)&&Array.isArray(roulette)&&roulette.length>0&&Array.isArray(dice)&&dice.length>0,'CASINO_RULES_INVALID');
 const feature=await config.getWithMetadata(GUILD,'features.casino');if(feature.value!==true)await config.set({guildId:GUILD,key:'features.casino',value:true,expectedVersion:feature.version,source:'operator.production-casino',requestId:randomUUID()});
 check(await config.get(GUILD,'features.casino')===true,'CASINO_ENABLE_VERIFY_FAILED');
 write(`PASS: features.casino=true; casino output channel=${channelId}.`);
 write(`PASS: wager limits=${min}-${max}; Chair Pot contribution=${pot}%.`);
 write('PASS: casino rules validated; unrelated settings were not changed. ENABLE_CASINO_SMOKE=true and ENABLE_ECONOMY_SMOKE=true are required on the worker.');
}
async function connectProduction(target){const [{PrismaClient},{PrismaConfigRepository,PrismaAuditSink},{ConfigService},{AuditService},{SETTINGS}]=await Promise.all([import('@prisma/client'),import('../dist/packages/database/src/prisma-adapters.js'),import('../dist/packages/core/src/config-service.js'),import('../dist/packages/core/src/audit.js'),import('../dist/packages/contracts/src/generated/settings.js')]);const db=new PrismaClient({datasourceUrl:target.databaseUrl,log:[]});return{db,config:new ConfigService(SETTINGS,new PrismaConfigRepository(db),new AuditService(new PrismaAuditSink(db)))};}
export async function main(env=process.env,{connect,fetcher=fetch,write=console.log,error=console.error}={}){let db;try{const target=productionTarget(env);check(typeof env.DISCORD_TOKEN==='string'&&env.DISCORD_TOKEN.length>0,'DISCORD_TOKEN_MISSING');const connection=connect?await connect(target):await connectProduction(target);db=connection.db;const get=async path=>{const response=await fetcher('https://discord.com/api/v10'+path,{headers:{Authorization:'Bot '+env.DISCORD_TOKEN},signal:AbortSignal.timeout(15000)});check(response.ok,'DISCORD_READ_FAILED');return response.json();};await enableProductionCasino({...connection,get,write});}catch(cause){error(`FAIL: ${/^[A-Z][A-Z0-9_]+$/.test(cause?.message??'')?cause.message:'PRODUCTION_CASINO_FAILED'}. No exception details displayed.`);return 1;}finally{if(db)try{await db.$disconnect();}catch{error('FAIL: DATABASE_DISCONNECT_FAILED.');return 1;}}return 0;}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)process.exitCode=await main();
