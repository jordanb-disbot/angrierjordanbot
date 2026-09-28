import test from 'node:test';
import assert from 'node:assert/strict';
import {Collection,PermissionFlagsBits as P,PermissionsBitField,ChannelType} from 'discord.js';
import {DiscordJailCoordinator} from '../../dist/apps/bot/src/discord/jail-coordinator.js';
import {DiscordOnboardingCoordinator} from '../../dist/apps/bot/src/discord/onboarding-coordinator.js';
import {AuditService,FixedClock,InMemoryAuditSink} from '../../dist/packages/core/src/index.js';
import {JailService,InMemoryJailRepository} from '../../dist/packages/features-jail/src/index.js';
import {OnboardingService,InMemoryOnboardingRepository} from '../../dist/packages/features-onboarding/src/index.js';

async function fixture({acknowledged=true,extraAllow=false,dmFailure=false}={}) {
 const clock=new FixedClock(new Date()),audit=new AuditService(new InMemoryAuditSink()),repo=new InMemoryJailRepository(),service=new JailService(repo,audit,clock);
 const onboardingRepo=new InMemoryOnboardingRepository(),onboardingService=new OnboardingService(onboardingRepo,audit,clock);
 await onboardingService.memberJoined('g','member');if(acknowledged)await onboardingService.acknowledgeRules('g','member');
 onboardingRepo.listActivePunishments=async(g,u)=> (await service.status(g,u)).map(s=>({id:s.id,kind:s.type,endsAt:s.endsAt,indefinite:s.indefinite}));
 const values={'roles.member_access':'folding','roles.jailed':'jailed','channels.hotseat_channel':'hotseat','moderation.jail.links_allowed':false,'moderation.jail.attachments_allowed':false};
 const config={get:async(_g,k)=>values[k]??null};
 const roles=new Collection(['folding','jailed','extra'].map(id=>[id,{id,name:id,editable:true,managed:false,permissions:new PermissionsBitField(0n)}]));
 const calls=[],notices=[],live=new Set(['folding',...(extraAllow?['extra']:[])]);
 const guild={id:'g',ownerId:'owner',roles:{cache:roles},channels:{cache:new Collection()},members:{fetch:async id=>id==='owner'?{id:'owner',guild}:member()}};
 function member(ids=[...live]) {
  const cache=new Collection(ids.map(id=>[id,roles.get(id)]));
  // discord.js single-role REST mutations return a clone; the original cache need not change yet.
  return {id:'member',guild,manageable:true,displayName:'Test member',permissions:new PermissionsBitField(0n),send:async payload=>{notices.push({kind:'dm',payload,roles:[...live]});if(dmFailure)throw Error('DMs closed');},
   roles:{cache,remove:async value=>{const id=value.id??value;calls.push('remove:'+id);live.delete(id);return member(ids.filter(x=>x!==id));},
    add:async value=>{const id=value.id??value;calls.push('add:'+id);live.add(id);return member([...new Set([...ids,id])]);}}};
 }
 function channel(id,type,gated) {
  const overwrites=new Map();if(gated)overwrites.set('folding',{ViewChannel:true});if(extraAllow)overwrites.set('extra',{ViewChannel:true});
  const c={id,type,guild,permissionOverwrites:{edit:async(role,p)=>{overwrites.set(role,p);}},isTextBased:()=>type===ChannelType.GuildText,send:async payload=>{notices.push({kind:'channel',id,payload,roles:[...live]});},
   permissionsFor:m=>{let allowed=!gated;const matches=[...m.roles.cache.keys()].map(id=>overwrites.get(id)).filter(Boolean);if(matches.some(p=>p.ViewChannel===false))allowed=false;if(matches.some(p=>p.ViewChannel===true))allowed=true;return new PermissionsBitField(allowed?P.ViewChannel:0n);}};
  guild.channels.cache.set(id,c);return c;
 }
 const main=channel('main',ChannelType.GuildText,true),voice=channel('voice',ChannelType.GuildVoice,true),ordinary=channel('ordinary',ChannelType.GuildText,false);channel('hotseat',ChannelType.GuildText,false);
 const onboarding=new DiscordOnboardingCoordinator(onboardingService,config),coordinator=new DiscordJailCoordinator(service,config,onboarding);
 const interaction=sub=>({guildId:'g',guild,user:{id:'owner'},options:{getSubcommand:()=>sub,getUser:()=>({id:'member'}),getString:k=>k==='duration'?'5m':'Local test'},reply:async()=>{},deferReply:async()=>{},editReply:async()=>{}});
 return {clock,repo,service,onboardingService,onboarding,coordinator,guild,member,live,calls,notices,main,voice,ordinary,interaction};
}

