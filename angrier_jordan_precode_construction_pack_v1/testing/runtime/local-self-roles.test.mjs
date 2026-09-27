import test from 'node:test';
import assert from 'node:assert/strict';
import {categories,planSelfRoles} from '../../scripts/configure-local-self-roles.mjs';
const make=()=>[{id:'g',name:'@everyone',position:0,permissions:'0',managed:false},{id:'bot',name:'AJ',position:100,permissions:String(1n<<28n),managed:true},...categories.flatMap(c=>c[3]).map((name,i)=>({id:'r'+i,name,position:i+1,permissions:'0',managed:false}))];
test('Only explicitly approved roles enter the seven categories; Line Ping belongs to multi-select pings',()=>{
 const roles=make();roles.push({id:'earned',name:'Chair Connoisseur',position:30,permissions:'0',managed:false},{id:'chair',name:'Throne',position:31,permissions:'0',managed:false});
 const p=planSelfRoles(roles,['bot'],[],'g');assert.equal(p.rejected.length,0);assert.equal(p.categories.flatMap(c=>c.options).length,28);
 assert.equal(p.categories.find(c=>c.key==='pings').mode,'multi');assert.ok(p.categories.find(c=>c.key==='pings').options.some(o=>o.label==='Line Ping'));
 assert.ok(!p.categories.flatMap(c=>c.options).some(o=>['earned','chair'].includes(o.roleId)));
 assert.deepEqual(p.categories.map(c=>c.mode),['single','single','single','single','multi','multi','multi']);
});
test('Managed, high, permission-bearing, mapped, duplicate and missing roles are excluded',()=>{
 const roles=make();roles.find(r=>r.name==='DMs Open').managed=true;roles.find(r=>r.name==='DMs Closed').position=100;roles.find(r=>r.name==='Male').permissions='8';
 const female=roles.find(r=>r.name==='Female');roles.push({...roles.find(r=>r.name==='18-24'),id:'duplicate'});roles.splice(roles.findIndex(r=>r.name==='35+'),1);
 const p=planSelfRoles(roles,['bot'],[{key:'roles.throne',value:female.id}],'g');assert.equal(p.rejected.length,6);assert.match(p.rejected.find(r=>r.label==='Female').reason,/Protected/);
});
test('Existing spelling resolves without creating or renaming a Discord role; no Manage Roles fails closed',()=>{
 const roles=make(),r=roles.find(r=>r.name==='Dissociatives');r.name='Disassociatives';const p=planSelfRoles(roles,['bot'],[],'g');assert.equal(p.rejected.length,0);assert.ok(p.categories.find(c=>c.key==='vices').options.some(o=>o.roleId===r.id&&o.label==='Disassociatives'));
 roles.find(r=>r.id==='bot').permissions='0';assert.throws(()=>planSelfRoles(roles,['bot'],[],'g'),/BOT_CANNOT_MANAGE_ROLES/);
});
test('Canonical opt-in mapping remains selectable but conflicting system uses are rejected',()=>{
 const roles=make(),line=roles.find(r=>r.name==='Line Ping'),map={'!line':line.id,'!race':null,'!vc':null,'!chess':null};
 const good=planSelfRoles(roles,['bot'],[{key:'special_commands.builtin_role_map',value:map}],'g');assert.equal(good.rejected.length,0);
 const conflict=planSelfRoles(roles,['bot'],[{key:'special_commands.builtin_role_map',value:{...map,'!race':line.id}}],'g');assert.ok(conflict.rejected.some(r=>r.label==='Line Ping'));
 const protectedRole=planSelfRoles(roles,['bot'],[{key:'special_commands.builtin_role_map',value:map},{key:'roles.member_access',value:line.id}],'g');assert.ok(protectedRole.rejected.some(r=>r.label==='Line Ping'));
});
