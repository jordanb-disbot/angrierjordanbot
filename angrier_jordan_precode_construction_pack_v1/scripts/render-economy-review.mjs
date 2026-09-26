import {mkdir,writeFile} from 'node:fs/promises';
import {renderEconomyPresentation} from '../dist/packages/features-economy/src/presentation.js';
import {rasterizeSvg} from '../dist/packages/renderer/src/raster.js';
import sharp from 'sharp';
const examples={
 daily:{title:'The Daily Lounge',description:'Three daily rituals. One place to claim them.',footer:'Next reset: 04:00 · Check the live timestamp below',sections:[{name:'Claim Daily',value:'250 Ottomans · Streak 8',state:'AVAILABLE NOW'},{name:'Daily Spin',value:'A daily chance at money or items',state:'USED THIS CYCLE'},{name:'Fortune',value:'Your next fortune awaits',state:'AVAILABLE NOW'}]},
 bank:{title:'Ottoman Bank',description:'Your balance, protected in the lounge.',fields:[{name:'Wallet',value:'12,500 Ottomans'},{name:'Bank · Tier 2',value:'25,000 / 25,000 Ottomans'},{name:'Next Upgrade',value:'10,000 Ottomans · Current tier must be full'}]},
 inventory:{title:'Your Inventory',description:'Inspect, equip or protect your collection.',fields:[{name:'Basic Fishing Rod',value:'Equipped · Durability 80 / 100'},{name:'Crafted Chair',value:'Emerald quality · Locked'},{name:'Workshop Materials',value:'Oak ×12 · Brass ×4'},{name:'Recipe Collection',value:'3 learned recipes'},{name:'Treasure Box',value:'1 unopened'},{name:'Junk',value:'Review sale preview before confirming'}]},
 result:{title:'Daily claimed',description:'Your daily reward is ready: 250 Ottomans. Current streak: 8 days. Your next reward is available after the daily reset.',accent:0x10b981},
 extreme:{title:'Statement · Extremely long member display name',description:'Exact identifiers and values remain available in native Discord text.',fields:[{name:'Wallet',value:'999,999,999,999,999,999,999 Ottomans'},{name:'Bank',value:'999,999,999,999,999,999,999 Ottomans'},{name:'Recent transaction',value:'A very long transaction description '.repeat(12)}]}
};
await mkdir('review-economy',{recursive:true});
for(const[name,input]of Object.entries(examples)){const image=await rasterizeSvg(renderEconomyPresentation(input));await writeFile('review-economy/'+name+'.png',image);await writeFile('review-economy/'+name+'-mobile.png',await sharp(image).resize({width:360}).png().toBuffer());}
await writeFile('review-economy/index.html','<!doctype html><meta charset="utf-8"><title>Economy fixtures</title><style>body{background:#0b1220;color:#e6eaf0;font:18px sans-serif;max-width:1150px;margin:auto}img{width:100%;height:auto}.mobile{width:360px;max-width:100%}</style><h1>Economy / Items — deterministic fixture renders</h1><p>Illustrative fixture data, not live Discord screenshots or reward-policy definitions. Each image is shown at desktop and 360px mobile widths.</p>'+Object.keys(examples).map(name=>`<h2>${name}</h2><img src="${name}.png" alt="${name} desktop fixture"><img class="mobile" src="${name}.png" alt="${name} mobile fixture">`).join(''));
console.log('Rendered 10 Economy desktop/mobile fixture images and gallery.');
