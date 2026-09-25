// Review fixtures rendered by the actual runtime renderer; never runtime identities.
import {mkdirSync,writeFileSync} from 'node:fs';
import {renderLine,lineSequence} from '../../../dist/packages/features-special/src/render.js';
import {rasterizeSvg,rasterizeSequence} from '../../../dist/packages/renderer/src/raster.js';
import sharp from 'sharp';
const dir=new URL('./',import.meta.url);mkdirSync(dir,{recursive:true});
const view={id:'review',guildId:'g',channelId:'main',messageId:'m',ownerId:'host',state:'OPEN',expiresAt:new Date('2026-09-25T12:01:00Z'),extensionUsed:false,members:[{userId:'host',name:'Morgan',status:'ready'},{userId:'one',name:'Avery',status:'ready'},{userId:'two',name:'Casey',status:'waiting'}],remainingMs:42000,elapsedMs:0,shame:{id:'LINE-SHAME-001',text:'Wonderful. Casey needed more time. We are starting anyway.'}};
for(const state of ['OPEN','LOCKED','CLOSED','CANCELLED'])writeFileSync(new URL(state.toLowerCase()+'.png',dir),await rasterizeSvg(renderLine({...view,state})));
const sequence=lineSequence({...view,state:'SETTLING'}),gif=await rasterizeSequence(sequence.frames,sequence.delays);writeFileSync(new URL('countdown.gif',dir),gif);
writeFileSync(new URL('countdown.png',dir),await rasterizeSvg(renderLine({...view,state:'SETTLING'},0)));
writeFileSync(new URL('burst.png',dir),await rasterizeSvg(renderLine({...view,state:'SETTLING'},5400)));
const meta=await sharp(gif,{animated:true}).metadata();
if(meta.pages!==37||meta.loop!==1||meta.delay.reduce((a,b)=>a+b,0)!==6800)throw Error('Line animation contract failed.');
console.log(JSON.stringify({pages:meta.pages,loop:meta.loop,durationMs:6800,bytes:gif.length}));
