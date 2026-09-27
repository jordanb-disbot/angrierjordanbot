import fs from 'node:fs';
import sharp from 'sharp';
import {reviewMembers,reviewPlans} from './event-review-fixtures.mjs';
import {raceSnapshot} from '../dist/packages/features-events/src/domain.js';
import {renderRace} from '../dist/packages/features-events/src/render.js';
import {rasterizeSvg} from '../dist/packages/renderer/src/raster.js';
const out='review-race-wheelchairs';fs.mkdirSync(out,{recursive:true});
const plan=reviewPlans.race,base={id:'wheelchair-review',state:'OPEN',racers:reviewMembers,pool:'2400',extensionUsed:false};
const states={entry:base,live:{...base,state:'LOCKED',motion:raceSnapshot(plan,plan.durationMs*.58)},result:{...base,state:'CLOSED',motion:raceSnapshot(plan,plan.durationMs),winnerId:plan.winnerId,result:{pool:'2400',rake:'120',refunded:false}}};
for(const [name,view] of Object.entries(states)){
 const png=await rasterizeSvg(renderRace(view,'wide',{waitingMs:60000}));fs.writeFileSync(`${out}/${name}.png`,png);
 fs.writeFileSync(`${out}/${name}-mobile.png`,await sharp(png).resize({width:390}).png().toBuffer());
}
fs.writeFileSync(`${out}/index.html`,`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Wheelchair race review</title><style>body{background:#06131d;color:#f5eedf;font:16px system-ui;max-width:1200px;margin:32px auto;padding:0 20px}img{max-width:100%;height:auto}section{margin:32px 0}.mobile{width:390px}</style><h1>!race · Wheelchair assortment</h1><p>Actual deterministic runtime renderer with fictional participants. New artwork pending owner approval. No live Discord session or production changes.</p>${Object.keys(states).map(name=>`<section><h2>${name}</h2><img src="${name}.png" alt="${name} race state"><h3>Mobile attachment</h3><img class="mobile" src="${name}-mobile.png" alt="${name} at mobile width"></section>`).join('')}</html>`);
console.log('PASS: wheelchair entry, live and winner runtime previews generated.');
