import {cpSync,mkdirSync} from 'node:fs';
for(const dir of ['generated','packages/content','content/fight','packages/features-special/content','packages/features-special/assets','packages/testing/fixtures','packages/renderer/fonts','production/atomic_assets/race_fight','production/event_art','production/theme']){
  mkdirSync(new URL(`../dist/${dir}/`,import.meta.url),{recursive:true});
  cpSync(new URL(`../${dir}/`,import.meta.url),new URL(`../dist/${dir}/`,import.meta.url),{recursive:true});
}

cpSync('packages/features-party/content','dist/packages/features-party/content',{recursive:true});
