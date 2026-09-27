import fs from 'node:fs';
import sharp from 'sharp';
import {createHash} from 'node:crypto';
const folder='production/event_art/v6';
const manifestFile='reference/assets/final-production-visual-manifest.json';
const manifest=JSON.parse(fs.readFileSync(manifestFile,'utf8'));
for(let n=1;n<=6;n++){
 const source=`${folder}/wheelchair-${n}.png`,file=`${folder}/wheelchair-${n}-runtime.png`;
 const meta=await sharp(source).metadata();
 if(!meta.hasAlpha)throw new Error(`Wheelchair ${n} must preserve generated transparency`);
 await sharp(source).resize({width:440,height:440,fit:'contain',background:{r:0,g:0,b:0,alpha:0}}).png().toFile(file);
 for(const [path,kind] of [[source,'source'],[file,'runtime']]){
  const entry={id:`race.wheelchair.${n}.${kind}`,file:path,category:'runtime.art',canonical:true,status:'OWNER_REVIEW_PENDING',usage:`Wheelchair racer ${n}; packaged deterministic artwork, no runtime AI`,sha256:createHash('sha256').update(fs.readFileSync(path)).digest('hex')};
  const index=manifest.assets.findIndex(a=>a.id===entry.id);if(index<0)manifest.assets.push(entry);else manifest.assets[index]=entry;
 }
}
// Refresh only this revision's renderers and avatar adapter, preserving unrelated entries.
for(const [id,file] of [['race.wheelchairs.wide.renderer','packages/features-events/src/wide-render.ts'],['events.shared.visual','packages/features-events/src/visual.ts']])if(!manifest.assets.some(a=>a.file===file))manifest.assets.push({id,file,category:'runtime.renderer',canonical:true,usage:'Shared deterministic event presentation with wheelchair race skins'});
for(const entry of manifest.assets)if(['packages/features-chairisms/src/render.ts','packages/features-chairisms/src/presentation.ts','packages/features-events/src/visual.ts','packages/features-events/src/wide-render.ts','apps/bot/src/discord/chairisms-security.ts'].includes(entry.file)){
 entry.sha256=createHash('sha256').update(fs.readFileSync(entry.file)).digest('hex');entry.status='OWNER_REVIEW_PENDING';
}
fs.writeFileSync(manifestFile,JSON.stringify(manifest,null,2)+'\n');
console.log('PASS: six wheelchair sprites packaged and manifest hashes updated.');
