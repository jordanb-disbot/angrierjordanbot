import {mkdir,readFile,writeFile} from 'node:fs/promises';
import sharp from 'sharp';
import {renderPremiumProfilePages} from '../dist/packages/features-profiles/src/premium-render.js';
import {rasterizeSvg} from '../dist/packages/renderer/src/raster.js';

const out='review-profile-tiles-2026-09-28';
await mkdir(out,{recursive:true});
const avatarData='data:image/png;base64,'+(await readFile('review-profiles/fixture-profile.png')).toString('base64');
const view={name:'Morgan',avatarData,highlights:[{label:'OTTOMANS · CURRENT',value:'33,420'},{label:'FMK DRAWS · ALL-TIME',value:'12'},{label:'FAMILY · ACTIVE',value:'0'}],sections:[
 {label:'Words and voice · today / week / month',singlePage:true,value:'Words · today: 132\nVoice seconds · today: 540\nWords · this week: 920\nVoice seconds · this week: 1,800\nWords · this month: 3,680\nVoice seconds · this month: 7,240'},
 {label:'Messages and all-time totals',singlePage:true,value:'Messages · today: 24\nMessages · this week: 128\nMessages · this month: 482\nMessages · all-time: 2,410\nWords · all-time: 18,420\nVoice seconds · all-time: 61,400'},
 {label:'Top words · all-time',singlePage:true,value:'Top word 1: chairs · 128\nTop word 2: jordan · 94\nTop word 3: game · 78\nMost-used command: play'},
 {label:'Games and community',value:'FMK Fucked: 4\nFMK Married: 8\nFMK Killed: 2\nFMK rounds: 12\nAgreement average: 74%\nFight: 8W / 3L\nRace: 2W / 4L'},
 {label:'Economy and Family',value:'Ottomans: 33,420\nBank tier: Standard\nWork jobs: 24\nWork earned: 4,820 Ottomans\nGifts sent: 3\nGifts received: 5\nChair Building: Apprentice\nActive marriages: 0'},
 {label:'Honors and showcase',value:'Spotlight: Triple Threat · permanent\nFeatured achievement: First Craft\nFeatured collectible: Folding Chair'}
]};
const scenarios={normal:view,private:{...view,sections:[{label:'Activity · Private',singlePage:true,value:'Activity statistics are private.'},...view.sections.slice(3)]},long:{...view,name:'A Very Long Member Display Name',sections:view.sections.map((s,n)=>n===5?{...s,value:'Spotlight: Triple Threat · permanent\nFeatured achievement: A Very Long Achievement Name With Meaningful Detail\nFeatured collectible: A Limited Edition Upholstered Recliner From The Lounge'}:s)}};
const items=[];
for(const [name,data] of Object.entries(scenarios)){
 const pages=renderPremiumProfilePages(data);
 for(const [index,svg] of pages.entries()){
  const frame={data:await rasterizeSvg(svg),width:1200,height:Number(/<svg[^>]*height="([\d.]+)"/.exec(svg)?.[1]??0)};
  const desktop=`${name}-${index+1}.png`,mobile=`${name}-${index+1}-mobile.png`;
  await writeFile(`${out}/${desktop}`,frame.data);
  await writeFile(`${out}/${mobile}`,await sharp(frame.data).resize({width:390}).png().toBuffer());
  items.push({name,index:index+1,desktop,mobile,width:frame.width,height:frame.height});
 }
}
const html='<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><title>Profile tile review</title><style>body{background:#0B1220;color:#E6EAF0;font:18px Inter,sans-serif;max-width:1240px;margin:auto;padding:24px}h1,h2{font-family:"Space Grotesk",sans-serif}section{border:1px solid #F4C542;border-radius:14px;padding:16px;margin:28px 0}img{display:block;max-width:100%;margin:16px 0}.mobile{width:390px}</style><h1>Profile tile readability review</h1><p>Local fixtures. Each full-width image keeps complete tiles together. Production is unchanged.</p>'+items.map(item=>`<section><h2>${item.name} · frame ${item.index}</h2><img src="${item.desktop}"><details><summary>Mobile width</summary><img class="mobile" src="${item.mobile}"></details></section>`).join('');
await writeFile(`${out}/index.html`,html);
await writeFile(`${out}/manifest.json`,JSON.stringify({fixture:true,items},null,2)+'\n');
console.log(`Rendered ${items.length} full-width profile frames in ${out}.`);
