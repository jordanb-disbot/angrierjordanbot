import test from 'node:test';
import assert from 'node:assert/strict';
import {PrismaEventsRepository} from '../../dist/packages/features-events/src/prisma-repository.js';

function harness(type='race'){
 const now=new Date('2026-09-26T12:00:00Z'),receipts=new Map(),jobs=[];
 let row={id:'round',guildId:'server',channelId:'events',ownerUserId:'one',type,state:'OPEN',data:{racers:[{userId:'one',name:'One',chair:1},{userId:'two',name:'Two',chair:2}]},expiresAt:new Date(now.getTime()+30000),extensionUsed:false,version:0,createdAt:now,updatedAt:now},recent=[],writes=0,draws=0,seed=7654;
 const db={
  gameSession:{findUnique:async()=>structuredClone(row),findMany:async()=>structuredClone(recent),updateMany:async({where,data})=>{assert.equal(where.version,row.version);row={...row,...structuredClone(data)};writes++;return{count:1};}},
  memberPresenceState:{findFirst:async()=>null},
  scheduledJob:{create:async({data})=>{jobs.push(data);writes++;return data;}},
  operationReceipt:{findUnique:async({where})=>receipts.get(where.guildId_key.key),create:async({data})=>{receipts.set(data.key,data);writes++;return data;}},
  $transaction:async(fn,options)=>{assert.equal(options.isolationLevel,'Serializable');return fn(db);}
 };
 const repo=new PrismaEventsRepository(db,max=>{draws++;seed=(Math.imul(seed,1664525)+1013904223)>>>0;return Math.floor(seed/4294967296*max);},()=>now);
 return{repo,jobs,get row(){return row;},get writes(){return writes;},get draws(){return draws;},setRecent(value){recent=value;},due(){row.expiresAt=new Date(now.getTime()-1);}};
}

test('event preparation is read-only and wager/extension versions retain the private prepared outcome',async()=>{
 for(const type of ['race','fight']){
  const h=harness(type),prepared=await h.repo.prepareClose('server','round'),draws=h.draws;
  assert.equal(h.writes,0);assert.equal(h.row.state,'OPEN');assert.equal(h.row.data.plan,undefined);assert.equal(h.row.data.fightPlan,undefined);assert.equal(prepared.version,0);
  h.row.version+=2;h.row.extensionUsed=true;h.due();await h.repo.closeBetting('server','round',prepared);
  assert.equal(h.draws,draws,'closing reuses the same privately prepared outcome');assert.equal(h.row.state,'LOCKED');assert.deepEqual(h.row.data[type==='fight'?'fightPlan':'plan'],prepared.data[type==='fight'?'fightPlan':'plan']);
  assert.equal(h.jobs.length,1);assert.equal(h.jobs[0].dueAt.getTime()-new Date(h.row.data.startedAt).getTime(),(h.row.data.fightPlan??h.row.data.plan).durationMs);
  const writes=h.writes;await h.repo.closeBetting('server','round',prepared);assert.equal(h.writes,writes,'replayed close creates no second timer or outcome');
 }
});

test('membership changes invalidate prepared Race outcomes without rejecting a valid close',async()=>{
 const h=harness(),prepared=await h.repo.prepareClose('server','round'),draws=h.draws;
 h.row.data.racers.push({userId:'three',name:'Three',chair:3});h.row.version++;h.due();await h.repo.closeBetting('server','round',prepared);
 assert.ok(h.draws>draws);assert.equal(h.row.state,'LOCKED');assert.notDeepEqual(h.row.data.plan,prepared.data.plan);
});

test('Fight preparation rechecks the recent move policy inside the close transaction',async()=>{
 const h=harness('fight'),prepared=await h.repo.prepareClose('server','round'),draws=h.draws;
 h.setRecent([{data:{fightPlan:{usedMoveIds:prepared.data.fightPlan.usedMoveIds}}}]);h.due();await h.repo.closeBetting('server','round',prepared);
 assert.ok(h.draws>draws);assert.equal(h.row.state,'LOCKED');assert.ok(h.row.data.fightPlan.usedMoveIds.every(id=>!prepared.data.fightPlan.usedMoveIds.includes(id)));
});

test('prepared plans do not bypass deadline, identity or insufficient-members guards',async()=>{
 const h=harness(),prepared=await h.repo.prepareClose('server','round');
 await assert.rejects(h.repo.closeBetting('server','round',prepared),{code:'NOT_DUE'});assert.equal(h.writes,0);
 await assert.rejects(h.repo.prepareClose('other-server','round'),{code:'EVENT_MISSING'});
 h.row.data.racers.pop();assert.equal(await h.repo.prepareClose('server','round'),undefined);assert.equal(h.writes,0);
 const fresh=harness(),other=await fresh.repo.prepareClose('server','round'),draws=fresh.draws;fresh.due();await fresh.repo.closeBetting('server','round',{...other,sessionId:'other-round'});assert.ok(fresh.draws>draws);
});

test('restart without preparation preserves the ordinary authoritative close path',async()=>{
 const h=harness('fight');h.due();await h.repo.closeBetting('server','round');assert.equal(h.row.state,'LOCKED');assert.ok(h.row.data.fightPlan.beats.length>0);assert.equal(h.jobs.length,1);
 assert.equal(await h.repo.prepareClose('server','round'),undefined);
});
