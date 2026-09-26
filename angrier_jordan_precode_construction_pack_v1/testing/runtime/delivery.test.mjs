import test from 'node:test';import assert from 'node:assert/strict';
import {DeliveryEngine} from '../../.test-build/packages/core/src/delivery.js';
import {PrismaJobDeliveryRepository} from '../../.test-build/packages/database/src/job-delivery.js';
const repository=()=>({state:'PENDING',messageId:undefined,async read(){return{state:this.state,messageId:this.messageId}},async claim(){if(this.state!=='PENDING')return false;this.state='SENDING';return true},async complete(id){this.state='SENT';this.messageId=id}});
test('delivery recovers a successful send after receipt persistence fails without resending',async()=>{const r=repository();let sends=0;const transport={find:async()=>sends?'discord-message':null,send:async()=>{sends++;throw new Error('connection interrupted after Discord accepted')}};await assert.rejects(()=>new DeliveryEngine(r).deliver('marker',transport));assert.equal(await new DeliveryEngine(r).deliver('marker',transport),'discord-message');assert.equal(sends,1);assert.equal(await new DeliveryEngine(r).deliver('marker',transport),'discord-message');assert.equal(sends,1)});
test('uncertain delivery without a matching message does not resend',async()=>{const r=repository();r.state='SENDING';let sends=0;await assert.rejects(()=>new DeliveryEngine(r).deliver('marker',{find:async()=>null,send:async()=>{sends++;return'id'}}),{code:'DELIVERY_UNCERTAIN'});assert.equal(sends,0)});
test('concurrent delivery claims send one message',async()=>{const r=repository();let sends=0;const transport={find:async()=>null,send:async()=>{sends++;return'id'}};await Promise.allSettled([new DeliveryEngine(r).deliver('marker',transport),new DeliveryEngine(r).deliver('marker',transport)]);assert.equal(sends,1)});

test('stale delivery completion cannot resurrect content removed by concurrent finalization',async()=>{
 let payload={deliveryState:'SENDING',snapshot:{text:'Pending content'},context:{userId:'member'}},attempts=0;
 const db={scheduledJob:{findUniqueOrThrow:async()=>({payload:structuredClone(payload)}),updateMany:async({where,data})=>{
  attempts++;
  // Another completion and its feature transaction win after this completion read.
  if(attempts===1)payload={deliveryState:'SENT',deliveryMessageId:'message',context:{userId:'member'},result:{id:42}};
  if(JSON.stringify(where.payload.equals)!==JSON.stringify(payload))return{count:0};payload=structuredClone(data.payload);return{count:1};
 }}};
 await new PrismaJobDeliveryRepository(db,'job').complete('message');
 assert.equal(attempts,1);assert.equal(payload.snapshot,undefined);assert.deepEqual(payload.result,{id:42});
 await assert.rejects(new PrismaJobDeliveryRepository(db,'job').complete('different-message'),{code:'DELIVERY_CONFLICT'});
 assert.equal(payload.deliveryMessageId,'message');
});
test('delivery completion retries a failed compare-and-swap while retaining newer feature metadata',async()=>{
 let payload={deliveryState:'SENDING',version:1},attempts=0;
 const db={scheduledJob:{findUniqueOrThrow:async()=>({payload:structuredClone(payload)}),updateMany:async({where,data})=>{attempts++;if(attempts===1)payload={...payload,version:2};if(JSON.stringify(where.payload.equals)!==JSON.stringify(payload))return{count:0};payload=structuredClone(data.payload);return{count:1};}}};
 await new PrismaJobDeliveryRepository(db,'job').complete('message');assert.equal(attempts,2);assert.equal(payload.version,2);assert.equal(payload.deliveryState,'SENT');
});
