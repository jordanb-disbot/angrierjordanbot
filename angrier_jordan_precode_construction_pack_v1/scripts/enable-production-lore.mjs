import {randomUUID} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {GUILD,productionTarget} from './audit-production-race-line.mjs';
const check=(ok,code)=>{if(!ok)throw Error(code);};
const canonicalLore=async()=>JSON.parse(await readFile(new URL('../packages/content/lore/chapters.json',import.meta.url),'utf8'));
export async function enableProductionLore({db,config,write=console.log}){
 check(await db.guild.findUnique({where:{id:GUILD},select:{id:true}}),'PRODUCTION_GUILD_MISSING');
 const source=await canonicalLore(),ids=source.map(chapter=>'lore:'+chapter.id);
 check(source.length===3&&new Set(ids).size===3&&source.every(chapter=>typeof chapter.id==='string'&&Number.isInteger(chapter.contentVersion)&&chapter.contentVersion>0&&Array.isArray(chapter.paragraphs)&&chapter.paragraphs.every(paragraph=>typeof paragraph==='string'&&paragraph.trim())),'LORE_SOURCE_INVALID');
 for(const chapter of source)await db.contentEntry.upsert({where:{id:'lore:'+chapter.id},create:{id:'lore:'+chapter.id,game:'lore',category:chapter.id,payload:{paragraphs:chapter.paragraphs},tags:['lore',chapter.id],enabled:true,contentVersion:chapter.contentVersion},update:{game:'lore',category:chapter.id,payload:{paragraphs:chapter.paragraphs},tags:['lore',chapter.id],enabled:true,contentVersion:chapter.contentVersion}});
 const chapters=await db.contentEntry.findMany({where:{id:{in:ids}},select:{id:true,game:true,enabled:true,contentVersion:true,payload:true}});
 check(chapters.length===3&&source.every(chapter=>{const row=chapters.find(candidate=>candidate.id==='lore:'+chapter.id);return row?.game==='lore'&&row.enabled===true&&row.contentVersion===chapter.contentVersion&&JSON.stringify(row.payload)===JSON.stringify({paragraphs:chapter.paragraphs});}),'LORE_CONTENT_INVALID');
 const feature=await config.getWithMetadata(GUILD,'features.lore');if(feature.value!==true)await config.set({guildId:GUILD,key:'features.lore',value:true,expectedVersion:feature.version,source:'operator.production-lore',requestId:randomUUID()});
 check(await config.get(GUILD,'features.lore')===true,'LORE_ENABLE_VERIFY_FAILED');
 for(const chapter of source)write(`PASS: lore:${chapter.id} authored chapter synced and verified.`);
 write('PASS: features.lore=true. Add ENABLE_LEARNING_SMOKE=true before worker redeploy.');
}
async function connectProduction(target){const [{PrismaClient},{PrismaConfigRepository,PrismaAuditSink},{ConfigService},{AuditService},{SETTINGS}]=await Promise.all([import('@prisma/client'),import('../dist/packages/database/src/prisma-adapters.js'),import('../dist/packages/core/src/config-service.js'),import('../dist/packages/core/src/audit.js'),import('../dist/packages/contracts/src/generated/settings.js')]);const db=new PrismaClient({datasourceUrl:target.databaseUrl,log:[]});return{db,config:new ConfigService(SETTINGS,new PrismaConfigRepository(db),new AuditService(new PrismaAuditSink(db)))};}
export async function main(env=process.env,{connect,write=console.log,error=console.error}={}){let db;try{const target=productionTarget(env);const connection=connect?await connect(target):await connectProduction(target);db=connection.db;await enableProductionLore({...connection,write});}catch(cause){error(`FAIL: ${/^[A-Z][A-Z0-9_]+$/.test(cause?.message??'')?cause.message:'PRODUCTION_LORE_FAILED'}. No exception details displayed.`);return 1;}finally{if(db)try{await db.$disconnect();}catch{error('FAIL: DATABASE_DISCONNECT_FAILED.');return 1;}}return 0;}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)process.exitCode=await main();
