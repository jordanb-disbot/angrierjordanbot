import {mkdir,writeFile} from 'node:fs/promises';
import sharp from 'sharp';
import {rasterizeSvg} from '../dist/packages/renderer/src/raster.js';
import {renderPremiumProfile,renderPremiumLeaderboard,renderPremiumRecords,renderPremiumShowcase} from '../dist/packages/features-profiles/src/premium-render.js';
const sections=[{label:'Activity',value:'THIS MONTH / ALL TIME\nMessages: 482 / 2,410\nWords: 3,680 / 18,420\nVoice seconds: 7,240 / 61,400\nMost-used word: chairs\nMost-used command: play'},{label:'Games and community',value:'FMK: Fucked 4 · Married 8 · Killed 2\nRounds played: 12\nAudience agreement: 74% average\nFight 8W / 3L · Race 2W / 4L'},{label:'Economy and Family',value:'Work: 24 jobs · 4,820 Ottomans earned\nGifts sent / received: 3 / 5\nChair Building: Apprentice\nActive marriages: 0'},{label:'Honors and showcase',value:'No Weekly Spotlight title yet\nFeatured achievements: First Craft\nFeatured collectibles: Folding Chair'}];
const entries={
 profile:renderPremiumProfile({name:'Jordan',sections}),
 hidden:renderPremiumProfile({name:'Jordan',sections:sections.map((x,n)=>n?x:{label:'Activity · Private',value:'Activity statistics are private.'})}),
 leaderboard:renderPremiumLeaderboard({category:'wealth',page:0,pages:2,rows:['Jordan','Alex','Morgan','Riley','Sam','Taylor'].map((name,n)=>({rank:n+1,name,value:String(250000-n*27341)}))}),
 leaderboardEmpty:renderPremiumLeaderboard({category:'voice',page:0,pages:1,rows:[]}),
 records:renderPremiumRecords({scope:'This month · Mountain Time',page:0,pages:1,records:[{title:'Biggest Casino Win',memberName:'Jordan',amount:'125000',achievedAt:'Sep 26, 2026'},{title:'Fastest Race',memberName:'Alex',amount:'12.48',achievedAt:'Sep 25, 2026'}]}),
 recordsEmpty:renderPremiumRecords({scope:'All time',page:0,pages:1,records:[]}),
 showcaseEmpty:renderPremiumShowcase({page:0,pages:1,badges:[],items:[]}),
 showcase:renderPremiumShowcase({page:0,pages:1,badges:[{name:'First Craft',selected:true},{name:'Triple Threat',selected:false}],items:[{name:'Folding Chair',selected:true},{name:'Emerald Throne',selected:false}]}),
 extremes:renderPremiumLeaderboard({category:'wealth',page:0,pages:1,rows:[{rank:1,name:'W'.repeat(40),value:'9223372036854775807'},{rank:2,name:'A very long member name with many words',value:'9223372036854775806'}]})
};
await mkdir('review-profiles',{recursive:true});
for(const[name,svg]of Object.entries(entries)){const png=await rasterizeSvg(svg);await writeFile('review-profiles/'+name+'.png',png);await writeFile('review-profiles/'+name+'-mobile.png',await sharp(png).resize({width:360}).png().toBuffer());}
await writeFile('review-profiles/index.html','<!doctype html><meta charset="utf-8"><title>Profiles review</title><style>body{background:#08131f;color:#eef4f3;font:18px sans-serif;max-width:1200px;margin:auto}img{max-width:100%}.mobile{width:360px}</style><h1>Profiles — deterministic fixture review</h1><p>Illustrative fixture data, not live Discord screenshots. Poppins body/data; Cinzel headings. Awaiting owner visual approval.</p>'+Object.keys(entries).map(name=>`<h2>${name}</h2><img src="${name}.png" alt="${name} fixture"><img class="mobile" src="${name}-mobile.png" alt="${name} at mobile width">`).join(''));
console.log('Rendered 18 Profiles review fixtures.');
