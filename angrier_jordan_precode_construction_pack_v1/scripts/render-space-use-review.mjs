import {mkdir,readFile,writeFile} from 'node:fs/promises';
import sharp from 'sharp';
import {rasterizeSvg} from '../dist/packages/renderer/src/raster.js';
import {renderCasinoResult} from '../dist/packages/features-casino/src/render.js';
import {renderPremiumProfile} from '../dist/packages/features-profiles/src/premium-render.js';

const out='review-space-use-2026-09-28';
await mkdir(out,{recursive:true});
const avatarData='data:image/png;base64,'+(await readFile('review-profiles/fixture-profile.png')).toString('base64');
const base={memberName:'Morgan',avatarData,wager:'100',amount:'200',amountLabel:'Returned',net:'+100',details:[]};
const symbols=[{id:'folding_chair',name:'Folding Chair',multiplier:4},{id:'barstool',name:'Barstool',multiplier:8},{id:'recliner',name:'Recliner',multiplier:20},{id:'chaise_lounge',name:'Chaise Lounge',multiplier:100},{id:'throne',name:'Throne',multiplier:0,jackpot:true}];
const cards={
 blackjack:renderCasinoResult({...base,title:'Blackjack · Your Turn',subtitle:'Round in progress',amount:'300',amountLabel:'Active Hand',net:undefined,wager:'300',visual:{kind:'blackjack',dealer:[0,12],hands:[{cards:[5,10],stake:'100',status:'stood'},{cards:[7,9],stake:'200',status:'playing'}],active:1,closed:false}}),
 slots:renderCasinoResult({...base,title:'Slots Result',subtitle:'Settled · Win',amount:'2,000',net:'+1,900',visual:{kind:'slots',symbols:['recliner','recliner','recliner'],table:symbols}}),
 roulette:renderCasinoResult({...base,title:'Roulette Result',subtitle:'Settled · Win',amount:'3,600',net:'+3,500',visual:{kind:'roulette',number:17,color:'black',selection:'number:17'}}),
 dice:renderCasinoResult({...base,title:'Dice Result',subtitle:'Settled · Win',visual:{kind:'dice',player:6,house:3,selection:'high'}}),
 coinflip:renderCasinoResult({...base,title:'Coinflip Result',subtitle:'Settled · Loss',amount:'0',net:'-100',visual:{kind:'coinflip',landed:'heads',selection:'tails'}}),
 profile:renderPremiumProfile({name:'Morgan',avatarData,highlights:[{label:'TOTAL WEALTH',value:'33,420'},{label:'FMK DRAWS',value:'12'},{label:'MARRIAGES',value:'0'}],sections:[{label:'Activity',value:'Messages: 2,410\nWords: 18,420\nVoice: 61,400 seconds'},{label:'Games and community',value:'Fight: 8W / 3L\nRace: 2W / 4L\nFMK: 12 draws'},{label:'Economy and Family',value:'Ottomans: 33,420 total\nBank tier: Standard\nActive marriages: 0'},{label:'Honors and showcase',value:'Featured achievement: First Craft\nFeatured collectible: Folding Chair'}]})
};
for(const [name,svg] of Object.entries(cards)){
 const png=await rasterizeSvg(svg);
 await writeFile(`${out}/${name}.png`,png);
 await writeFile(`${out}/${name}-mobile.png`,await sharp(png).resize({width:390}).png().toBuffer());
}
const html='<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><title>Angrier Jordan · Space use review</title><style>body{background:#0B1220;color:#E6EAF0;font:18px Inter,sans-serif;max-width:1220px;margin:auto;padding:24px}h1,h2{font-family:"Space Grotesk",sans-serif}section{padding:20px;margin:30px 0;border:1px solid #F4C542;border-radius:16px}img{display:block;max-width:100%;margin:18px 0}.mobile{width:390px}</style><h1>Casino + Profile space-use review</h1><p>Local fixtures. FMK and production are unchanged.</p>'+Object.keys(cards).map(name=>`<section><h2>${name}</h2><img src="${name}.png"><details><summary>Mobile feed width</summary><img class="mobile" src="${name}-mobile.png"></details></section>`).join('');
await writeFile(`${out}/index.html`,html);
console.log(`Rendered ${Object.keys(cards).length} desktop/mobile fixtures in ${out}.`);
