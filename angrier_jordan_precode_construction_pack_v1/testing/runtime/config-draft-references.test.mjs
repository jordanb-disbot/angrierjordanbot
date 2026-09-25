import test from 'node:test';
import assert from 'node:assert/strict';
import {verifyDashboardReferences} from '../../.test-build/packages/features-dashboard/src/references.js';
const guildId='11111111111111111',roleId='22222222222222222';
const definitions=[{key:'special_commands.builtin_role_map',type:'json',default:{},mutable:true}];
const values={'features.line':true,'special_commands.builtin_role_map':{'!line':roleId,'!race':null,'!vc':null,'!chess':null}};
test('built-in notification references reuse safe-role rules and bind current Discord permission state',async()=>{
  const result=await verifyDashboardReferences(guildId,definitions,values,async(server,resource)=>{
    assert.equal(server,guildId);assert.equal(resource,'roles');return[{id:roleId,managed:false,permissions:'0'}];
  });
  assert.deepEqual(result.errors,[]);assert.deepEqual(result.references['special_commands.builtin_role_map.!line'],{id:roleId,managed:false,permissions:'0'});
  for(const role of [{id:roleId,managed:true,permissions:'0'},{id:roleId,managed:false,permissions:'8'},{id:roleId,permissions:'0'}]){
    const invalid=await verifyDashboardReferences(guildId,definitions,values,async()=>[role]);assert.equal(invalid.errors.length,1);
  }
});
test('missing or unconfigured Line notification roles and provider failure block preview',async()=>{
  assert.ok((await verifyDashboardReferences(guildId,definitions,values,async()=>[])).errors.length);
  assert.ok((await verifyDashboardReferences(guildId,definitions,values,async()=>{throw new Error('private provider detail');})).errors.length);
  const unset={...values,'special_commands.builtin_role_map':{'!line':null,'!race':null,'!vc':null,'!chess':null}};
  const result=await verifyDashboardReferences(guildId,definitions,unset,async()=>{throw new Error('must not call provider without references');});
  assert.ok(result.errors.some(error=>error.includes('opt-in Line')));
});
