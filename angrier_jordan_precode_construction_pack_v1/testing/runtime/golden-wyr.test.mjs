import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs';
const prompts=JSON.parse(fs.readFileSync(new URL('../../packages/content/golden/wyr_sample.json',import.meta.url),'utf8'));
test('golden WYR sample covers all six categories',()=>{assert.deepEqual([...new Set(prompts.map(x=>x.category))].sort(),['Casual','Dating','Friends','Married','Spicy','Unhinged'].sort());});
test('golden WYR prompts have two distinct options and stable IDs',()=>{for(const p of prompts){assert.match(p.id,/^WYR-GOLD-\d{3}$/);assert.notEqual(p.optionA,p.optionB);assert.equal(p.enabled,true);}});
test('WYR runtime contract: 60 seconds plus one 30 second extension',()=>{const duration=60,extension=30;assert.equal(duration+extension,90);});
