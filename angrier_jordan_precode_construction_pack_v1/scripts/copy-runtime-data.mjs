import {cpSync,mkdirSync} from 'node:fs';
for(const dir of ['generated','packages/content','content/fight','packages/testing/fixtures','packages/renderer/fonts','production/atomic_assets/race_fight','production/event_art']){
  mkdirSync(new URL(`../dist/${dir}/`,import.meta.url),{recursive:true});
  cpSync(new URL(`../${dir}/`,import.meta.url),new URL(`../dist/${dir}/`,import.meta.url),{recursive:true});
}
