import test from 'node:test';import assert from 'node:assert/strict';
import {isRetryableAtomicError,PrismaAtomicOperations} from '../../.test-build/packages/database/src/atomic-operations.js';
test('shared atomic retry recognizes Prisma-wrapped PostgreSQL deadlocks without retrying business failures',async()=>{
 const deadlock={name:'PrismaClientUnknownRequestError',message:'ConnectorError { QueryError(PostgresError { code: "40P01", message: "deadlock detected" }) }'};
 assert.equal(isRetryableAtomicError(deadlock),true);assert.equal(isRetryableAtomicError({code:'P2010',meta:{code:'40001'}}),true);assert.equal(isRetryableAtomicError({code:'INSUFFICIENT_FUNDS'}),false);assert.equal(isRetryableAtomicError(new Error('Unrelated failure 40P01')),false);
 let calls=0,commits=0;const db={$transaction:async fn=>{calls++;if(calls===1)throw deadlock;return fn({operationReceipt:{findUnique:async()=>null,create:async()=>{commits++;}}});}};
 assert.deepEqual(await new PrismaAtomicOperations(db).run('g','key','fingerprint',async()=>({ok:true})),{ok:true});assert.equal(calls,2);assert.equal(commits,1);
});

const controlledRetry=(sample=0.5)=>{let time=0;const delays=[];return{delays,advance:ms=>{time+=ms;},now:()=>time,pause:async ms=>{delays.push(ms);time+=ms;},random:()=>sample};};
test('atomic receipt commit survives more than five serializable conflict waves without partial success',async()=>{
 const runtime=controlledRetry();let attempts=0,operations=0,committed=0;
 const db={$transaction:async(fn,options)=>{assert.equal(options.isolationLevel,'Serializable');attempts++;let wrote=false;const result=await fn({operationReceipt:{findUnique:async()=>null,create:async()=>{if(attempts<=6)throw{code:'P2034'};wrote=true;}}});if(wrote)committed++;return result;}};
 assert.deepEqual(await new PrismaAtomicOperations(db,runtime).run('g','key','fingerprint',async()=>{operations++;return{ok:true};}),{ok:true});
 assert.equal(attempts,7);assert.equal(operations,7);assert.equal(committed,1);assert.equal(runtime.delays.length,6);assert.ok(runtime.delays.every(ms=>ms>0&&ms<=1000));
});
test('retry rechecks the committed receipt and does not execute a completed action again',async()=>{
 const runtime=controlledRetry();let attempts=0,operations=0;
 const db={$transaction:async fn=>{attempts++;if(attempts===1)throw{code:'P2034'};return fn({operationReceipt:{findUnique:async()=>({fingerprint:'fingerprint',result:{saved:true}}),create:async()=>assert.fail('must not write another receipt')}});}};
 assert.deepEqual(await new PrismaAtomicOperations(db,runtime).run('g','key','fingerprint',async()=>{operations++;return{saved:false};}),{saved:true});assert.equal(operations,0);assert.equal(attempts,2);
 await assert.rejects(new PrismaAtomicOperations(db,runtime).run('g','key','different',async()=>({})),{code:'REPLAY_MISMATCH'});
});
test('atomic contention has attempt and elapsed-time bounds; business failures do not retry',async()=>{
 const runtime=controlledRetry(0.999);let calls=0;const db={$transaction:async()=>{calls++;throw{code:'P2034'};}};
 await assert.rejects(new PrismaAtomicOperations(db,runtime).run('g','key','fp',async()=>({})),{code:'CONCURRENT_OPERATION'});assert.equal(calls,12);assert.equal(runtime.delays.length,11);assert.ok(runtime.delays.reduce((a,b)=>a+b,0)<30_000);
 const elapsed=controlledRetry();calls=0;const slow={$transaction:async(fn,options)=>{calls++;assert.ok(options.timeout<=20_000);assert.ok(options.maxWait+options.timeout<=30_000-elapsed.now());elapsed.advance(Math.min(20_000,options.maxWait+options.timeout));throw{code:'P2034'};}};await assert.rejects(new PrismaAtomicOperations(slow,elapsed).run('g','key','fp',async()=>({})),{code:'CONCURRENT_OPERATION'});assert.equal(calls,2);
 calls=0;const business={$transaction:async()=>{calls++;throw{code:'INSUFFICIENT_FUNDS'};}};await assert.rejects(new PrismaAtomicOperations(business,controlledRetry()).run('g','key','fp',async()=>({})),{code:'INSUFFICIENT_FUNDS'});assert.equal(calls,1);
});
test('atomic retry jitter gives contenders different nonzero wait times within the cap',async()=>{
 const waits=[];for(const sample of [0,0.9]){const runtime=controlledRetry(sample);let calls=0;const db={$transaction:async fn=>{if(++calls===1)throw{code:'P2034'};return fn({operationReceipt:{findUnique:async()=>null,create:async()=>{}}});}};await new PrismaAtomicOperations(db,runtime).run('g','k','f',async()=>({}));waits.push(runtime.delays[0]);}assert.ok(waits[0]>0&&waits[1]<25);assert.notEqual(waits[0],waits[1]);
});

