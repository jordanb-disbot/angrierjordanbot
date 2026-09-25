import fs from 'node:fs';import {createHash} from 'node:crypto';import assert from 'node:assert/strict';
const files={
 'content/fight/angrier_jordan_fight_move_pool_v1.json':'eb60c22f152ba5cb8e34cefb9154d701e0aa93ca899d30a869dbd089356999fe',
 'docs/specs/ANGRIER_JORDAN_FIGHT_COMBAT_SYSTEM_SPEC.md':'82233226c0f3457dc536953f9a6af7c834a4536fcffcdab4ca0d09ac19c2da48'
};
for(const [file,hash] of Object.entries(files)){const bytes=fs.readFileSync(file);assert.equal(createHash('sha256').update(bytes).digest('hex'),hash,'Approved Fight source changed: '+file);const original=new URL('../../'+file,import.meta.url);if(fs.existsSync(original))assert.deepEqual(bytes,fs.readFileSync(original),'Original and packaged approved Fight sources differ.');}
const pool=JSON.parse(fs.readFileSync(Object.keys(files)[0],'utf8'));assert.equal(pool.attacks.length,100);assert.equal(pool.heals.length,36);
const commands=JSON.parse(fs.readFileSync('generated/discord/application_commands.json','utf8'));assert.equal(commands.find(c=>c.name==='fight').options.find(o=>o.name==='member').required,true);
console.log('Approved Fight sources unchanged; 100 attacks / 36 heals; required target preserved.');
