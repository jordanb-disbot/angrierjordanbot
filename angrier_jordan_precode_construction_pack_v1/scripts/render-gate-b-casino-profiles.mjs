import fs from 'node:fs';
import sharp from 'sharp';
import {renderCasinoResult} from '../dist/packages/features-casino/src/render.js';
import {renderSpotlight,renderRecords} from '../dist/packages/features-profiles/src/render.js';
import {rasterizeSvg} from '../dist/packages/renderer/src/raster.js';
const root='review-gate-b/casino-profiles';fs.mkdirSync(root,{recursive:true});
// Fixture identities and persisted-state examples only; all cards use production renderers.
const avatar='data:image/png;base64,'+(await sharp({create:{width:52,height:52,channels:4,background:'#197d70'}}).png().toBuffer()).toString('base64');
const winner=(name,total,tripleThreat=false)=>({name,avatarData:avatar,total,lifetimeWins:4,status:'Returning winner',tripleThreat});
const cards={
 'major-casino-win':renderCasinoResult({title:'Roulette Result',subtitle:'Settled round · Win',amount:'36000',amountLabel:'Returned',details:[{label:'Wager',value:'1000 Ottomans'},{label:'Result',value:'17'}]}),
 'lottery-winner':renderCasinoResult({title:'Weekly Lottery',subtitle:'Winning ticket · Draw settled',memberName:'Alex',amount:'24800',amountLabel:'Won',details:[{label:'Settlement',value:'The full ticket-funded pot. No rake.'}]}),
 'chair-pot':renderCasinoResult({title:'Chair Pot Jackpot',subtitle:'Jackpot · Settled',memberName:'Jordan',amount:'125000',amountLabel:'Won',details:[{label:'Settlement',value:'Chair Pot jackpot paid.'}]}),
 'weekly-spotlight':renderSpotlight({weekStart:'2026-09-14',weekEnd:'2026-09-21',activeMembers:42,messages:1804,words:15420,voiceSeconds:68400,categories:[{title:'The Loudest Chair',winners:[winner('Jordan','428',true),winner('Alex','428')]},{title:'The Wordsmith',winners:[winner('Jordan','4260',true)]},{title:'Voice of the Lounge',winners:[winner('Jordan','12600',true)]}]}),
 'major-record':renderRecords({scope:'All time',records:[{title:'Biggest Casino Win',memberName:'Jordan',amount:'125000',achievedAt:'Sep 25, 2026'}]})
};
for(const [name,svg] of Object.entries(cards)){const png=await rasterizeSvg(svg);for(const [size,width] of [['desktop',440],['mobile',360]])fs.writeFileSync(`${root}/${name}-${size}.png`,await sharp(png).resize({width}).png().toBuffer());}
fs.writeFileSync(root+'/README.md','# Casino and honors runtime presentation\n\nProduction renderer output from explicitly fictional saved-state fixtures. Desktop: 440px; mobile: 360px. No live Discord or financial execution. Actual runtime attachments use repository settlement/announcement state, frozen Spotlight awards and resolved record-holder names.\n');
console.log('Casino/profile Gate B PNGs generated.');
