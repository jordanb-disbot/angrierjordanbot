import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {DiscordOnboardingCoordinator} from '../../dist/apps/bot/src/discord/onboarding-coordinator.js';
import {OnboardingService,InMemoryOnboardingRepository} from '../../dist/packages/features-onboarding/src/index.js';
import {AuditService,FixedClock,InMemoryAuditSink,DomainError} from '../../dist/packages/core/src/index.js';
import {renderOnboarding,rulesSections} from '../../dist/packages/features-onboarding/src/render.js';
const rules=JSON.parse(fs.readFileSync(new URL('../../packages/content/onboarding/rules.json',import.meta.url),'utf8'));
const config={get:async()=>null};
test('Rules display owner-authored policy with early acknowledgement and no automatic acceptance',async()=>{
 const calls=[],i={guildId:'g',deferReply:async p=>calls.push(['ack',p]),editReply:async p=>calls.push(['edit',p])};
 await new DiscordOnboardingCoordinator({},config).handleRulesCommand(i);
 assert.equal(calls[0][0],'ack');assert.equal(calls[0][1].ephemeral,true);
 const p=calls.at(-1)[1];assert.equal(p.files,undefined);assert.match(p.content,/## Chairs Rules/);for(const section of rules.sections)assert.match(p.content,new RegExp(section.title));
 const controls=p.components[0].toJSON().components;assert.equal(controls.length,1);assert.equal(controls[0].custom_id,'onboard:ack_rules');
 for(const section of rules.sections){const pages=rulesSections(section.body);assert.ok(pages.length);for(const page of pages){const svg=renderOnboarding(rules.title,'Read before acknowledging',page);assert.match(svg,/width="1200"/);assert.match(svg,/Inter/);assert.match(svg,/Space Grotesk/);assert.doesNotMatch(svg,/intro:|onboard:/);}}
 assert.match(rules.sections[0].body,/No DOC judgement/);assert.match(rules.sections[1].body,/no needles or IV/);assert.match(rules.sections[2].body,/Server removal/);
});
test('Unconfigured role panel acknowledges before reading state and fails compactly',async()=>{
 const order=[],replies=[],service={rolePanel:async()=>{order.push('read');throw new DomainError('ROLE_PANEL_UNAVAILABLE','The role panel is not currently available.');}};
 await new DiscordOnboardingCoordinator(service,config).handleRolesCommand({guildId:'g',user:{id:'u'},deferReply:async()=>order.push('ack'),editReply:async p=>replies.push(p)});
 assert.deepEqual(order,['ack','read']);assert.match(replies[0].content,/not currently available/);assert.equal(replies[0].files,undefined);
});
test('First join and rejoin are distinguished from persisted presence',async()=>{
 const repo=new InMemoryOnboardingRepository(),service=new OnboardingService(repo,new AuditService(new InMemoryAuditSink()),new FixedClock(new Date('2026-09-26T12:00:00Z'))),messages=[],member={id:'u',guild:{id:'g'},roles:{cache:new Map()},send:async p=>messages.push(p.content)};
 const coordinator=new DiscordOnboardingCoordinator(service,config);
 await coordinator.handleMemberAdd(member);await coordinator.handleMemberAdd(member);
 assert.match(messages[0],/^Welcome to Chairs/);assert.match(messages[1],/^Welcome back to Chairs/);assert.equal((await repo.getPresence('g','u')).needsRulesAck,true);
});
test('explicitly suspended onboarding restores normal access without a custom acknowledgement prompt',async()=>{
 const repo=new InMemoryOnboardingRepository(),service=new OnboardingService(repo,new AuditService(new InMemoryAuditSink()),new FixedClock(new Date('2026-09-26T12:00:00Z'))),effects=[],member={id:'u',guild:{id:'g',roles:{cache:new Map([['access',{id:'access',managed:false,editable:true,permissions:{bitfield:0n}}]])}},roles:{cache:new Map(),add:async role=>effects.push(['add',typeof role==='string'?role:role.id]),remove:async role=>effects.push(['remove',typeof role==='string'?role:role.id])},send:async()=>effects.push(['dm']),setNickname:async()=>{}};
 const coordinator=new DiscordOnboardingCoordinator(service,{get:async(_g,key)=>key==='onboarding.rules_ack_required'?false:key==='roles.member_access'?'access':null});
 await coordinator.handleMemberAdd(member);
 assert.deepEqual(effects,[['add','access']]);assert.equal((await repo.getPresence('g','u')).needsRulesAck,false);
});
test('Self-role selection keeps artwork and rejects permission-bearing roles before mutation',async()=>{
 const panel={categories:[{key:'pings',label:'Pings',mode:'multi',options:[{roleId:'r',label:'Race Ping',enabled:true}]}]},service={rolePanel:async()=>({panel,selections:[]}),planRoleCategoryUpdate:async()=>({addRoleIds:['r'],removeRoleIds:[]}),updateRoleCategory:async()=>{}},effects=[],guild={members:{fetch:async()=>({roles:{add:async()=>effects.push('add')}})},roles:{cache:new Map([['r',{name:'Race Ping',managed:false,editable:true,permissions:{bitfield:8n}}]])}},i={guildId:'g',guild,user:{id:'u'},message:{attachments:new Map([['art',{name:'your-roles-1.png'}]])},customId:'roles:select:pings:0',values:['r'],deferred:false,replied:false,deferUpdate:async()=>{i.deferred=true;effects.push('ack');},editReply:async p=>effects.push(p),followUp:async p=>effects.push(p),reply:async p=>effects.push(p)};
 await new DiscordOnboardingCoordinator(service,config).handleRoleSelect(i);assert.deepEqual(effects.slice(0,1),['ack']);assert.match(effects.at(-1).content,/Discord permissions/);
 guild.roles.cache.get('r').permissions.bitfield=0n;effects.length=0;await new DiscordOnboardingCoordinator(service,config).handleRoleSelect(i);assert.equal(effects[0],'ack');assert.equal(effects.length,2);assert.equal(effects[1].files,undefined);assert.equal(effects[1].attachments,undefined);
});
