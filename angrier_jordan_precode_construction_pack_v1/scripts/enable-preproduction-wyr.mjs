import {randomUUID} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import {pathToFileURL} from 'node:url';
import {productionTarget,GUILD} from './audit-production-race-line.mjs';

const GAMES_CHANNEL='1537335115359715430';
const check=(ok,code)=>{if(!ok)throw Error(code);};

export async function enablePreproductionWyr({db,config,get,write=console.log}){
  check(await db.guild.findUnique({where:{id:GUILD},select:{id:true}}),'GUILD_MISSING');
  const channel=await get(`/channels/${GAMES_CHANNEL}`);
  check(channel?.id===GAMES_CHANNEL&&channel.guild_id===GUILD&&channel.type===0,'GAMES_CHANNEL_INVALID');
  check(await config.get(GUILD,'channels.games_channel')===GAMES_CHANNEL,'GAMES_CHANNEL_MAPPING_INVALID');
  const current=await config.getWithMetadata(GUILD,'features.party_games');
  if(!isDeepStrictEqual(current.value,true))await config.set({guildId:GUILD,key:'features.party_games',value:true,expectedVersion:current.version,source:'operator.preproduction-wyr-enablement',requestId:randomUUID()});
  check(await config.get(GUILD,'features.party_games')===true,'WYR_ENABLEMENT_VERIFY_FAILED');
  write('PASS: pre-production WYR is enabled for the configured games channel.');
}

async function connect(target){
  const [{PrismaClient},{PrismaConfigRepository,PrismaAuditSink},{ConfigService},{AuditService},{SETTINGS}]=await Promise.all([
    import('@prisma/client'),import('../dist/packages/database/src/prisma-adapters.js'),import('../dist/packages/core/src/config-service.js'),import('../dist/packages/core/src/audit.js'),import('../dist/packages/contracts/src/generated/settings.js'),
  ]);
  const db=new PrismaClient({datasourceUrl:target.databaseUrl,log:[]});
  return {db,config:new ConfigService(SETTINGS,new PrismaConfigRepository(db),new AuditService(new PrismaAuditSink(db)))};
}

export async function main(env=process.env,{write=console.log,error=console.error,fetcher=fetch}={}){
  let connection;
  try{
    const target=productionTarget(env);
    check(typeof env.DISCORD_TOKEN==='string'&&env.DISCORD_TOKEN.length>0,'DISCORD_TOKEN_MISSING');
    connection=await connect(target);
    const get=async path=>{const response=await fetcher('https://discord.com/api/v10'+path,{headers:{Authorization:'Bot '+env.DISCORD_TOKEN},signal:AbortSignal.timeout(15000)});check(response.ok,'DISCORD_READ_FAILED');return response.json();};
    await enablePreproductionWyr({...connection,get,write});
  }catch(cause){
    const code=/^[A-Z][A-Z0-9_]+$/.test(cause?.message??'')?cause.message:'WYR_ENABLEMENT_FAILED';
    error(`FAIL: ${code}.`);return 1;
  }finally{await connection?.db.$disconnect().catch(()=>{});}
  return 0;
}

if(process.argv[1]&&pathToFileURL(process.argv[1]).href===import.meta.url)process.exitCode=await main();
