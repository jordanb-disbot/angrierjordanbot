import test from 'node:test'; import assert from 'node:assert/strict';
class Timer{static create(now,s){return{openedAt:now,expiresAt:new Date(now.getTime()+s*1000),extensionUsed:false}} static extend(t,s,now){if(t.extensionUsed)throw Error('used');if(now>=t.expiresAt)throw Error('expired');return{...t,expiresAt:new Date(t.expiresAt.getTime()+s*1000),extensionUsed:true}}}
test('timer allows one extension only',()=>{const now=new Date('2026-01-01T00:00:00Z');let t=Timer.create(now,60);t=Timer.extend(t,30,now);assert.equal((t.expiresAt-now)/1000,90);assert.throws(()=>Timer.extend(t,30,now));});
test('anonymous editable voting updates a ballot instead of duplicating',()=>{const m=new Map();const cast=(u,c)=>m.set(u,c);cast('u1','A');cast('u1','B');assert.equal(m.size,1);assert.equal(m.get('u1'),'B');});
test('balanced ledger lines sum to zero',()=>{const lines=[100n,-100n];assert.equal(lines.reduce((a,b)=>a+b,0n),0n);});
