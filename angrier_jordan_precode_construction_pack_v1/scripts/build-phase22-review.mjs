import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import {renderIntroduction} from '../dist/packages/features-introductions/src/render.js';
import {renderSocialResponse} from '../dist/packages/features-social/src/render.js';
import {brandedNotice} from '../dist/packages/features-events/src/gate-b-visual.js';
import {rasterizeSvg} from '../dist/packages/renderer/src/raster.js';
const out='review-phase-22';fs.mkdirSync(out,{recursive:true});
const scenarios=[
 ['introduction-preview',renderIntroduction('Example Member\n\nWhat brings you to Chairs?\nA place to play, chat and settle into a good community.','Example Member',undefined,true,0,1),'packages/features-introductions/src/render.ts'],
 ['introduction-long-name',renderIntroduction('A Very Long Fictional Member Name For Layout Review\n\nFavorite way to unwind?\nMusic, games and a quiet evening with friends.','A Very Long Fictional Member Name For Layout Review',undefined,true,0,1),'packages/features-introductions/src/render.ts'],
 ['social-reaction',renderSocialResponse('compliment','Example Member made the lounge a little better today.'),'packages/features-social/src/render.ts'],
 ['lore-content-pending',brandedNotice('The Story So Far','The approved chapters have not been published yet. No reading credit has been awarded.','ANGRIER JORDAN · LEARN & BELONG'),'packages/features-events/src/gate-b-visual.ts'],
 ['tutorial-home',brandedNotice('Show Me Around','Choose a learning path. Lessons are private; practice never spends Ottomans or changes protected server state.','ANGRIER JORDAN · LEARN & BELONG'),'packages/features-events/src/gate-b-visual.ts']
];
const manifest={fixture:true,liveDiscordCapture:false,status:'ENGINEERING_FIXTURES_NOT_OWNER_APPROVED',items:[]};
for(const [id,svg,renderer] of scenarios){const png=await rasterizeSvg(svg);const files=[];for(const [size,width] of [['desktop',440],['mobile',360]]){const data=await sharp(png).resize({width}).png().toBuffer();const file=out+'/'+id+'-'+size+'.png';fs.writeFileSync(file,data);const meta=await sharp(data).metadata();assert.equal(meta.width,width);files.push({file,width,height:meta.height,sha256:crypto.createHash('sha256').update(data).digest('hex')});}manifest.items.push({id,renderer,files});}
fs.writeFileSync(out+'/manifest.json',JSON.stringify(manifest,null,2)+'\n');
fs.writeFileSync(out+'/index.html','<!doctype html><meta charset="utf-8"><title>Phase 22 engineering fixtures</title><style>body{background:#0b1220;color:#e6eaf0;font:16px sans-serif;text-align:center}img{max-width:100%;vertical-align:top;margin:12px}section{margin:32px}</style><h1>Phase 22 engineering fixtures</h1><p>Deterministic fictional fixtures. Not live Discord screenshots. Native interactive controls are not pictured. Owner approval is not implied.</p>'+manifest.items.map(i=>'<section><h2>'+i.id+'</h2>'+i.files.map(f=>'<img alt="'+i.id+' '+f.width+'px fixture" src="'+f.file.split('/').pop()+'">').join('')+'</section>').join(''));
console.log('Rendered '+manifest.items.length+' Phase 22 scenarios in desktop/mobile sizes.');
