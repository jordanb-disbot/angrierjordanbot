import {readFileSync} from 'node:fs';
import {parseEnv} from 'node:util';
import {pathToFileURL} from 'node:url';
import {randomUUID} from 'node:crypto';

const modes=new Set(['bootstrap','status','enable-music','music-status']);
export function testServerTarget(musicText,testText){
  const music=parseEnv(musicText),test=parseEnv(testText);
  if(music.NODE_ENV!=='development')throw new Error('DEVELOPMENT_REQUIRED');
  if(!/^[1-9]\d{16,19}$/.test(music.DISCORD_GUILD_ID??''))throw new Error('SERVER_ID_REQUIRED');
  const value=test.TEST_DATABASE_URL;
  if(!value||value.includes('${'))throw new Error('TEST_DATABASE_REQUIRED');
  let url;try{url=new URL(value);}catch{throw new Error('INVALID_TEST_DATABASE');}
  if(!['postgres:','postgresql:'].includes(url.protocol)||url.hostname!=='ballast.proxy.rlwy.net'||url.port!=='14970'||url.pathname!=='/railway'||!url.username||!url.password||url.hash||[...url.searchParams.keys()].some(k=>!['sslmode','connection_limit','pool_timeout','connect_timeout'].includes(k)))throw new Error('DISPOSABLE_TARGET_REQUIRED');
  return {guildId:music.DISCORD_GUILD_ID,databaseUrl:value};
}

// Injected boundaries keep command semantics testable without touching an owner database.
export async function runTestServer(mode,{guildId,db,bootstrap,config,write=console.log}){
  if(!modes.has(mode))throw new Error('UNKNOWN_COMMAND');
  if(mode==='bootstrap'){
    const result=await bootstrap.ensure({guildId,source:'operator.bootstrap'});
    write(result.created?'PASS: Test server initialized.':'PASS: Test server already initialized; unchanged.');
    return;
  }
  if(!await db.guild.findUnique({where:{id:guildId},select:{id:true}}))throw new Error('SERVER_NOT_INITIALIZED');
  write('PASS: Test server exists.');
  let state=await config.getWithMetadata(guildId,'music.enabled');
  if(mode==='enable-music'&&state.value!==true){
    await config.set({guildId,key:'music.enabled',value:true,source:'operator.test-music',requestId:randomUUID(),expectedVersion:state.version});
    state=await config.getWithMetadata(guildId,'music.enabled');
  }
  if(typeof state.value!=='boolean'||!Number.isSafeInteger(state.version))throw new Error('INVALID_SETTING_STATE');
  write(`PASS: music.enabled=${state.value}; version=${state.version}.`);
}

async function main(){
  let db;
  try{
    const mode=process.argv[2];
    if(!modes.has(mode)||process.argv.length!==3)throw new Error('UNKNOWN_COMMAND');
    const target=testServerTarget(readFileSync(new URL('../.env.music.local',import.meta.url),'utf8'),readFileSync(new URL('../.env.test.local',import.meta.url),'utf8'));
    const [{PrismaClient},{PrismaServerBootstrapRepository},{PrismaConfigRepository,PrismaAuditSink},{ConfigService},{AuditService},{SETTINGS}]=await Promise.all([
      import('@prisma/client'),import('../dist/packages/database/src/prisma-server-bootstrap.js'),import('../dist/packages/database/src/prisma-adapters.js'),import('../dist/packages/core/src/config-service.js'),import('../dist/packages/core/src/audit.js'),import('../dist/packages/contracts/src/generated/settings.js')]);
    db=new PrismaClient({datasourceUrl:target.databaseUrl,log:[]});
    await runTestServer(mode,{guildId:target.guildId,db,bootstrap:new PrismaServerBootstrapRepository(db),config:new ConfigService(SETTINGS,new PrismaConfigRepository(db),new AuditService(new PrismaAuditSink(db)))});
  }catch(error){
    const known=new Set(['DEVELOPMENT_REQUIRED','SERVER_ID_REQUIRED','TEST_DATABASE_REQUIRED','INVALID_TEST_DATABASE','DISPOSABLE_TARGET_REQUIRED','UNKNOWN_COMMAND','SERVER_NOT_INITIALIZED','INVALID_SETTING_STATE']);
    const code=known.has(error?.message)?error.message:/^P\d{4}$/.test(error?.code??'')?error.code:'LOCAL_SETUP_OR_DATABASE_ERROR';
    console.error(`FAIL: ${code}. No credentials displayed.`);process.exitCode=1;
  }finally{if(db)await db.$disconnect().catch(()=>{console.error('FAIL: Database disconnect failed.');process.exitCode=1;});}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)await main();
