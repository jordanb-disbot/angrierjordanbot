import fs from 'node:fs';
const [,,file]=process.argv;if(!file)throw new Error('Usage: node scripts/import-content.mjs <json-file>');
const d=JSON.parse(fs.readFileSync(file,'utf8'));const arr=Array.isArray(d)?d:(d.entries??[]);for(const x of arr)if(!x.id)throw new Error('Every content row needs id');
console.log(JSON.stringify({file,count:arr.length,status:'validated-for-import'},null,2));
