import test from 'node:test';import assert from 'node:assert/strict';
import {isRetryableAtomicError,PrismaAtomicOperations} from '../../.test-build/packages/database/src/atomic-operations.js';
test('shared atomic retry recognizes Prisma-wrapped PostgreSQL deadlocks without retrying business failures',async()=>{
 const deadlock={name:'PrismaClientUnknownRequestError',message:'ConnectorError { QueryError(PostgresError { code: "40P01", message: "deadlock detected" }) }'};
 assert.equal(isRetryableAtomicError(deadlock),true);assert.equal(isRetryableAtomicError({code:'P2010',meta:{code:'40001'}}),true);assert.equal(isRetryableAtomicError({code:'INSUFFICIENT_FUNDS'}),false);assert.equal(isRetryableAtomicError(new Error('Unrelated failure 40P01')),false);
 let calls=0,commits=0;const db={$transaction:async fn=>{calls++;if(calls===1)throw deadlock;return fn({operationReceipt:{findUnique:async()=>null,create:async()=>{commits++;}}});}};
 assert.deepEqual(await new PrismaAtomicOperations(db).run('g','key','fingerprint',async()=>({ok:true})),{ok:true});assert.equal(calls,2);assert.equal(commits,1);
});
