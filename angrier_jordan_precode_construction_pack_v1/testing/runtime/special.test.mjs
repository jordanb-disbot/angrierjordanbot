import test from 'node:test';import assert from 'node:assert/strict';
import {lineFrame,validateBuiltinRoleMap,validateCustomSpecialCommands,mayInvokeSpecial,specialNotificationRole} from '../../.test-build/packages/features-special/src/domain.js';
test('built-in role map requires exactly four safe-shaped mapping values',()=>{const valid={'!line':null,'!race':'123456789012345678','!vc':null,'!chess':null};assert.deepEqual(validateBuiltinRoleMap(valid),valid);for(const value of [null,[],{}, {...valid,'!line':'staff'}, {...valid,extra:null},{'!line':null,'!race':null,'!vc':null}])assert.throws(()=>validateBuiltinRoleMap(value),{code:'SPECIAL_CONFIG'});});
test('Line uses exact 5 4 3 2 1 0 then bounded powder and completion',()=>{
 assert.deepEqual([0,1000,2000,3000,4000,5000].map(ms=>lineFrame(ms).number),[5,4,3,2,1,0]);
 for(let ms=0;ms<9000;ms+=10){const frame=lineFrame(ms);assert.ok(frame.progress>=0&&frame.progress<1);}
 assert.equal(lineFrame(4999).number,1);assert.equal(lineFrame(5999).number,0);assert.equal(lineFrame(6000).phase,'burst');assert.equal(lineFrame(7500).progress,0.5);assert.equal(lineFrame(8999).phase,'burst');assert.equal(lineFrame(9000).phase,'complete');assert.equal(lineFrame(100000).phase,'complete');
 assert.equal(lineFrame(7000,8000).progress,0.5);assert.equal(lineFrame(8000,8000).phase,'complete');
});
test('Special definitions are restricted notification data and cannot impersonate native events',()=>{
 const command={trigger:'!gather',notificationRoleId:'123456789012345678',responsePool:['Time to gather.'],enabled:true,allowedRoleIds:[]};assert.deepEqual(validateCustomSpecialCommands([command]),[command]);
 for(const trigger of ['!line','!race','!vc','!chess','/line','!Line','!two words'])assert.throws(()=>validateCustomSpecialCommands([{...command,trigger}]),{code:'SPECIAL_CONFIG'});
 for(const extra of [{handler:'race.start'},{script:'process.exit()'},{cooldown:60},{type:'line'}])assert.throws(()=>validateCustomSpecialCommands([{...command,...extra}]),{code:'SPECIAL_CONFIG'});
 assert.throws(()=>validateCustomSpecialCommands([command,command]));assert.throws(()=>validateCustomSpecialCommands([{...command,responsePool:[]}]))
});
test('Default member access, role restriction and safe opt-in notifications',()=>{
 assert.equal(mayInvokeSpecial([],new Set()),true);assert.equal(mayInvokeSpecial(['staff'],new Set()),false);assert.equal(mayInvokeSpecial(['staff'],new Set(['staff'])),true);
 const role={id:'optin',managed:false,permissions:{bitfield:0n}};assert.equal(specialNotificationRole(role,'server'),'optin');assert.equal(specialNotificationRole({...role,managed:true},'server'),undefined);assert.equal(specialNotificationRole({...role,id:'server'},'server'),undefined);assert.equal(specialNotificationRole({...role,permissions:{bitfield:8n}},'server'),undefined);
});
