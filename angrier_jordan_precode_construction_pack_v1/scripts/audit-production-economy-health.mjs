import {pathToFileURL} from 'node:url';
import {GUILD,productionTarget} from './audit-production-race-line.mjs';

const percentile=(values,p)=>values.length?values[Math.min(values.length-1,Math.max(0,Math.ceil(values.length*p)-1))]:0n;
const format=value=>value.toLocaleString('en-US');

/** Computes supply and concentration from read-only account and balanced-ledger snapshots. */
export function summarizeEconomyHealth(accounts,systemEntries){
 const wealth=accounts.map(account=>account.wallet+account.bank).sort((a,b)=>a<b?-1:a>b?1:0);
 const supply=wealth.reduce((sum,value)=>sum+value,0n),topFive=[...wealth].reverse().slice(0,5).reduce((sum,value)=>sum+value,0n);
 let minted=0n,burned=0n;
 for(const entry of systemEntries){if(entry.amount<0n)minted-=entry.amount;else burned+=entry.amount;}
 return {members:wealth.length,supply,median:percentile(wealth,.5),p90:percentile(wealth,.9),topFive,topFiveShareBasisPoints:supply?Number(topFive*10_000n/supply):0,minted,burned,netMinted:minted-burned};
}

export async function inspectEconomyHealth(db,now=new Date()){
 const since=new Date(now.getTime()-7*24*60*60*1000);
 return db.$transaction(async tx=>{
  await tx.$executeRawUnsafe('SET TRANSACTION READ ONLY');
  const [accounts,systemEntries]=await Promise.all([
   tx.economyAccount.findMany({where:{guildId:GUILD},select:{wallet:true,bank:true}}),
   tx.ledgerEntry.findMany({where:{guildId:GUILD,bucket:'system',createdAt:{gte:since}},select:{amount:true}}),
  ]);
  return {since,summary:summarizeEconomyHealth(accounts,systemEntries)};
 },{timeout:15000});
}

export async function main(env=process.env,{connect,write=console.log,error=console.error,now=new Date()}={}){
 let db;
 try{
  const target=productionTarget(env);db=connect?await connect(target):new (await import('@prisma/client')).PrismaClient({datasourceUrl:target.databaseUrl,log:[]});
  const found=await db.$transaction(async tx=>{await tx.$executeRawUnsafe('SET TRANSACTION READ ONLY');return tx.guild.findUnique({where:{id:GUILD},select:{id:true}});});
  if(!found)throw Error('PRODUCTION_GUILD_MISSING');
  const {since,summary}=await inspectEconomyHealth(db,now);
  write(`PASS: economy health is read-only; 7-day window begins ${since.toISOString()}.`);
  write(`PASS: members=${summary.members}; total supply=${format(summary.supply)} Ottomans; median=${format(summary.median)}; p90=${format(summary.p90)}.`);
  write(`PASS: top-five wealth=${format(summary.topFive)} (${(summary.topFiveShareBasisPoints/100).toFixed(2)}% of supply).`);
  write(`PASS: 7-day minted=${format(summary.minted)}; burned=${format(summary.burned)}; net=${format(summary.netMinted)} Ottomans.`);
  write('PASS: no rewards, balances, settings, or schedules were changed.');
 }catch(cause){const safe=/^[A-Z][A-Z0-9_]+$/.test(cause?.message??'')?cause.message:'PRODUCTION_ECONOMY_HEALTH_AUDIT_FAILED';error(`FAIL: ${safe}. No exception details displayed.`);return 1;
 }finally{if(db)try{await db.$disconnect();}catch{error('FAIL: DATABASE_DISCONNECT_FAILED.');return 1;}}
 return 0;
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)process.exitCode=await main();
