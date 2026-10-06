import test from 'node:test';import assert from 'node:assert/strict';
import {DiscordOnboardingCoordinator} from '../../dist/apps/bot/src/discord/onboarding-coordinator.js';
import {OnboardingService,InMemoryOnboardingRepository} from '../../dist/packages/features-onboarding/src/index.js';
import {AuditService,FixedClock,InMemoryAuditSink} from '../../dist/packages/core/src/index.js';
function fixture(){
 const repo=new InMemoryOnboardingRepository();repo.panel={id:'panel',guildId:'g',name:'Default Roles',enabled:true,categories:[{key:'dm_status',label:'DM Status',mode:'single',options:[{roleId:'open',label:'DMs Open',enabled:true},{roleId:'closed',label:'DMs Closed',enabled:true}]},{key:'pings',label:'Notification Pings',mode:'multi',options:[{roleId:'race',label:'Race Ping',enabled:true},{roleId:'line',label:'Line Ping',enabled:true}]}]};
 const labels={open:'DMs Open',closed:'DMs Closed',race:'Race Ping',line:'Line Ping'},effects=[],held=new Set(),roles=new Map(['open','closed','race','line'].map(id=>[id,{id,name:labels[id],managed:false,editable:true,permissions:{bitfield:0n}}])),member={roles:{add:async id=>{held.add(id);effects.push('add:'+id);},remove:async id=>{held.delete(id);effects.push('remove:'+id);}}},guild={members:{fetch:async()=>member},roles:{cache:roles}},service=new OnboardingService(repo,new AuditService(new InMemoryAuditSink()),new FixedClock(new Date())),coordinator=new DiscordOnboardingCoordinator(service,{get:async()=>null}),replies=[];
 const interaction=(customId,values)=>{const i={guildId:'g',guild,user:{id:'u'},customId,values,message:{attachments:new Map([['art',{name:'your-roles-1.png'}]])},deferred:false,replied:false,deferUpdate:async()=>{i.deferred=true;effects.push('ack');},deferReply:async()=>{i.deferred=true;effects.push('ack');},editReply:async p=>replies.push(p),followUp:async p=>replies.push(p),reply:async p=>{i.replied=true;replies.push(p);}};return i;};
 return{repo,roles,guild,coordinator,interaction,replies,effects,held};
}
const nodes=p=>p.components.map(c=>c.toJSON());
test('Roles opens category-first, category selection reuses one private window without reupload',async()=>{
 const f=fixture();await f.coordinator.handleRolesCommand(f.interaction('',[]));let n=nodes(f.replies.at(-1));assert.equal(n.filter(c=>c.type===1&&c.components[0].custom_id==='roles:select:_category').length,1);assert.equal(n.find(c=>c.type===1&&c.components[0].custom_id==='roles:select:_category').components[0].custom_id,'roles:select:_category');assert.ok(n.some(c=>c.type===1&&c.components[0].custom_id==='roles:publish'));
 await f.coordinator.handleRoleSelect(f.interaction('roles:select:_category',['dm_status']));const p=f.replies.at(-1);n=nodes(p);assert.equal(n.filter(c=>c.type===1).length,3);assert.equal(p.files,undefined);assert.equal(p.attachments,undefined);assert.match(JSON.stringify(n),/Choose one/);assert.equal(f.held.size,0);
});
test('Single select replaces prior role; deselection and reopening retain persisted state',async()=>{
 const f=fixture();for(const id of ['open','closed'])await f.coordinator.handleRoleSelect(f.interaction('roles:select:dm_status:0',[id]));assert.deepEqual([...f.held],['closed']);
 await f.coordinator.handleRoleSelect(f.interaction('roles:select:_category',['dm_status']));const menu=nodes(f.replies.at(-1)).flatMap(c=>c.type===1?c.components:[]).find(c=>c.custom_id==='roles:select:dm_status:0');assert.equal(menu.max_values,1);assert.equal(menu.options.find(o=>o.value==='closed').default,true);
 await f.coordinator.handleRoleSelect(f.interaction('roles:select:dm_status:0',[]));assert.equal(f.held.size,0);assert.equal((await f.repo.listSelfRoleSelections('g','u')).filter(r=>r.active).length,0);
});
test('Multi-select adds independent roles and clears them without a success follow-up',async()=>{
 const f=fixture();await f.coordinator.handleRoleSelect(f.interaction('roles:select:pings:0',['race','line']));assert.equal(f.held.size,2);assert.equal(f.replies.length,1);assert.equal(nodes(f.replies[0]).flatMap(c=>c.type===1?c.components:[]).find(c=>c.custom_id==='roles:select:pings:0').max_values,2);
 await f.coordinator.handleRoleSelect(f.interaction('roles:select:pings:0',[]));assert.equal(f.held.size,0);
});
test('Stale categories, invalid page/role IDs and unmanageable roles fail safely with an actionable private reply',async()=>{
 for(const [id,values,message]of [['roles:select:_category',['gone'],'This category is no longer available. Reopen /roles.'],['roles:select:dm_status:9',['open'],'These choices are no longer available. Reopen /roles.'],['roles:select:dm_status:0',['unknown'],'A selected role is no longer available in DM Status. Reopen /roles.']]){const f=fixture();await f.coordinator.handleRoleSelect(f.interaction(id,values));assert.deepEqual(f.effects,['ack']);assert.equal(f.replies.at(-1).content,message);}
 const f=fixture();f.roles.get('open').editable=false;await f.coordinator.handleRoleSelect(f.interaction('roles:select:dm_status:0',['open']));assert.deepEqual(f.effects,['ack']);assert.match(f.replies.at(-1).content,/move the role below Angrier Jordan/);
});
test('A deleted prior DM status does not block selecting a current replacement',async()=>{
 const f=fixture();await f.coordinator.handleRoleSelect(f.interaction('roles:select:dm_status:0',['open']));f.roles.delete('open');f.held.delete('open');await f.coordinator.handleRoleSelect(f.interaction('roles:select:dm_status:0',['closed']));assert.deepEqual([...f.held],['closed']);assert.deepEqual((await f.repo.listSelfRoleSelections('g','u')).filter(r=>r.active).map(r=>r.roleId),['closed']);
});
test('A protected zero-permission access role cannot be self-selected from a misconfigured panel',async()=>{
 const f=fixture();f.coordinator.config={get:async(_guild,key)=>key==='roles.member_access'?'open':null};
 await f.coordinator.handleRoleSelect(f.interaction('roles:select:dm_status:0',['open']));
 assert.deepEqual(f.effects,['ack']);assert.equal(f.held.size,0);assert.match(f.replies.at(-1).content,/protected server role/);
});
test('A panel misconfiguration cannot display or assign staff-style roles',async()=>{
 const f=fixture();f.repo.panel.categories[0].options.push({roleId:'staff',label:'Arm Chair',enabled:true});f.roles.set('staff',{id:'staff',name:'Arm Chair',managed:false,editable:true,permissions:{bitfield:0n}});
 await f.coordinator.handleRolesCommand(f.interaction('',[]));assert.doesNotMatch(JSON.stringify(nodes(f.replies.at(-1))),/Arm Chair/);
 await f.coordinator.handleRoleSelect(f.interaction('roles:select:dm_status:0',['staff']));assert.equal(f.held.size,0);assert.match(f.replies.at(-1).content,/no longer available/);
});
