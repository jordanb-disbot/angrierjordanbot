import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {GUILD,productionTarget} from './audit-production-race-line.mjs';

const CONTENT_DIR=new URL('../packages/features-party/content/',import.meta.url);
const SOURCES=Object.freeze([
 {game:'wyr',file:'wyr_continuation_WYR-0461_to_2000.json',expected:2000,scope:'continuation_only'},
 {game:'truth',file:'truth_1500.json',expected:1500,scope:'complete'},
 {game:'dare',file:'dare_1200.json',expected:1200,scope:'complete'},
 {game:'wwyd',file:'wwyd_1500.json',expected:1500,scope:'complete'},
]);
export const ORIGINAL_ARCHIVE='reference/content/angrier_jordan_core_prompt_pack_v1_FINAL.zip';
const number=(id,prefix)=>{const match=new RegExp('^'+prefix+'-(\\d+)$').exec(id);return match?Number(match[1]):null;};
export const compactIds=(ids,prefix)=>{
 const values=[...ids].sort((a,b)=>a.localeCompare(b,undefined,{numeric:true})),out=[];
 for(let index=0;index<values.length;){const first=values[index],start=number(first,prefix);if(start===null){out.push(first);index++;continue;}let end=start,next=index+1;while(next<values.length&&number(values[next],prefix)===end+1){end++;next++;}out.push(start===end?first:`${prefix}-${String(start).padStart(4,'0')}..${prefix}-${String(end).padStart(4,'0')}`);index=next;}
 return out;
};
export function sourceDefinitions(read=path=>readFileSync(new URL(path,CONTENT_DIR),'utf8')){
 return SOURCES.map(source=>{const ids=JSON.parse(read(source.file)).map(row=>row.id);if(new Set(ids).size!==ids.length)throw Error('SOURCE_DUPLICATE_IDS');return {...source,ids};});
}
export async function inspectDatabase(db,definitions){return db.$transaction(async tx=>{await tx.$executeRawUnsafe('SET TRANSACTION READ ONLY');return tx.contentEntry.findMany({where:{game:{in:definitions.map(d=>d.game)}},select:{id:true,game:true,enabled:true,contentVersion:true,category:true},orderBy:[{game:'asc'},{id:'asc'}]});});}
export const compare=(definitions,rows)=>definitions.map(definition=>{
 const source=new Set(definition.ids),current=rows.filter(row=>row.game===definition.game),present=new Set(current.map(row=>row.id)),matching=current.filter(row=>source.has(row.id)),missing=definition.ids.filter(id=>!present.has(id)),disabled=matching.filter(row=>!row.enabled).map(row=>row.id),databaseOnly=current.filter(row=>!source.has(row.id)).map(row=>row.id),prefix=definition.game==='wyr'?'WYR':definition.game.toUpperCase(),historicWyr=databaseOnly.filter(id=>{const value=number(id,'WYR');return value!==null&&value>=1&&value<=460;});
 return {game:definition.game,sourceFile:definition.file,scope:definition.scope,sourceCount:definition.ids.length,expectedTarget:definition.expected,totalCurrent:current.length,enabledCurrent:current.filter(row=>row.enabled).length,matchingSourceIds:matching.length,sourceMissing:compactIds(missing,prefix),sourceDisabled:compactIds(disabled,prefix),databaseOnly:compactIds(databaseOnly,prefix),...(definition.game==='wyr'?{historicBaselinePresent:compactIds(historicWyr,'WYR'),historicBaselineCount:historicWyr.length,sourceBaselineUnavailable:'WYR-0001..WYR-0460'}:{})};
});
const line=(write,label,value)=>write(`${label}: ${JSON.stringify(value)}`);
export async function main(env=process.env,{connectDatabase,read,write=console.log,error=console.error}={}){
 let db;
 try{
  const definitions=sourceDefinitions(read);line(write,'PASS',{originalArchive:ORIGINAL_ARCHIVE,archiveScope:'WYR continuation plus complete Truth, Dare, and WWYD banks'});
  for(const definition of definitions)line(write,'SOURCE',{game:definition.game,file:'packages/features-party/content/'+definition.file,count:definition.ids.length,expectedTarget:definition.expected,scope:definition.scope});
  line(write,'FINDING',{game:'wyr',missingFromAllLocatedSource:'WYR-0001..WYR-0460',count:460,detail:'Archive manifest says these were approved earlier and intentionally not duplicated. Runtime seeder does not load packages/content/golden/wyr_sample.json, which contains only six WYR-GOLD samples.'});
  const target=productionTarget(env);db=connectDatabase?await connectDatabase(target):new (await import('@prisma/client')).PrismaClient({datasourceUrl:target.databaseUrl,log:[]});
  const found=await db.$transaction(async tx=>{await tx.$executeRawUnsafe('SET TRANSACTION READ ONLY');return tx.guild.findUnique({where:{id:GUILD},select:{id:true}});});if(!found)throw Error('TARGET');
  const results=compare(definitions,await inspectDatabase(db,definitions));line(write,'PASS',{productionTarget:'verified_private_railway_database',guildId:GUILD});for(const result of results)line(write,'DATABASE',result);line(write,'PASS',{readOnly:true,note:'No prompts, enabled states, or content rows were modified.'});return 0;
 }catch(cause){error(`FAIL: ${/^[A-Z_]+$/.test(cause?.message??'')?cause.message:'PARTY_CONTENT_AUDIT_FAILED'}. No exception details displayed.`);return 1;}finally{await db?.$disconnect().catch(()=>undefined);}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)process.exitCode=await main();
