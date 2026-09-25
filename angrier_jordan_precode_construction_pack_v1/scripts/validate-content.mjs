import fs from 'node:fs'; import path from 'node:path';
const dir='reference/acceleration/content';let files=0;
for(const n of fs.readdirSync(dir)){if(!n.endsWith('.json'))continue;JSON.parse(fs.readFileSync(path.join(dir,n),'utf8'));files++;}
const qa=JSON.parse(fs.readFileSync(path.join(dir,'CONTENT_QA_REPORT.json'),'utf8'));
if(qa.errors?.length)throw new Error('Content QA contains errors');
console.log(`Content JSON readable: ${files} files; ${qa.total_authored_entries} authored entries in the acceleration content pack.`);
