import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {GUILD,productionTarget} from './audit-production-race-line.mjs';
import {inspect} from './validate-wyr-bank.mjs';

const source=new URL('../packages/features-party/content/wyr_2000.json',import.meta.url);
export const restorationRows=()=>{
 const rows=JSON.parse(readFileSync(source,'utf8')),report=inspect(rows);
 if(!report.valid||rows.length!==2000)throw Error('WYR_SOURCE_INVALID');
 const restoration=rows.filter(row=>Number(row.id.slice(4))>=1&&Number(row.id.slice(4))<=460);
 if(restoration.length!==460||restoration[0]?.id!=='WYR-0001'||restoration.at(-1)?.id!=='WYR-0460')throw Error('WYR_RESTORATION_RANGE_INVALID');
 return restoration;
};
const data=row=>({id:row.id,game:'wyr',category:row.category,intensity:row.intensity,payload:{text:row.text,optionA:row.option_a,optionB:row.option_b},tags:row.tags,enabled:row.enabled,contentVersion:row.content_version});
export async function importRestoration(db,rows=restorationRows()){
 return db.$transaction(async tx=>{
  const before=await tx.contentEntry.findMany({where:{id:{in:rows.map(row=>row.id)},game:'wyr'},select:{id:true}});
  const created=await tx.contentEntry.createMany({data:rows.map(data),skipDuplicates:true});
  const after=await tx.contentEntry.findMany({where:{game:'wyr'},select:{id:true,enabled:true}});
  return {alreadyPresent:before.length,inserted:created.count,total:after.length,enabled:after.filter(row=>row.enabled).length};
 });
}
export async function main(env=process.env,{connectDatabase,write=console.log,error=console.error}={}){
 let db;
 try{
  const rows=restorationRows(),target=productionTarget(env);db=connectDatabase?await connectDatabase(target):new (await import('@prisma/client')).PrismaClient({datasourceUrl:target.databaseUrl,log:[]});
  const guild=await db.guild.findUnique({where:{id:GUILD},select:{id:true}});if(!guild)throw Error('TARGET');
  const result=await importRestoration(db,rows);
  const counts=await db.contentEntry.groupBy({by:['game','enabled'],where:{game:{in:['wyr','truth','dare','wwyd']}},_count:{_all:true}});
  const count=(game,enabled)=>counts.find(row=>row.game===game&&row.enabled===enabled)?._count._all??0;
  write(`PASS: WYR restoration source=460; already_present=${result.alreadyPresent}; inserted=${result.inserted}.`);
  write(`PASS: production counts wyr=${result.total} enabled=${result.enabled}; truth=${count('truth',true)}; dare=${count('dare',true)}; wwyd=${count('wwyd',true)}.`);
  write('PASS: only missing WYR-0001..WYR-0460 IDs were eligible for insertion; existing content was not overwritten.');return 0;
 }catch(cause){error(`FAIL: ${/^[A-Z_]+$/.test(cause?.message??'')?cause.message:'WYR_RESTORATION_FAILED'}. No exception details displayed.`);return 1;}finally{await db?.$disconnect().catch(()=>undefined);}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)process.exitCode=await main();
