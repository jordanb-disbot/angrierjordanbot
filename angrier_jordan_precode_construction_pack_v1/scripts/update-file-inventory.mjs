import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
const root=new URL('../',import.meta.url);
const skip=new Set(['node_modules','.next','dist','.test-build','.git','coverage']);
const items=[];
function visit(dir=''){
 for(const e of fs.readdirSync(new URL(dir,root),{withFileTypes:true})){
  if(skip.has(e.name)||e.name==='FILE_INVENTORY.json'||e.name.endsWith('.tsbuildinfo')||e.name.endsWith('.log')||(e.name.startsWith('.env')&&e.name!=='.env.example'))continue;
  const p=path.posix.join(dir,e.name);
  if(e.isDirectory())visit(p+'/');
  else if(e.isFile()){const bytes=fs.readFileSync(new URL(p,root));items.push({path:p,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});}
 }
}
visit();items.sort((a,b)=>a.path.localeCompare(b.path));
fs.writeFileSync(new URL('FILE_INVENTORY.json',root),JSON.stringify({checkpoint:8,updated_at:'2026-09-25',files:items.length,inventory_self_hash_omitted:true,items},null,2)+'\n');
console.log(`Manifest refreshed: ${items.length} source/assets files.`);
