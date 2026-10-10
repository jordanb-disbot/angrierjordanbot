import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import {AnimationAssets,unpackAnimationAssets} from '../../dist/packages/renderer/src/animation-assets.js';
import {rasterizeSequence,rasterizeTimeline} from '../../dist/packages/renderer/src/raster.js';
import {lineSequence} from '../../dist/packages/features-special/src/render.js';
test('animation artwork is losslessly shared across frames',()=>{
 const data='data:image/png;base64,YQ==',svg=`<image href="${data}"/><image href="${data}"/>`,art=new AnimationAssets();
 for(let n=0;n<400;n++)assert.equal(unpackAnimationAssets(art.pack(svg),art.assets),svg);
 assert.equal(art.assets.length,1);assert.throws(()=>unpackAnimationAssets('aj-animation-asset:1',art.assets));
});
test('Line runs at one-second countdown steps, then efficient powder frames, with exact restart remainder',()=>{
 const view={state:'SETTLING',elapsedMs:0,durationMs:9000,ownerId:'host',members:[],remainingMs:0},sequence=lineSequence(view,'wide',true);
 assert.equal(sequence.frames.length,22);assert.deepEqual(sequence.delays.slice(0,5),[1000,1000,1000,1000,1000]);assert.ok(sequence.delays.slice(5,-1).every(d=>d===250));assert.equal(sequence.delays.at(-1),1000);assert.equal(sequence.delays.reduce((a,b)=>a+b,0),10000);
 for(let n=0;n<5;n++)assert.match(sequence.frames[n],new RegExp(`data-countdown-number="${5-n}"`));
 assert.ok(sequence.frames.slice(5).every(svg=>!svg.includes('data-countdown-number=')));
 const resumed=lineSequence({...view,elapsedMs:2430},'wide',true);assert.equal(resumed.delays[0],570);assert.equal(resumed.delays.reduce((a,b)=>a+b,0),7570);
});
test('dense one-shot encoding preserves 20fps timing and final hold without replay',async()=>{
 const frames=Array.from({length:81},(_,n)=>`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="640" viewBox="0 0 1200 640"><rect width="1200" height="640" fill="#081923"/><circle cx="${60+n*12}" cy="320" r="30" fill="#FFD070"/></svg>`),delays=frames.map((_,n)=>n===80?1000:50);
 const bytes=await rasterizeSequence(frames,delays),meta=await sharp(bytes,{animated:true}).metadata();assert.equal(meta.width,480);assert.equal(meta.loop,1);assert.equal(meta.pages,81);assert.equal(meta.delay.reduce((a,b)=>a+b,0),5000);assert.ok(meta.delay.slice(0,-1).every(d=>d===50));
 const resumed=await rasterizeTimeline(frames,delays,Date.now()-10000);assert.equal((await sharp(resumed,{animated:true}).metadata()).pages??1,1);
 const longest=await rasterizeSequence(Array(401).fill(frames[0]),[...Array(400).fill(50),1000]);
 assert.equal((await sharp(longest,{animated:true}).metadata()).delay.reduce((a,b)=>a+b,0),21000,'20-second race plus terminal hold fits the pixel budget');
});
