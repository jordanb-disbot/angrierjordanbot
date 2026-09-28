import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import path from 'node:path';

async function sourceFiles(dir,extensions){
 const files=[];
 for(const entry of await readdir(dir,{withFileTypes:true})){
  const file=path.join(dir,entry.name);
  if(entry.isDirectory())files.push(...await sourceFiles(file,extensions));
  else if(extensions.some(ext=>entry.name.endsWith(ext)))files.push(file);
 }
 return files;
}

test('production-facing renderers and SVG templates use the approved font pair',async()=>{
 const files=[
  ...await sourceFiles('packages',['.ts','.tsx']),
  ...await sourceFiles('apps',['.ts','.tsx']),
  ...await sourceFiles('production/runtime_templates',['.svg']),
  ...await sourceFiles('production/atomic_assets/templates',['.svg'])
 ];
 const legacy=[];
 for(const file of files){
  const contents=await readFile(file,'utf8');
  if(/\b(?:Poppins|Cinzel)\b/.test(contents))legacy.push(file);
 }
 assert.deepEqual(legacy,[]);
 const brand=JSON.parse(await readFile('production/theme/brand.json','utf8'));
 assert.equal(brand.typography.heading,'Space Grotesk');
 assert.equal(brand.typography.body,'Inter');
});
