import {pathToFileURL} from 'node:url';
import {GUILD,productionTarget} from './audit-production-race-line.mjs';

const check=(ok,code)=>{if(!ok)throw Error(code);};
const dateKey=date=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Denver',year:'numeric',month:'2-digit',day:'2-digit'}).format(date);
const shiftDate=(date,days)=>{const [year,month,day]=date.split('-').map(Number),value=new Date(Date.UTC(year,month-1,day+days));return `${value.getUTCFullYear()}-${String(value.getUTCMonth()+1).padStart(2,'0')}-${String(value.getUTCDate()).padStart(2,'0')}`;};
const offsetFor=date=>new Intl.DateTimeFormat('en-US',{timeZone:'America/Denver',timeZoneName:'longOffset'}).formatToParts(new Date(`${date}T12:00:00Z`)).find(part=>part.type==='timeZoneName')?.value?.replace('GMT','')??'-07:00';
export function mountainRange(date){check(/^\d{4}-\d{2}-\d{2}$/.test(date),'AUDIT_DATE_INVALID');return{start:new Date(`${date}T00:00:00${offsetFor(date)}`),end:new Date(`${shiftDate(date,1)}T00:00:00${offsetFor(shiftDate(date,1))}`)};}
export async function findDepartures(db,date){const {start,end}=mountainRange(date);return db.$transaction(async tx=>{await tx.$executeRawUnsafe('SET TRANSACTION READ ONLY');return tx.memberPresenceState.findMany({where:{guildId:GUILD,leftAt:{gte:start,lt:end}},select:{userId:true,nickname:true,leftAt:true},orderBy:{leftAt:'asc'}});});}
async function connect(target){const {PrismaClient}=await import('@prisma/client');return new PrismaClient({datasourceUrl:target.databaseUrl,log:[]});}
export async function main(env=process.env,{now=new Date(),connectDatabase=connect,write=console.log,error=console.error}={}){let db;try{const target=productionTarget(env),date=env.AUDIT_DATE??shiftDate(dateKey(now),-1);db=await connectDatabase(target);const rows=await findDepartures(db,date);write(`PASS: member departures for ${date} America/Denver = ${rows.length}.`);for(const row of rows)write(`FINDING: memberId=${row.userId}; name=${JSON.stringify(row.nickname??'Unknown')}; leftAt=${row.leftAt.toISOString()}.`);return 0;}catch(cause){error(`FAIL: ${/^[A-Z][A-Z0-9_]+$/.test(cause?.message??'')?cause.message:'MEMBER_DEPARTURE_AUDIT_FAILED'}. No exception details displayed.`);return 1;}finally{await db?.$disconnect().catch(()=>undefined);}}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)process.exitCode=await main();
