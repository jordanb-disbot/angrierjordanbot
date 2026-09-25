import fs from 'node:fs';
const [,,file]=process.argv;if(!file)throw new Error('Usage: node scripts/import-yagpdb.mjs <export.json>');
const rows=JSON.parse(fs.readFileSync(file,'utf8'));const input=Array.isArray(rows)?rows:(rows.commands??[]);const supported=[],review=[];
for(const c of input){const body=String(c.response??c.body??'');const trigger=c.trigger??c.name;if(/{{|}}|exec|http|webhook|database|db\./i.test(body)){review.push({trigger,reason:'template/script/network behavior requires manual translation'});continue;}supported.push({name:c.name??trigger,enabled:false,triggerType:'exact_text',triggerValue:trigger,actions:[{type:'send_text',text:body}],migrationStatus:'draft'});}
console.log(JSON.stringify({supported,review},null,2));
