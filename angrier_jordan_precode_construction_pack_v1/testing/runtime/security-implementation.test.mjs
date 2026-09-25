import test from 'node:test';
import assert from 'node:assert/strict';
import {AuditService,FixedClock,InMemoryAuditSink,DomainError} from '../../.test-build/packages/core/src/index.js';
import {InMemorySecurityRepository,SecurityService} from '../../.test-build/packages/features-security/src/index.js';

const make=()=>{const clock=new FixedClock(new Date('2026-09-21T18:00:00Z'));const repo=new InMemorySecurityRepository();const sink=new InMemoryAuditSink();const service=new SecurityService(repo,new AuditService(sink),clock);return{clock,repo,sink,service};};
const heat={decayHours:72,warningThreshold:20,shortTimeoutThreshold:40,longTimeoutThreshold:70,reviewThreshold:100,shortTimeoutSeconds:600,longTimeoutSeconds:3600};

test('AutoMod signal library detects flooding, duplicate text, mass mentions, obfuscation and phishing',()=>{
  const {service}=make();const signals=service.detectMessageSignals({guildId:'g',userId:'u',content:'VERIFY your nitro gift https://bit.ly/login-verify '+('\u0301'.repeat(25)),mentionCount:9,attachmentCount:0,stickerCount:0,recentMessageCount:8,recentSameCount:2,recentAttachmentCount:0,trustedDomains:[]});
  const categories=new Set(signals.map(x=>x.category));for(const key of ['rapid_flood','duplicate_text','mass_mentions','url_shortener','suspected_phishing','unicode_obfuscation'])assert.ok(categories.has(key),key);
});

test('severe phishing creates behavior heat but quarantines because of rule context, not score alone',async()=>{
  const {service,repo}=make();const out=await service.evaluateMessage({guildId:'g',userId:'u',content:'claim https://evil.example/login/verify/nitro',mentionCount:0,attachmentCount:0,stickerCount:0,recentMessageCount:1,recentSameCount:0,recentAttachmentCount:0,trustedDomains:[]},heat);
  assert.equal(out.action,'QUARANTINE');assert.ok((out.heat?.score??0)>0);assert.equal(repo.events.at(-1).kind,'AUTOMOD_TRIGGER');
});

test('repeated similar violations increase heat faster and cross progressive discipline thresholds',async()=>{
  const {service}=make();let out;for(let i=0;i<4;i++)out=await service.evaluateMessage({guildId:'g',userId:'u',content:'SAME MESSAGE AGAIN',mentionCount:0,attachmentCount:0,stickerCount:0,recentMessageCount:5,recentSameCount:3,recentAttachmentCount:0},heat);
  assert.ok(out.heat.score>=heat.shortTimeoutThreshold);assert.ok(['TIMEOUT','REVIEW'].includes(out.action));if(out.action==='TIMEOUT')assert.ok(out.timeoutSeconds>=600);
});

test('behavior heat decays over time and staff adjustments are audited',async()=>{
  const {service,clock,sink}=make();await service.adjustHeat('g','u','admin',20,'manual correction');const before=await service.heat('g','u',heat);clock.advanceMs(72*3600_000);const after=await service.heat('g','u',heat);assert.ok(after.score<before.score);assert.ok(sink.events.some(x=>x.action==='security.heat_adjust'));await assert.rejects(()=>service.adjustHeat('g','u','admin',0,'bad'),e=>e instanceof DomainError&&e.code==='INVALID_HEAT_ADJUSTMENT');
});

test('Join Gate treats young accounts as a review signal, not an automatic violation, and rejects untrusted bots',async()=>{
  const {service}=make();const policy={enabled:true,verificationEnabled:true,minimumAccountAgeHours:72,joinVelocityPerMinute:10,restrictedModeAutoDeescalateMinutes:30,trustedBotIds:[]};
  const young=await service.joinGate({guildId:'g',userId:'u',createdAt:new Date('2026-09-21T17:00:00Z'),isBot:false,username:'normal-user',priorCaseCount:0,currentMode:'NORMAL'},policy);assert.equal(young.action,'FLAG');assert.equal(young.riskScore,25);
  const bot=await service.joinGate({guildId:'g',userId:'bot',createdAt:new Date('2026-01-01T00:00:00Z'),isBot:true,username:'helper',priorCaseCount:0,currentMode:'NORMAL'},policy);assert.equal(bot.action,'KICK');assert.equal(bot.riskScore,100);
});

test('Join Gate requires verification during Restricted mode and persists verification state',async()=>{
  const {service}=make();const policy={enabled:true,verificationEnabled:true,minimumAccountAgeHours:0,joinVelocityPerMinute:50,restrictedModeAutoDeescalateMinutes:30,trustedBotIds:[]};const d=await service.joinGate({guildId:'g',userId:'u',createdAt:new Date('2020-01-01T00:00:00Z'),isBot:false,username:'ordinary',priorCaseCount:0,currentMode:'RESTRICTED'},policy);assert.ok(['VERIFY','RESTRICT'].includes(d.action));assert.equal((await service.verification('g','u')).status,'REQUIRED');await service.verify('g','u');assert.equal((await service.verification('g','u')).status,'VERIFIED');
});

test('anti-raid escalates from join velocity and persisted security state auto-expires',async()=>{
  const {service,repo,clock}=make();for(let i=0;i<10;i++)await repo.createSecurityEvent({guildId:'g',userId:`u${i}`,kind:'MEMBER_JOIN',severity:1,now:clock.now()});const raid=await service.evaluateRaid('g',{enabled:true,joinVelocityPerMinute:10,autoDeescalateMinutes:30});assert.equal(raid.mode,'RESTRICTED');assert.equal((await service.state('g')).mode,'RESTRICTED');clock.advanceMs(31*60_000);assert.equal((await service.expireSecurityState('g')).mode,'NORMAL');
});

test('anti-nuke monitors trusted identities but raises containment after destructive bursts',async()=>{
  const {service}=make();const p={enabled:true,eventsPerMinute:3,lockdownEventsPerMinute:6,trustedUserIds:['trusted']};let d;for(let i=0;i<5;i++)d=await service.observePrivileged({guildId:'g',actorUserId:'trusted',kind:'CHANNEL_DELETE',severity:4},p);assert.equal(d.trusted,true);assert.ok(['CONTAIN','LOCKDOWN'].includes(d.action));
});

test('Panic Mode preserves previous mode in its snapshot and restores it on deactivation',async()=>{
  const {service,repo,sink}=make();await service.setMode('g','ALERT','pre-panic anomaly','anti_raid',30);const active=await service.activatePanic('g','owner','active raid',{channels:[{channelId:'c',sendMessages:'inherit'}]});assert.equal(active.mode,'LOCKDOWN');assert.equal(active.panicActive,true);assert.equal(active.snapshot.previousMode,'ALERT');const out=await service.deactivatePanic('g','owner');assert.equal(out.state.mode,'ALERT');assert.equal(out.state.panicActive,false);assert.equal(repo.expiryJobs.has('g'),false);assert.ok(sink.events.some(x=>x.action==='security.panic_activate'));assert.ok(sink.events.some(x=>x.action==='security.panic_deactivate'));
});
