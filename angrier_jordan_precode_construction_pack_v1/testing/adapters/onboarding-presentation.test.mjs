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
 const p=calls.at(-1)[1];assert.ok(p.files.length>1&&p.files.length<=10);assert.equal(p.embeds.length,0);assert.equal(p.components.filter(c=>c.toJSON().type===12).length,p.files.length);
 assert.equal(p.components.find(c=>c.toJSON().type===1).toJSON().components[0].custom_id,'onboard:ack_rules');assert.equal(p.content,null);
 for(const section of rules.sections){const pages=rulesSections(section.body);assert.ok(pages.length);for(const page of pages){const svg=renderOnboarding(rules.title,'Read before acknowledging',page);assert.match(svg,/width="1200"/);assert.match(svg,/Inter/);assert.match(svg,/Space Grotesk/);assert.doesNotMatch(svg,/intro:|onboard:/);}}
 assert.match(rules.sections[0].body,/No DOC judgement/);assert.match(rules.sections[1].body,/no needles or IV/);assert.match(rules.sections[2].body,/Server removal/);
});
test('Unconfigured role panel acknowledges before reading state and fails compactly',async()=>{
 const order=[],replies=[],service={rolePanel:async()=>{order.push('read');throw new DomainError('ROLE_PANEL_UNAVAILABLE','The role panel is not currently available.');}};
 await new DiscordOnboardingCoordinator(service,config).handleRolesCommand({guildId:'g',guild:{members:{fetch:async()=>({permissions:{has:()=>true}})}},user:{id:'u'},deferReply:async()=>order.push('ack'),editReply:async p=>replies.push(p)});
 assert.deepEqual(order,['ack','read']);assert.match(replies[0].content,/not currently available/);assert.equal(replies[0].files,undefined);
});
test('First join and rejoin are distinguished from persisted presence',async()=>{
 const repo=new InMemoryOnboardingRepository(),service=new OnboardingService(repo,new AuditService(new InMemoryAuditSink()),new FixedClock(new Date('2026-09-26T12:00:00Z'))),messages=[],member={id:'u',guild:{id:'g'},roles:{cache:new Map()},send:async p=>messages.push(p.content)};
 const coordinator=new DiscordOnboardingCoordinator(service,config);
 await coordinator.handleMemberAdd(member);await coordinator.handleMemberAdd(member);
 assert.match(messages[0],/^Welcome to Chairs/);assert.match(messages[1],/^Welcome back to Chairs/);assert.equal((await repo.getPresence('g','u')).needsRulesAck,true);
});
test('Self-role selection keeps artwork and rejects permission-bearing roles before mutation',async()=>{
 const panel={categories:[{key:'pings',label:'Pings',mode:'multi',options:[{roleId:'r',label:'Games',enabled:true}]}]},service={rolePanel:async()=>({panel,selections:[]}),planRoleCategoryUpdate:async()=>({addRoleIds:['r'],removeRoleIds:[]}),updateRoleCategory:async()=>{}},effects=[],guild={members:{fetch:async()=>({permissions:{has:()=>true},roles:{add:async()=>effects.push('add')}})},roles:{cache:new Map([['r',{name:'Games',managed:false,editable:true,permissions:{bitfield:8n}}]])}},i={guildId:'g',guild,user:{id:'u'},message:{attachments:new Map([['art',{name:'your-roles-1.png'}]])},customId:'roles:select:pings:0',values:['r'],deferred:false,replied:false,deferUpdate:async()=>{i.deferred=true;effects.push('ack');},editReply:async p=>effects.push(p),followUp:async p=>effects.push(p),reply:async p=>effects.push(p)};
 await new DiscordOnboardingCoordinator(service,config).handleRoleSelect(i);assert.deepEqual(effects.slice(0,1),['ack']);assert.match(effects.at(-1).content,/Discord permissions/);
 guild.roles.cache.get('r').permissions.bitfield=0n;effects.length=0;await new DiscordOnboardingCoordinator(service,config).handleRoleSelect(i);assert.equal(effects[0],'ack');assert.equal(effects[1],'add');assert.equal(effects[2].files,undefined);assert.equal(effects[2].attachments,undefined);
});
