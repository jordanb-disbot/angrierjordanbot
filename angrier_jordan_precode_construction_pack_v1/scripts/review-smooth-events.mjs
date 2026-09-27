import fs from 'node:fs';
import sharp from 'sharp';
import {performance} from 'node:perf_hooks';
import {reviewMembers,reviewPlans} from './event-review-fixtures.mjs';
import {DiscordEventsCoordinator} from '../dist/apps/bot/src/discord/events-coordinator.js';
import {lineSequence} from '../dist/packages/features-special/src/render.js';
import {rasterizeSequence} from '../dist/packages/renderer/src/raster.js';
const folder='review-smooth-events';fs.mkdirSync(folder,{recursive:true});
const report=[];
let start=performance.now();
const payload=await new DiscordEventsCoordinator({}, {},async()=>true).payload({id:'review',state:'LOCKED',racers:reviewMembers,pool:'2400',extensionUsed:false},{timeline:{racers:reviewMembers,plan:reviewPlans.race,startedAt:new Date(Date.now()+600000).toISOString()}});
const race=payload.files[0].attachment;await save('race',race,start);
start=performance.now();const sequence=lineSequence({state:'SETTLING',elapsedMs:0,durationMs:9000,ownerId:reviewMembers[0].userId,members:reviewMembers.map(r=>({...r,status:'ready'})),remainingMs:0},'wide',true);
await save('line',await rasterizeSequence(sequence.frames,sequence.delays,sequence.assets),start);
async function save(name,bytes,start){const meta=await sharp(bytes,{animated:true}).metadata();fs.writeFileSync(`${folder}/${name}.gif`,bytes);report.push({name,renderMs:Math.round(performance.now()-start),bytes:bytes.length,pages:meta.pages,width:meta.width,height:meta.pageHeight,loop:meta.loop,durationMs:meta.delay.reduce((a,b)=>a+b,0),maxMotionDelay:Math.max(...meta.delay.slice(0,-1))});}
fs.writeFileSync(`${folder}/report.json`,JSON.stringify(report,null,2));
fs.writeFileSync(`${folder}/index.html`,'<!doctype html><html><meta charset="utf-8"><title>Smooth event review</title><style>body{background:#06131d;color:#eee;font:16px system-ui;max-width:700px;margin:40px auto}img{width:480px;max-width:100%}button{padding:10px}</style><h1>Race + Line motion review</h1><p>Runtime fixture animations. Wheelchairs pending visual approval. No production changes. Portrait/Chairisms excluded from this batch.</p><button onclick="document.querySelectorAll(\'img\').forEach(i=>i.src=i.dataset.src+\'?\'+Date.now())">Replay both</button><h2>!race</h2><img src="race.gif" data-src="race.gif"><h2>!line</h2><img src="line.gif" data-src="line.gif"></html>');
console.log(JSON.stringify(report));
