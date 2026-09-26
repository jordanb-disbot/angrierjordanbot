import test from 'node:test';
import assert from 'node:assert/strict';
import {auditCommandShapes} from '../../scripts/command-shape-audit.mjs';
test('Discord command shape audit rejects excessive direct and nested options',()=>{
 const rows=Array.from({length:40},(_,i)=>({name:'reaction'+i,type:1}));
 assert.match(auditCommandShapes([{name:'social',options:rows}])[0],/40 options/);
 assert.match(auditCommandShapes([{name:'social',options:[{name:'reactions',type:2,options:rows}]}])[0],/social reactions/);
});
test('Discord command shape audit accepts a bounded autocomplete reaction hub',()=>{
 assert.deepEqual(auditCommandShapes([{name:'social',options:[{name:'react',type:1,options:[{name:'action',type:3,required:true,autocomplete:true},{name:'member',type:6}]},{name:'roast',type:1,options:[{name:'member',type:6,required:true}]}]}]),[]);
});
test('Discord command shape audit rejects mixed branches and invalid choice inputs',()=>{
 assert.match(auditCommandShapes([{name:'intro',options:[{name:'edit',type:1},{name:'answer',type:3}]}]).join(' '),/cannot be siblings/);
 assert.match(auditCommandShapes([{name:'social',options:[{name:'action',type:3,autocomplete:true,choices:Array(26).fill({name:'x',value:'x'})}]}]).join(' '),/choices exceed 25.*cannot be combined/);
});
test('Discord command shape audit detects duplicate names and required-option ordering',()=>{
 const issues=auditCommandShapes([{name:'example',options:[{name:'value',type:3},{name:'value',type:3,required:true}]}]);
 assert.equal(issues.length,2);
});
