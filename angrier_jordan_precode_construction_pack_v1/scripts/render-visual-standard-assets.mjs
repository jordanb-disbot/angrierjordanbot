import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {readdir} from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import {rasterizeSvg} from '../dist/packages/renderer/src/raster.js';
import {renderCasinoResult} from '../dist/packages/features-casino/src/render.js';
import {renderCommunity,superlativeReviewFixture} from '../dist/packages/features-community/src/render.js';
import {learningWindow} from '../dist/packages/features-learning/src/visual.js';

const roots=['production/runtime_templates','production/atomic_assets/templates'];
const output='review-visual-standard-2026-09-28';
const files=[];
async function collect(dir){
 for(const entry of await readdir(dir,{withFileTypes:true})){
  const file=path.join(dir,entry.name);
  if(entry.isDirectory())await collect(file);
  else if(entry.name.endsWith('.svg'))files.push(file);
 }
}
for(const root of roots)await collect(root);
await mkdir(output,{recursive:true});
const cards=[];
const sourceSamples=[
 ['casino-live-result',renderCasinoResult({title:'Blackjack Result',subtitle:'Settled · Win',memberName:'Morgan',amount:'2,000',amountLabel:'Returned',details:[{label:'Wager',value:'1,000 Ottomans'},{label:'Outcome',value:'Blackjack pays 2,000 Ottomans.'}]})],
 ['community-superlative',renderCommunity(superlativeReviewFixture())],
 ['learning-help',learningWindow('Help','Choose a feature to learn the rules, controls, and what happens next.')]
];
for(const [name,svg] of sourceSamples){
 const png=await rasterizeSvg(svg);
 const desktop=`${name}-desktop.png`,mobile=`${name}-mobile.png`;
 await writeFile(path.join(output,desktop),png);
 await writeFile(path.join(output,mobile),await sharp(png).resize({width:390}).png().toBuffer());
 cards.push({name,file:'runtime renderer',desktop,mobile});
}
for(const file of files){
 const group=file.includes('runtime_templates')?'runtime':'atomic';
 const root=group==='runtime'?roots[0]:roots[1];
 const name=group+'-'+path.relative(root,file).replaceAll('\\','/').replaceAll('/','-').replace(/\.svg$/,'');
 const svg=await readFile(file,'utf8');
 const png=await rasterizeSvg(svg);
 const desktop=`${name}-desktop.png`,mobile=`${name}-mobile.png`;
 await writeFile(path.join(output,desktop),png);
 await writeFile(path.join(output,mobile),await sharp(png).resize({width:390}).png().toBuffer());
 cards.push({name,file:file.replaceAll('\\','/'),desktop,mobile});
}
const escape=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const html=`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Angrier Jordan · Runtime asset review</title><style>body{background:#0B1220;color:#E6EAF0;font:16px Inter,Arial,sans-serif;max-width:1250px;margin:0 auto;padding:24px}h1,h2{font-family:'Space Grotesk',Arial,sans-serif}section{border:1px solid #374151;border-radius:16px;padding:20px;margin:30px 0;background:#051822}img{display:block;max-width:100%;height:auto;margin:18px 0}.mobile{width:390px}small{color:#B4C8CA}</style></head><body><h1>Runtime visual standard review</h1><p>Local fixtures. Existing approved references and production remain unchanged.</p>${cards.map(c=>`<section><h2>${escape(c.name)}</h2><small>${escape(c.file)}</small><img src="${escape(c.desktop)}" alt="Desktop ${escape(c.name)}"><details><summary>Mobile feed width</summary><img class="mobile" src="${escape(c.mobile)}" alt="Mobile ${escape(c.name)}"></details></section>`).join('')}</body></html>`;
await writeFile(path.join(output,'index.html'),html);
await writeFile(path.join(output,'manifest.json'),JSON.stringify({source:'runtime renderers and templates',count:cards.length,cards},null,2)+'\n');
console.log(`Rendered ${cards.length} runtime assets at desktop and mobile widths in ${output}.`);
