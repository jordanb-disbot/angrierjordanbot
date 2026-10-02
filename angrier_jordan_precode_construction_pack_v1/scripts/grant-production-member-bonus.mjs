import {pathToFileURL} from 'node:url';
import {GUILD,productionTarget} from './audit-production-race-line.mjs';

export const MEMBER_BONUS=40_000n;
export const MEMBER_BONUS_VERSION='chairs-member-bonus-40000:v1';
const check=(ok,code)=>{if(!ok)throw Error(code);};
const snowflake=value=>typeof value==='string'&&/^\d{17,20}$/.test(value);
export const memberBonusKey=userId=>`operator:${MEMBER_BONUS_VERSION}:${GUILD}:${userId}`;

/** Enumerate the production guild before any financial write, excluding Discord bots. */
export async function currentHumanMembers(get){
 const members=[],seen=new Set();let after='';
 for(;;){
  const page=await get(`/guilds/${GUILD}/members?limit=1000${after?`&after=${after}`:''}`);
  check(Array.isArray(page),'DISCORD_MEMBERS_INVALID');
  for(const member of page){
   const id=member?.user?.id;check(snowflake(id),'DISCORD_MEMBER_INVALID');
   if(seen.has(id))continue;seen.add(id);if(member.user.bot!==true)members.push(id);
  }
  if(page.length<1000)break;
  const last=page.at(-1)?.user?.id;check(snowflake(last)&&last!==after,'DISCORD_MEMBER_PAGINATION_INVALID');after=last;
 }
 check(members.length>0,'NO_HUMAN_MEMBERS_FOUND');
 return members.sort((a,b)=>a.localeCompare(b));
}

export async function grantProductionMemberBonus({db,get,atomic,write=console.log}){
 check(await db.guild.findUnique({where:{id:GUILD},select:{id:true}}),'PRODUCTION_GUILD_MISSING');
 const members=await currentHumanMembers(get),keys=members.map(memberBonusKey);
 const prior=await db.operationReceipt.findMany({where:{guildId:GUILD,key:{in:keys}},select:{key:true}});
 const complete=new Set(prior.map(row=>row.key));
 let granted=0,alreadyGranted=0;
 for(const userId of members){
  const key=memberBonusKey(userId);
  if(complete.has(key)){alreadyGranted++;continue;}
  await atomic.run(GUILD,key,MEMBER_BONUS_VERSION,async(_tx,ledger)=>{
   const status=await ledger.apply({guildId:GUILD,idempotencyKey:key+':ledger',lines:[
    {userId,bucket:'wallet',amount:MEMBER_BONUS,reason:'Chairs all-member starting bonus'},
    {bucket:'system',amount:-MEMBER_BONUS,reason:'Chairs all-member starting bonus'},
   ]});
   check(status==='applied','MEMBER_BONUS_LEDGER_NOT_APPLIED');
   return {userId,amount:MEMBER_BONUS.toString()};
  });
  granted++;
 }
 write(`PASS: production guild and ${members.length} current human members verified before granting.`);
 write(`PASS: granted ${MEMBER_BONUS.toString()} Ottomans to ${granted} member${granted===1?'':'s'}; ${alreadyGranted} already had this one-time bonus.`);
 write('PASS: each grant is a balanced ledger transaction and has a durable per-member receipt; rerunning this command will not pay a member twice.');
 return {members:members.length,granted,alreadyGranted,amount:MEMBER_BONUS};
}

async function connectProduction(target){
 const [{PrismaClient},{PrismaAtomicOperations}]=await Promise.all([import('@prisma/client'),import('../dist/packages/database/src/atomic-operations.js')]);
 const db=new PrismaClient({datasourceUrl:target.databaseUrl,log:[]});return {db,atomic:new PrismaAtomicOperations(db)};
}

export async function main(env=process.env,{connect,fetcher=fetch,write=console.log,error=console.error}={}){
 let db;
 try{
  const target=productionTarget(env);check(typeof env.DISCORD_TOKEN==='string'&&env.DISCORD_TOKEN.length>0,'DISCORD_TOKEN_MISSING');
  const connection=connect?await connect(target):await connectProduction(target);db=connection.db;
  const get=async path=>{const response=await fetcher('https://discord.com/api/v10'+path,{headers:{Authorization:'Bot '+env.DISCORD_TOKEN},signal:AbortSignal.timeout(15000)});check(response.ok,'DISCORD_READ_FAILED');return response.json();};
  await grantProductionMemberBonus({...connection,get,write});
 }catch(cause){const safe=/^[A-Z][A-Z0-9_]+$/.test(cause?.message??'')?cause.message:'PRODUCTION_MEMBER_BONUS_FAILED';error(`FAIL: ${safe}. No exception details displayed.`);return 1;
 }finally{if(db)try{await db.$disconnect();}catch{error('FAIL: DATABASE_DISCONNECT_FAILED.');return 1;}}
 return 0;
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)process.exitCode=await main();
