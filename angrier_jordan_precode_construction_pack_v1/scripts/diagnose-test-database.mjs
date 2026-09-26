// Bounded read-only diagnostics. Never reads DATABASE_URL or logs connection details.
import fs from 'node:fs';import {parseEnv} from 'node:util';import {PrismaClient} from '@prisma/client';
const value=parseEnv(fs.readFileSync(new URL('../.env.test.local',import.meta.url),'utf8')).TEST_DATABASE_URL;
if(!value||value.includes('${'))throw Error('A resolved dedicated TEST_DATABASE_URL is required.');
const url=new URL(value);if(!['postgres:','postgresql:'].includes(url.protocol))throw Error('Dedicated test URL has an invalid protocol.');
const results=[];const timed=async(label,fn)=>{const start=performance.now();try{await fn();results.push({label,ms:Math.round(performance.now()-start),ok:true});}catch(e){results.push({label,ms:Math.round(performance.now()-start),ok:false,code:typeof e.code==='string'?e.code:'UNAVAILABLE'});}};
const deadline=setTimeout(()=>{console.log(JSON.stringify({status:'DIAGNOSTIC_DEADLINE',results}));process.exit(1);},60_000);
const db=new PrismaClient({datasourceUrl:url.toString()});
try{
 await timed('cold_connect',()=>db.$connect());
 for(let n=1;n<=5;n++)await timed('warm_select_'+n,()=>db.$queryRaw`SELECT 1`);
 await timed('two_parallel_selects',()=>Promise.all([db.$queryRaw`SELECT 1`,db.$queryRaw`SELECT 1`]));
 await timed('warm_read_transaction',()=>db.$transaction(tx=>tx.$queryRaw`SELECT 1`,{maxWait:10_000,timeout:20_000}));
 let pressure;await timed('connection_pressure',async()=>{const [row]=await db.$queryRaw`SELECT current_setting('max_connections') AS capacity, (SELECT count(*)::int FROM pg_stat_activity) AS total, (SELECT count(*)::int FROM pg_stat_activity WHERE state='active') AS active`;pressure=row;});
 console.log(JSON.stringify({status:'COMPLETE',readOnly:true,results,pressure},null,2));
}finally{await db.$disconnect();clearTimeout(deadline);}