test('synchronous final guard rejects a generation change during receipt write and rolls back all staged writes',async()=>{
 let generation=0,transactions=0,guardCalls=0,committed={balance:100,receipts:0};const observed=generation,trace=[],failure=Object.assign(new Error('Membership changed'),{code:'MEMBERSHIP_CHANGED'});
 const db={$transaction:async fn=>{
  transactions++;const staged={...committed};
  const result=await fn({staged,operationReceipt:{findUnique:async()=>null,create:async()=>{trace.push('receipt-start');staged.receipts++;await Promise.resolve();generation++;trace.push('receipt-finish');}}});
  committed=staged;return result;
 }};
 await assert.rejects(new PrismaAtomicOperations(db,controlledRetry()).run('g','estate','estate',async tx=>{trace.push('operation');tx.staged.balance=0;assert.equal(generation,observed);return{paid:true};},()=>{trace.push('guard');guardCalls++;if(generation!==observed)throw failure;}),error=>error===failure);
 assert.deepEqual(trace,['operation','receipt-start','receipt-finish','guard']);assert.deepEqual(committed,{balance:100,receipts:0});assert.equal(transactions,1);assert.equal(guardCalls,1);
});

test('final guard runs on replay without re-executing work and propagates its original error',async()=>{
 let operations=0,guardCalls=0;const failure=Object.assign(new Error('Membership unavailable'),{code:'MEMBERSHIP_CHANGED'}),db={$transaction:async fn=>fn({operationReceipt:{findUnique:async()=>({fingerprint:'fp',result:{saved:true}}),create:async()=>assert.fail('No receipt write on replay')}})},operation=async()=>{operations++;return{saved:false};};
 assert.deepEqual(await new PrismaAtomicOperations(db).run('g','key','fp',operation,()=>{guardCalls++;}),{saved:true});
 await assert.rejects(new PrismaAtomicOperations(db).run('g','key','fp',operation,()=>{guardCalls++;throw failure;}),error=>error===failure);
 await assert.rejects(new PrismaAtomicOperations(db).run('g','key','mismatch',operation,()=>assert.fail('Replay identity must be checked first')),{code:'REPLAY_MISMATCH'});
 assert.equal(operations,0);assert.equal(guardCalls,2);
});

test('retryable final-guard conflicts retry the whole transaction without committing earlier writes',async()=>{
 let attempts=0,guardCalls=0,committed={balance:100,receipts:0};const db={$transaction:async fn=>{attempts++;const staged={...committed},result=await fn({staged,operationReceipt:{findUnique:async()=>null,create:async()=>{staged.receipts++;}}});committed=staged;return result;}};
 assert.deepEqual(await new PrismaAtomicOperations(db,controlledRetry()).run('g','key','fp',async tx=>{tx.staged.balance-=10;return{paid:true};},()=>{if(++guardCalls===1)throw{code:'P2034'};}),{paid:true});
 assert.equal(attempts,2);assert.equal(guardCalls,2);assert.deepEqual(committed,{balance:90,receipts:1});
});
