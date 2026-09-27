import test from 'node:test';
import assert from 'node:assert/strict';
import {main,productionChairismsTarget} from '../../scripts/enable-production-chairisms.mjs';

const env={NODE_ENV:'production',AJ_DATABASE_PURPOSE:'production',DISCORD_GUILD_ID:'1524964384642957432',DATABASE_URL:'postgresql://user:secret@postgres.railway.internal/railway'};
function fixture(){
  const rows=new Map(),writes=[],output=[],errors=[];
  let exists=true,closed=0;
  const db={guild:{findUnique:async()=>exists?{id:env.DISCORD_GUILD_ID}:null},$disconnect:async()=>{closed++;}};
  const config={getWithMetadata:async(_guild,key)=>rows.get(key)??{value:false,version:0},set:async input=>{
    assert.equal(input.guildId,env.DISCORD_GUILD_ID);
    assert.equal(input.expectedVersion,rows.get(input.key)?.version??0);
    assert.equal(input.source,'operator.production-chairisms-enablement');
    assert.ok(input.requestId);
    writes.push(input);rows.set(input.key,{value:input.value,version:input.expectedVersion+1});
  }};
  return {rows,writes,output,errors,db,config,setMissing:()=>{exists=false;},closed:()=>closed,run:()=>main(env,{connect:async()=>({db,config}),write:s=>output.push(s),error:s=>errors.push(s)})};
}
test('rejects wrong environment, guild, URL and public host before connecting',async()=>{
  for(const override of [{NODE_ENV:'development'},{AJ_DATABASE_PURPOSE:'test'},{DISCORD_GUILD_ID:'1553150573866647552'},{DATABASE_URL:undefined},{DATABASE_URL:'invalid'},{DATABASE_URL:'postgresql://public.example/db'},{DATABASE_URL:'postgresql://postgres.railway.internal.evil/db'},{DATABASE_URL:'https://postgres.railway.internal/db'}]){
    let connected=false;
    assert.equal(await main({...env,...override},{connect:async()=>{connected=true;},error:()=>{}}),1);
    assert.equal(connected,false);
  }
  assert.equal(productionChairismsTarget(env).guildId,env.DISCORD_GUILD_ID);
});
test('missing guild produces no writes',async()=>{const f=fixture();f.setMissing();assert.equal(await f.run(),1);assert.equal(f.writes.length,0);assert.equal(f.closed(),1);});
test('writes only the two settings in safe order and is idempotent',async()=>{
  const f=fixture();assert.equal(await f.run(),0);
  assert.deepEqual(f.writes.map(({key,value})=>[key,value]),[['channels.chairisms_channel','1537594244796260412'],['features.chairisms',true]]);
  assert.equal(f.output.length,2);assert.equal(await f.run(),0);assert.equal(f.writes.length,2);
});
test('partial write failure is sanitized and retry resumes without duplicate writes',async()=>{
  const f=fixture(),set=f.config.set;let fail=true;
  f.config.set=async input=>{if(fail&&input.key==='features.chairisms')throw new Error(env.DATABASE_URL);return set(input);};
  assert.equal(await f.run(),1);assert.equal(f.output.length,0);assert.equal(f.writes.length,1);
  assert.ok(!f.errors.join('').includes('secret'));fail=false;assert.equal(await f.run(),0);assert.equal(f.writes.length,2);
});
test('failed readback is nonzero and emits no success confirmations',async()=>{
  const f=fixture();f.config.set=async()=>{};
  assert.equal(await f.run(),1);assert.equal(f.output.length,0);
});
test('disconnect failure exits nonzero without leaking exception',async()=>{
  const f=fixture();f.db.$disconnect=async()=>{throw new Error(env.DATABASE_URL);};
  assert.equal(await f.run(),1);assert.ok(!f.errors.join('').includes('secret'));
});
