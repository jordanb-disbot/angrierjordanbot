import test from 'node:test';
import assert from 'node:assert/strict';
import {DisposableCardLifecycle} from '../../dist/apps/bot/src/discord/card-lifecycle.js';

test('new disposable result removes the prior card for the same member and expires itself',async()=>{
 const lifecycle=new DisposableCardLifecycle(20),deleted=[];
 const card=id=>({id,delete:async()=>{deleted.push(id);}});
 await lifecycle.track('guild:channel:member',card('first'));
 await lifecycle.track('guild:channel:member',card('second'));
 assert.deepEqual(deleted,['first']);
 await new Promise(resolve=>setTimeout(resolve,40));
 assert.deepEqual(deleted,['first','second']);
});

test('cleanup failure cannot affect a newly saved result',async()=>{
 const lifecycle=new DisposableCardLifecycle(20),deleted=[];
 await lifecycle.track('one',{id:'stale',delete:async()=>{throw Error('Discord delete denied');}});
 await lifecycle.track('one',{id:'current',delete:async()=>{deleted.push('current');}});
 await lifecycle.track('other',{id:'independent',delete:async()=>{deleted.push('independent');}});
 await new Promise(resolve=>setTimeout(resolve,40));
 assert.deepEqual(deleted,['current','independent']);
});
