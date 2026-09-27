import {mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import {renderRace} from '../dist/packages/features-events/src/render.js';
import {raceSnapshot} from '../dist/packages/features-events/src/domain.js';
import {renderLine} from '../dist/packages/features-special/src/render.js';
import {rasterizeSvg} from '../dist/packages/renderer/src/raster.js';
import {reviewMembers,reviewPlans} from './event-review-fixtures.mjs';

const folder=new URL('../review-waiting-room-width/',import.meta.url);
await mkdir(folder,{recursive:true});
const raceBase={id:'width-review',state:'OPEN',ownerId:reviewMembers[0].userId,racers:reviewMembers,pool:'1200',expiresAt:new Date('2100-01-01T19:42:00Z'),extensionUsed:false};
const liveMotion=raceSnapshot(reviewPlans.race,reviewPlans.race.durationMs*.58);
const lineBase={id:'width-review',state:'OPEN',ownerId:reviewMembers[0].userId,members:reviewMembers.map((m,i)=>({...m,status:i<4?'ready':'waiting'})),elapsedMs:0,remainingMs:60000,expiresAt:new Date('2100-01-01T19:42:00Z'),extensionUsed:false,durationMs:9000};
const fixtures=[
 ['race-waiting',renderRace(raceBase,'wide')],
 ['race-live',renderRace({...raceBase,state:'LOCKED',motion:liveMotion},'wide')],
 ['race-finale',renderRace({...raceBase,state:'CLOSED',motion:liveMotion,winnerId:reviewPlans.race.winnerId,result:{pool:'1200',rake:'60',refunded:false}},'wide')],
 ['line-waiting',renderLine(lineBase,0,'wide')],
 ['line-extended',renderLine({...lineBase,extensionUsed:true,remainingMs:90000},0,'wide')],
 ['line-countdown',renderLine({...lineBase,state:'SETTLING',elapsedMs:2000},2000,'wide')],
 ['line-finale',renderLine({...lineBase,state:'CLOSED',elapsedMs:9000},9000,'wide')],
];
const records=[];
for(const [name,svg] of fixtures){
 const desktop=await rasterizeSvg(svg),mobile=await sharp(desktop).resize({width:390}).png().toBuffer();
 for(const [suffix,bytes,width] of [['desktop',desktop,1200],['mobile',mobile,390]]){
  const meta=await sharp(bytes).metadata();
  if(meta.width!==width)throw Error(`${name}-${suffix}: unexpected width ${meta.width}`);
  await writeFile(new URL(`${name}-${suffix}.png`,folder),bytes);
 }
 records.push({name,desktopSha256:createHash('sha256').update(desktop).digest('hex'),mobileSha256:createHash('sha256').update(mobile).digest('hex')});
}
await writeFile(new URL('manifest.json',folder),JSON.stringify({kind:'deterministic-production-renderer-fixture',fictionalMembers:true,liveDiscordCapture:false,widths:{desktop:1200,mobile:390},records},null,2)+'\n');
await writeFile(new URL('index.html',folder),`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Race + Line width review</title><style>*{box-sizing:border-box}body{margin:0;padding:24px;background:#0b1220;color:#e6eaf0;font:16px Inter,system-ui}main{max-width:1300px;margin:auto}h1,h2{font-family:'Space Grotesk',system-ui;color:#ffe29a}p{color:#b4c8ca;line-height:1.5}section{border-top:1px solid #476063;padding:28px 0}figure{margin:16px 0}figcaption{margin:0 0 10px;color:#c8a1ff}img{display:block;max-width:100%;height:auto;border-radius:12px}.desktop{width:1200px}.mobile{width:390px}</style><main><h1>Race + Line width review</h1><p>Actual 1200×640 production renderers with fictional members, shown at native desktop width and scaled to a 390px phone viewport. Discord client chrome, countdown text, and native buttons are not simulated. These are review fixtures, not live screenshots or approval changes.</p>${records.map(({name})=>`<section><h2>${name}</h2><figure><figcaption>1200px full-width attachment</figcaption><img class="desktop" src="${name}-desktop.png" alt="${name} desktop review"></figure><figure><figcaption>390px mobile-scale attachment</figcaption><img class="mobile" src="${name}-mobile.png" alt="${name} phone review"></figure></section>`).join('')}</main></html>`);
console.log(`PASS: ${fixtures.length} full-width and mobile waiting/live/finale fixture pairs`);
