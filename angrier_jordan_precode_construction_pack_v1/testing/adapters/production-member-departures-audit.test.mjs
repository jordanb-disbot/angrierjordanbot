import test from 'node:test';
import assert from 'node:assert/strict';
import {mountainRange,findDepartures,main} from '../../scripts/audit-production-member-departures.mjs';
const env={NODE_ENV:'production',AJ_DATABASE_PURPOSE:'production',DISCORD_GUILD_ID:'1524964384642957432',DATABASE_URL:'postgresql://user:pass@postgres.railway.internal:5432/railway',DISCORD_TOKEN:'never-print'};
test('uses the Mountain calendar day and a read-only transaction',async()=>{
 const range=mountainRange('2026-10-03');assert.equal(range.start.toISOString(),'2026-10-03T06:00:00.000Z');assert.equal(range.end.toISOString(),'2026-10-04T06:00:00.000Z');
 const calls=[];
 const db={$transaction:async callback=>callback({$executeRawUnsafe:async sql=>calls.push(sql),memberPresenceState:{findMany:async query=>{assert.equal(query.where.leftAt.gte.toISOString(),range.start.toISOString());return[];}}})};
 assert.deepEqual(await findDepartures(db,'2026-10-03'),[]);assert.deepEqual(calls,['SET TRANSACTION READ ONLY']);
});
test('reports a Discord name when a stored nickname is unavailable',async()=>{const output=[],methods=[],db={$transaction:async callback=>callback({$executeRawUnsafe:async()=>{},memberPresenceState:{findMany:async()=>[{userId:'123',nickname:null,leftAt:new Date('2026-10-03T12:00:00Z')}]}}),$disconnect:async()=>{}};assert.equal(await main(env,{now:new Date('2026-10-04T18:00:00Z'),connectDatabase:async()=>db,fetcher:async(_url,options)=>{methods.push(options.method);return{ok:true,json:async()=>({global_name:'Departed Member'})};},write:line=>output.push(line)}),0);assert.match(output.join('\n'),/Departed Member/);assert.deepEqual(methods,['GET']);assert.doesNotMatch(output.join('\n'),/never-print/);});
