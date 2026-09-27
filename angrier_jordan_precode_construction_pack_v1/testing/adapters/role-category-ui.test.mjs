import test from 'node:test';import assert from 'node:assert/strict';
import {DiscordOnboardingCoordinator} from '../../dist/apps/bot/src/discord/onboarding-coordinator.js';
import {OnboardingService,InMemoryOnboardingRepository} from '../../dist/packages/features-onboarding/src/index.js';
import {AuditService,FixedClock,InMemoryAuditSink} from '../../dist/packages/core/src/index.js';
function fixture(){
 const repo=new InMemoryOnboardingRepository();repo.panel={id:'panel',guildId:'g',name:'Default Roles',enabled:true,categories:[{key:'dm_status',label:'DM Status',mode:'single',options:[{roleId:'open',label:'DMs Open',enabled:true},{roleId:'closed',label:'DMs Closed',enabled:true}]},{key:'pings',label:'Notification Pings',mode:'multi',options:[{roleId:'race',label:'Race Ping',enabled:true},{roleId:'redose',label:'REDOSE',enabled:true}]}]};
 const effects=[],held=new Set(),roles=new Map(['open','closed','race','redose'].map(id=>[id,{id,name:id,managed:false,editable:true,permissions:{bitfield:0n}}])),member={roles:{add:async id=>{held.add(id);effects.push('add:'+id);},remove:async id=>{held.delete(id);effects.push('remove:'+id);}}},guild={members:{fetch:async()=>member},roles:{cache:roles}},service=new OnboardingService(repo,new AuditService(new InMemoryAuditSink()),new FixedClock(new Date())),coordinator=new DiscordOnboardingCoordinator(service,{get:async()=>null}),replies=[];
 const interaction=(customId,values)=>({guildId:'g',guild,user:{id:'u'},customId,values,deferUpdate:async()=>effects.push('ack'),deferReply:async()=>effects.push('ack'),editReply:async p=>replies.push(p)});
 return{repo,roles,coordinator,interaction,replies,effects,held};
}
const nodes=p=>p.components.flatMap(c=>c.toJSON().components);
test('Roles opens category-first, category selection reuses one private window without reupload',async()=>{
 const f=fixture();await f.coordinator.handleRolesCommand(f.interaction('',[]));let n=nodes(f.replies.at(-1));assert.equal(n.filter(c=>c.type===1).length,1);assert.equal(n.find(c=>c.type===1).components[0].custom_id,'roles:select:_category');
 await f.coordinator.handleRoleSelect(f.interaction('roles:select:_category',['dm_status']));const p=f.replies.at(-1);n=nodes(p);assert.equal(n.filter(c=>c.type===1).length,2);assert.equal(p.files,undefined);assert.equal(p.attachments,undefined);assert.match(JSON.stringify(n),/Choose one/);assert.equal(f.held.size,0);
});
test('Single select replaces prior role; deselection and reopening retain persisted state',async()=>{
 const f=fixture();for(const id of ['open','closed'])await f.coordinator.handleRoleSelect(f.interaction('roles:select:dm_status:0',[id]));assert.deepEqual([...f.held],['closed']);
 await f.coordinator.handleRoleSelect(f.interaction('roles:select:_category',['dm_status']));const menu=nodes(f.replies.at(-1)).filter(c=>c.type===1).at(-1).components[0];assert.equal(menu.max_values,1);assert.equal(menu.options.find(o=>o.value==='closed').default,true);
 await f.coordinator.handleRoleSelect(f.interaction('roles:select:dm_status:0',[]));assert.equal(f.held.size,0);assert.equal((await f.repo.listSelfRoleSelections('g','u')).filter(r=>r.active).length,0);
});
test('Multi-select adds independent roles and clears them without a success follow-up',async()=>{
 const f=fixture();await f.coordinator.handleRoleSelect(f.interaction('roles:select:pings:0',['race','redose']));assert.equal(f.held.size,2);assert.equal(f.replies.length,1);assert.equal(nodes(f.replies[0]).filter(c=>c.type===1).at(-1).components[0].max_values,2);
 await f.coordinator.handleRoleSelect(f.interaction('roles:select:pings:0',[]));assert.equal(f.held.size,0);
});
test('Stale categories, invalid page/role IDs and unmanageable roles fail without assignment',async()=>{
 for(const [id,values,code]of [['roles:select:_category',['gone'],'ROLE_CATEGORY_NOT_FOUND'],['roles:select:dm_status:9',['open'],'ROLE_PAGE_STALE'],['roles:select:dm_status:0',['unknown'],'ROLE_OPTION_NOT_AVAILABLE']]){const f=fixture();await assert.rejects(()=>f.coordinator.handleRoleSelect(f.interaction(id,values)),{code});assert.deepEqual(f.effects,['ack']);}
 const f=fixture();f.roles.get('open').editable=false;await assert.rejects(()=>f.coordinator.handleRoleSelect(f.interaction('roles:select:dm_status:0',['open'])),{code:'ROLE_UNMANAGEABLE'});assert.deepEqual(f.effects,['ack']);
});