for(const dmFailure of [false,true])test(`successful Jail send directs member and announces arrival even when DM ${dmFailure?'fails':'works'}`,async()=>{
 const f=await fixture({dmFailure});await f.coordinator.handleCommand(f.interaction('send'));
 const arrival=f.notices.find(row=>row.kind==='channel'&&row.id==='hotseat'),dm=f.notices.find(row=>row.kind==='dm');
 assert.ok(arrival);assert.ok(dm);assert.deepEqual(arrival.roles,['jailed']);assert.deepEqual(dm.roles,['jailed']);
 assert.match(JSON.stringify(arrival.payload.components[0].toJSON()),/<@member> has entered the Hotseat/);
 assert.match(dm.payload.content,/<#hotseat>/);assert.doesNotMatch(dm.payload.content,/mov(?:e|ed) you/i);
 assert.ok(f.notices.indexOf(arrival)<f.notices.indexOf(dm));assert.ok(await f.service.activeModeration('g','member'));
});

test('Folding Chair override is suspended before containment checks, without relying on gateway cache refresh',async()=>{
 const f=await fixture();await f.coordinator.reconcileGuild(f.guild);
 assert.equal(f.main.permissionsFor(f.member(['folding','jailed'])).has(P.ViewChannel),true,'a jailed deny alone loses to Folding Chair allow');
 await f.coordinator.handleCommand(f.interaction('send'));
 assert.deepEqual([...f.live],['jailed']);assert.deepEqual(f.calls,['remove:folding','add:jailed']);
 for(const c of [f.main,f.voice,f.ordinary])assert.equal(c.permissionsFor(f.member()).has(P.ViewChannel),false);
 const sentence=await f.service.activeModeration('g','member');assert.ok(sentence);assert.deepEqual(sentence.restoration.suspendedRoleIds,[],'member access must use Rules-aware restoration, not unconditional role restore');
});

test('manual release durably closes the sentence before restoring eligible Folding Chair access',async()=>{
 const f=await fixture();await f.coordinator.handleCommand(f.interaction('send'));
 const original=f.onboarding.restoreAfterPunishment.bind(f.onboarding);f.onboarding.restoreAfterPunishment=async m=>{assert.equal(await f.service.activeModeration('g','member'),null);assert.equal(f.live.has('folding'),false);return original(m);};
 await f.coordinator.handleCommand(f.interaction('release'));
 assert.equal(f.live.has('jailed'),false);assert.equal(f.live.has('folding'),true);assert.equal(f.main.permissionsFor(f.member()).has(P.ViewChannel),true);
});

test('scheduled expiry also restores eligible access through onboarding',async()=>{
 const f=await fixture();await f.coordinator.handleCommand(f.interaction('send'));const s=await f.service.activeModeration('g','member');f.repo.sentences.get(s.id).endsAt=new Date(Date.now()-1000);f.clock.advanceMs(301000);
 await f.coordinator.handleExpiryJob({guilds:{cache:new Map([['g',f.guild]])}},{sentenceId:s.id});
 assert.equal(f.live.has('folding'),true);assert.equal(f.live.has('jailed'),false);assert.equal(await f.service.activeModeration('g','member'),null);
});

test('release does not bypass a pending Rules acknowledgement; acknowledging afterward restores Folding Chair',async()=>{
 const f=await fixture({acknowledged:false});await f.coordinator.handleCommand(f.interaction('send'));await f.coordinator.handleCommand(f.interaction('release'));
 assert.equal(f.live.has('folding'),false);assert.equal(f.live.has('jailed'),false);
 const plan=await f.onboardingService.acknowledgeRules('g','member');await f.onboarding.applyRestorePlan(f.member(),plan);
 assert.equal(f.live.has('folding'),true);assert.equal(f.main.permissionsFor(f.member()).has(P.ViewChannel),true);
});

test('Rules acknowledgement during a sentence cannot restore normal access',async()=>{
 const f=await fixture({acknowledged:false});await f.coordinator.handleCommand(f.interaction('send'));const plan=await f.onboardingService.acknowledgeRules('g','member');await f.onboarding.applyRestorePlan(f.member(),plan);
 assert.equal(f.live.has('folding'),false);assert.equal(f.live.has('jailed'),true);await f.coordinator.handleCommand(f.interaction('release'));assert.equal(f.live.has('folding'),true);
});

test('failed sentence persistence restores only roles actually removed and removes the temporary jailed role',async()=>{
 const f=await fixture();f.service.send=async()=>{throw Error('persistence unavailable');};await f.coordinator.handleCommand(f.interaction('send'));
 assert.deepEqual([...f.live],['folding']);assert.equal(await f.service.activeModeration('g','member'),null);
});

test('unrelated explicit role allows still reject confinement and restore Folding Chair safely',async()=>{
 const f=await fixture({extraAllow:true});await f.coordinator.handleCommand(f.interaction('send'));
 assert.deepEqual([...f.live].sort(),['extra','folding']);assert.equal(await f.service.activeModeration('g','member'),null);
});

test('failed durable release restores confinement without granting Folding Chair',async()=>{
 const f=await fixture();await f.coordinator.handleCommand(f.interaction('send'));f.service.release=async()=>{throw Error('release persistence unavailable');};
 await assert.rejects(()=>f.coordinator.handleCommand(f.interaction('release')),/release persistence unavailable/);assert.equal(f.live.has('jailed'),true);assert.equal(f.live.has('folding'),false);assert.ok(await f.service.activeModeration('g','member'));
});

for(const mode of ['success','containment failure','delivery failure','config failure'])test('send acknowledges before work: '+mode,async()=>{
 const f=await fixture({extraAllow:mode==='containment failure'}),i=f.interaction('send');let ack=0,edits=[],cards=0;
 i.deferReply=async()=>{ack++;i.deferred=true;};i.reply=async()=>assert.fail('no second initial reply');i.editReply=async p=>{edits.push(p.content);};
 const fetch=f.guild.members.fetch;f.guild.members.fetch=async id=>{assert.equal(ack,1);if(mode==='config failure')throw Error('Unavailable');return fetch(id);};
 f.coordinator.postHotseatCard=async()=>{cards++;if(mode==='delivery failure')throw Error('Discord unavailable');};
 await f.coordinator.handleCommand(i);assert.equal(ack,1);assert.equal(edits.length,1);
 if(mode==='containment failure'){assert.match(edits[0],/not fully contain/);assert.equal(cards,0);assert.equal(f.live.has('folding'),true);assert.equal(f.live.has('jailed'),false);}
 else if(mode==='config failure'){assert.match(edits[0],/could not be completed/);assert.equal(cards,0);assert.equal(f.live.has('folding'),true);}
 else {assert.equal(cards,1);assert.equal(f.live.has('jailed'),true);assert.match(edits[0],mode==='delivery failure'?/notice could not be delivered; confinement is active/:/now in Hotseat/);}
});
test('already deferred send does not acknowledge twice',async()=>{const f=await fixture(),i=f.interaction('send');i.deferred=true;i.deferReply=async()=>assert.fail('duplicate defer');await f.coordinator.handleCommand(i);});
