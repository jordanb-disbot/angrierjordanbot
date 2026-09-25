import test from 'node:test';
import assert from 'node:assert/strict';
import {startRuntimeHealth} from '../../dist/apps/bot/src/runtime-health.js';
import {rasterizeSequence} from '../../dist/packages/renderer/src/raster.js';
import sharp from 'sharp';

test('health distinguishes liveness, initialization, dependency failure and shutdown without leaking errors',async()=>{
  let ready=false,fail=false;
  const server=await startRuntimeHealth(0,()=>ready,async()=>{if(fail)throw new Error('postgresql://secret:credential@private');},'127.0.0.1');
  const url='http://127.0.0.1:'+server.address().port;
  try{
    assert.equal((await fetch(url+'/livez')).status,200);assert.equal((await fetch(url+'/readyz')).status,503);
    ready=true;assert.equal((await fetch(url+'/readyz')).status,200);fail=true;
    const failed=await fetch(url+'/readyz');assert.equal(failed.status,503);assert.doesNotMatch(await failed.text(),/postgres|secret|credential/);
    fail=false;ready=false;assert.equal((await fetch(url+'/readyz')).status,503);assert.equal((await fetch(url+'/unknown')).status,404);
  }finally{server.closeAllConnections();await new Promise(r=>server.close(r));}
});
test('one-shot animation preserves explicit timing and does not loop',async()=>{
  const frame=n=>`<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="#0B1220"/><text x="25" y="70" font-size="60" fill="white">${n}</text></svg>`;
  const bytes=await rasterizeSequence([frame(5),frame(4),frame(3),frame(2),frame(1)],[1000,1000,1000,1000,1000]);const m=await sharp(bytes,{animated:true}).metadata();
  assert.equal(m.pages,5);assert.equal(m.loop,1);assert.deepEqual(m.delay,[1000,1000,1000,1000,1000]);
  assert.throws(()=>rasterizeSequence([frame(5),frame(4)],[1000]));
});
