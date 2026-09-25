import fs from 'node:fs';
const p=JSON.parse(fs.readFileSync('packages/content/golden/wyr_sample.json','utf8'));if(p.length<6)throw new Error('Golden WYR fixture too small');
const cats=new Set(p.map(x=>x.category));for(const c of ['Casual','Friends','Dating','Married','Spicy','Unhinged'])if(!cats.has(c))throw new Error(`Missing ${c}`);
console.log('Golden WYR fixtures valid.');
