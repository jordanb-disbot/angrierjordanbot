import {cpSync,mkdirSync} from 'node:fs';
for(const dir of ['generated','packages/content/economy','packages/testing/fixtures']){
  mkdirSync(new URL(`../dist/${dir}/`,import.meta.url),{recursive:true});
  cpSync(new URL(`../${dir}/`,import.meta.url),new URL(`../dist/${dir}/`,import.meta.url),{recursive:true});
}
