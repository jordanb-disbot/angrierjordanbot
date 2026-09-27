import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import {rasterizeSvg,rasterizeSequence} from '../../dist/packages/renderer/src/raster.js';

const card='<svg xmlns="http://www.w3.org/2000/svg" width="240" height="100"><rect width="240" height="100" fill="#101827"/><text x="12" y="60" font-family="Inter" fill="#f1f5f9">Join the race</text></svg>';

test('a static entry card finishes ahead of an already queued dense animation',async()=>{
 // Warm both native font/raster workers so process startup does not dominate
 // scheduling. Assert completion order rather than a machine-dependent SLA.
 await Promise.all([rasterizeSvg(card),rasterizeSequence([card,card],[50,50])]);
 const shapes=Array.from({length:80},(_,i)=>`<circle cx="${(i*37)%480}" cy="${(i*19)%300}" r="17" fill="hsl(${i*11},60%,40%)"/>`).join('');
 const frames=Array.from({length:240},(_,i)=>`<svg xmlns="http://www.w3.org/2000/svg" width="480" height="300"><rect width="480" height="300" fill="#101827"/>${shapes}<rect x="${i}" y="20" width="30" height="30" fill="#14b8a6"/></svg>`);
 const order=[];
 const animation=rasterizeSequence(frames,frames.map(()=>50)).then(result=>{order.push('animation');return result;});
 const entry=rasterizeSvg(card).then(result=>{order.push('entry');return result;});
 const [gif,png]=await Promise.all([animation,entry]);
 assert.deepEqual(order,['entry','animation']);
 assert.equal((await sharp(png).metadata()).format,'png');
 const metadata=await sharp(gif,{animated:true}).metadata();
 assert.equal(metadata.format,'gif');
 assert.equal(metadata.pages,240);
 assert.deepEqual(metadata.delay,frames.map(()=>50));
});

test('animation errors leave the static lane and subsequent animations usable',async()=>{
 const outcomes=await Promise.allSettled([rasterizeSequence(['invalid svg','invalid svg'],[50,50]),rasterizeSvg(card)]);
 assert.equal(outcomes[0].status,'rejected');
 assert.equal(outcomes[1].status,'fulfilled');
 const [png,gif]=await Promise.all([rasterizeSvg(card),rasterizeSequence([card,card],[50,50])]);
 assert.equal((await sharp(png).metadata()).format,'png');
 assert.equal((await sharp(gif).metadata()).format,'gif');
});
