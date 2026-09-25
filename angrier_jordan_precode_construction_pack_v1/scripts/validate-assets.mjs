import fs from 'node:fs';
import crypto from 'node:crypto';
const manifestPath='reference/assets/final-production-visual-manifest.json';
const m=JSON.parse(fs.readFileSync(manifestPath,'utf8'));const assets=m.assets??[];
const ids=assets.map(a=>a.id);if(new Set(ids).size!==ids.length)throw new Error('Duplicate asset IDs');
const missing=[];const hashMismatch=[];
for(const asset of assets){
  if(!asset.file||!fs.existsSync(asset.file)){missing.push(asset.file??asset.id);continue;}
  if(asset.sha256){const hash=crypto.createHash('sha256').update(fs.readFileSync(asset.file)).digest('hex');if(hash!==asset.sha256)hashMismatch.push(asset.file);}
}
if(missing.length)throw new Error(`Missing production assets: ${missing.slice(0,10).join(', ')}${missing.length>10?'…':''}`);
if(hashMismatch.length)throw new Error(`Production asset hash mismatch: ${hashMismatch.slice(0,10).join(', ')}${hashMismatch.length>10?'…':''}`);
console.log(`Final production visual manifest valid: ${assets.length} assets/templates present with verified hashes.`);
