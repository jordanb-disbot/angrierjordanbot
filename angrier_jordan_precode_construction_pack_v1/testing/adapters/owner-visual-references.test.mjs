import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';

const root=new URL('../../',import.meta.url);
const roles=JSON.parse(readFileSync(new URL('production/theme/role-colors.json',root),'utf8'));
const references=JSON.parse(readFileSync(new URL('docs/owner_references/2026-09-28/manifest.json',root),'utf8'));

test('corrected owner role-color sheet is retained and supersedes the earlier sheet',()=>{
 const corrected=references.images.find(image=>image.file==='correct-role-colors.png');
 assert.ok(corrected);
 const data=readFileSync(new URL('docs/owner_references/2026-09-28/'+corrected.file,root));
 assert.equal(createHash('sha256').update(data).digest('hex'),corrected.sha256);
 assert.equal(roles.reference,'docs/owner_references/2026-09-28/correct-role-colors.png');
 assert.match(references.images.find(image=>image.file==='superseded-role-sheet.png').use,/do not use/);
});

test('role identity gradients preserve the owner-corrected sequence without changing brand accents',()=>{
 assert.equal(roles.roles.length,10);
 assert.deepEqual(roles.roles.map(role=>role.name),['The Chairman','Throne','Chaise Lounge','Recliner','Arm Chair','Folding Chair','Barstool','Restraint Chair','Sideline Chair','Cuck Chair']);
 assert.deepEqual(roles.roles.find(role=>role.name==='Folding Chair').gradient,['#1683A6','#356BC2']);
 assert.deepEqual(roles.roles.find(role=>role.name==='Restraint Chair').gradient,['#554FB2','#69457D']);
 for(let n=1;n<roles.roles.length;n++)assert.equal(roles.roles[n-1].gradient[1],roles.roles[n].gradient[0]);
 const brand=JSON.parse(readFileSync(new URL('production/theme/brand.json',root),'utf8'));
 assert.equal(brand.typography.heading,'Space Grotesk');assert.equal(brand.typography.body,'Inter');
});
