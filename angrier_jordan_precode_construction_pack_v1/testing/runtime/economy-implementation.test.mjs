import test from 'node:test';
import assert from 'node:assert/strict';
import {AuditService,DomainError,FixedClock,InMemoryAuditSink} from '../../.test-build/packages/core/src/index.js';
import {cappedActivityPayout,DEFAULT_AUTOMATED_ECONOMY_BOUNDS,DEFAULT_AUTOMATED_ECONOMY_POLICY,dailyCycle,evaluateEconomyPolicy,EconomyService,guardSystemReward,InMemoryEconomyRepository,majorPurchaseAffordability,materializePolicy,nextEconomySnapshot,qualifiedActiveMemberIds,reconcileEconomy,shadowReady,smoothedBenchmark,supplyReconciles,tier5Interest,voicePayoutBand} from '../../.test-build/packages/features-economy/src/index.js';

class SequenceRandom { constructor(values=[0]){this.values=[...values];this.i=0;} next(){return this.values[this.i++%this.values.length]??0;} }
const tiers=[
  {tier:1,cap:100n,upgradeCost:50n},
  {tier:2,cap:500n,upgradeCost:200n},
  {tier:3,cap:2_000n,upgradeCost:500n},
  {tier:4,cap:10_000n,upgradeCost:2_000n},
  {tier:5,cap:null,upgradeCost:0n},
];
const make=(at='2026-09-21T18:00:00Z',random=[0])=>{const clock=new FixedClock(new Date(at));const repo=new InMemoryEconomyRepository([{id:'loot',type:'sellable',name:'Loot',rarity:'common',giftable:true,enabled:true}]);const audit=new AuditService(new InMemoryAuditSink());const service=new EconomyService(repo,audit,clock,new SequenceRandom(random),[{id:'f1',text:'The chair knows.'}]);return{clock,repo,service};};

test('reward guardrail stays inert until enabled and then reduces or caps future rewards',()=>{
  const off={enabled:false,multiplierBps:2_500,maxSingleReward:100n};
  assert.equal(guardSystemReward(1_000n,off),1_000n);
  assert.equal(guardSystemReward(1_000n,{...off,enabled:true}),100n);
  assert.equal(guardSystemReward(80n,{...off,enabled:true}),20n);
});

async function funded(service,user='u',amount=1_000n){await service.bootstrap('g',user,amount,`seed-${user}`);return service.account('g',user);}

test('starter balance is granted once even when bootstrap uses a new request key',async()=>{const {service}=make();const a=await service.bootstrap('g','u',500n,'one');const b=await service.bootstrap('g','u',500n,'two');assert.equal(a.status,'applied');assert.equal(b.status,'existing');assert.equal((await service.account('g','u')).wallet,500n);});
test('benchmark starter package grants four durable tools and one repair voucher only once',async()=>{const {service,repo}=make();await service.bootstrap('g','u',500n,'one');assert.equal([...repo.tools.values()].filter(tool=>tool.guildId==='g'&&tool.userId==='u').length,4);assert.equal((await repo.listInventory('g','u')).find(row=>row.itemId==='consumable.starter_repair_voucher')?.quantity,1);await service.bootstrap('g','u',500n,'two');assert.equal([...repo.tools.values()].filter(tool=>tool.guildId==='g'&&tool.userId==='u').length,4);});

test('benchmark starter onboarding defers without breaking a new server, then grants from the first snapshot',async()=>{const {service,repo}=make();const deferred=await service.bootstrapFromBenchmark('g','u','join');assert.equal(deferred.status,'deferred');assert.equal(deferred.account.wallet,0n);repo.snapshots.set('g:2026-09-21',{guildId:'g',cycleKey:'2026-09-21',totalSupply:1n,eligibleMemberCount:20,metrics:{rawMedianWealth:'40000'}});const granted=await service.bootstrapFromBenchmark('g','u','command');assert.equal(granted.status,'applied');assert.equal(granted.account.wallet,1000n);});

test('member transfers are free and consume wallet before bank',async()=>{const {service}=make();await funded(service,'a',200n);await service.deposit({guildId:'g',userId:'a',amount:100n,idempotencyKey:'dep',tiers});const out=await service.transfer({guildId:'g',fromUserId:'a',toUserId:'b',amount:150n,idempotencyKey:'xfer'});assert.equal(out.status,'applied');assert.equal(out.from.wallet,0n);assert.equal(out.from.bank,50n);assert.equal(out.to.wallet,150n);});

test('duplicate transfer idempotency does not move money twice',async()=>{const {service}=make();await funded(service,'a',200n);const input={guildId:'g',fromUserId:'a',toUserId:'b',amount:40n,idempotencyKey:'same'};assert.equal((await service.transfer(input)).status,'applied');assert.equal((await service.transfer(input)).status,'duplicate');assert.equal((await service.account('g','a')).wallet,160n);assert.equal((await service.account('g','b')).wallet,40n);});

test('insufficient transfer preserves both accounts',async()=>{const {service}=make();await funded(service,'a',20n);await assert.rejects(()=>service.transfer({guildId:'g',fromUserId:'a',toUserId:'b',amount:21n,idempotencyKey:'nope'}),e=>e instanceof DomainError&&e.code==='INSUFFICIENT_FUNDS');assert.equal((await service.account('g','a')).wallet,20n);assert.equal((await service.account('g','b')).wallet,0n);});

test('bank capacity is enforced and upgrade requires a full current tier',async()=>{const {service}=make();await funded(service,'u',200n);await service.deposit({guildId:'g',userId:'u',amount:90n,idempotencyKey:'d1',tiers});await assert.rejects(()=>service.deposit({guildId:'g',userId:'u',amount:20n,idempotencyKey:'d2',tiers}),e=>e instanceof DomainError&&e.code==='BANK_CAP');await assert.rejects(()=>service.upgradeBank({guildId:'g',userId:'u',idempotencyKey:'up0',tiers}),e=>e instanceof DomainError&&e.code==='BANK_NOT_FULL');await service.deposit({guildId:'g',userId:'u',amount:10n,idempotencyKey:'d3',tiers});const upgraded=await service.upgradeBank({guildId:'g',userId:'u',idempotencyKey:'up1',tiers});assert.equal(upgraded.bankTier,2);assert.equal(upgraded.wallet+upgraded.bank,150n);});

test('daily claim increments consecutive streak and resets after a missed cycle',async()=>{const {service,clock}=make('2026-09-21T12:00:00Z');let r=await service.claimDaily({guildId:'g',userId:'u',idempotencyKey:'d1',baseReward:100n,milestones:{2:25n}});assert.equal(r.streak,1);clock.advanceMs(24*3600_000);r=await service.claimDaily({guildId:'g',userId:'u',idempotencyKey:'d2',baseReward:100n,milestones:{2:25n}});assert.equal(r.streak,2);assert.equal(r.reward,125n);clock.advanceMs(48*3600_000);r=await service.claimDaily({guildId:'g',userId:'u',idempotencyKey:'d3',baseReward:100n,milestones:{2:25n}});assert.equal(r.streak,1);});

test('large streak milestones settle as seven durable, retry-safe daily installments',async()=>{const {service,repo,clock}=make('2026-09-21T12:00:00Z');await service.claimDaily({guildId:'g',userId:'u',idempotencyKey:'s1',baseReward:100n,milestones:{}});clock.advanceMs(24*3600_000);const claim=await service.claimDaily({guildId:'g',userId:'u',idempotencyKey:'s2',baseReward:100n,milestones:{2:2500n}});assert.equal(claim.reward,100n);assert.deepEqual(claim.installment,{total:2500n,paid:0n,remaining:2500n,count:7});const id=[...repo.streakInstallments.keys()][0];assert.ok(id);const first=await service.settleStreakInstallment(id);assert.equal(first?.paidAmount,358n);assert.equal(first?.installmentsPaid,1);const retry=await service.settleStreakInstallment(id);assert.equal(retry?.paidAmount,358n);assert.equal((await service.account('g','u')).wallet,558n);for(let i=0;i<6;i++){clock.advanceMs(24*3600_000);await service.settleStreakInstallment(id);}const done=await repo.getStreakInstallment(id);assert.equal(done?.state,'PAID');assert.equal(done?.paidAmount,2500n);assert.equal((await service.account('g','u')).wallet,2700n);});

test('daily and weekly rewards select a persisted amount within their configured ranges',async()=>{const {service}=make('2026-09-21T12:00:00Z',[0.999]);const daily=await service.claimDaily({guildId:'g',userId:'u',idempotencyKey:'daily-range',minReward:200n,maxReward:300n,milestones:{}});assert.equal(daily.reward,300n);const replay=await service.claimDaily({guildId:'g',userId:'u',idempotencyKey:'daily-range',minReward:200n,maxReward:300n,milestones:{}});assert.notEqual(replay.status,'applied');const weekly=await service.weekly({guildId:'g',userId:'u',idempotencyKey:'weekly-range',minReward:1000n,maxReward:1500n});assert.equal(weekly.reward,1500n);const ledger=await service.statement('g','u');assert.equal(ledger.entries.filter(entry=>entry.reason==='Daily claim')[0]?.metadata?.base,'300');assert.equal(ledger.entries.filter(entry=>entry.reason==='Weekly claim')[0]?.metadata?.reward,'1500');});

test('qualified chat awards are throttle-, cap-, and retry-safe with the sampled amount stored in the ledger',async()=>{const {service,clock}=make('2026-09-21T12:00:00Z',[0.999]);const first=await service.awardQualifiedChat({guildId:'g',userId:'u',idempotencyKey:'chat-1',dailyCap:21n,minReward:20n,maxReward:25n});const throttled=await service.awardQualifiedChat({guildId:'g',userId:'u',idempotencyKey:'chat-window',dailyCap:21n,minReward:20n,maxReward:25n});const replay=await service.awardQualifiedChat({guildId:'g',userId:'u',idempotencyKey:'chat-1',dailyCap:21n,minReward:20n,maxReward:25n});clock.advanceMs(300_000);const next=await service.awardQualifiedChat({guildId:'g',userId:'u',idempotencyKey:'chat-2',dailyCap:21n,minReward:20n,maxReward:25n});assert.equal(first.reward,21n);assert.equal(throttled.status,'throttled');assert.equal(replay.status,'duplicate');assert.equal(next.status,'capped');assert.equal((await service.account('g','u')).wallet,21n);const ledger=await service.statement('g','u');assert.equal(ledger.entries[0]?.metadata?.sampled,'25');});

test('voice earnings settle two qualifying hours at full rate, then one at half, then stop',async()=>{const {service}=make('2026-09-21T12:00:00Z',[0]);const first=await service.awardQualifiedVoice({guildId:'g',userId:'u',idempotencyKey:'voice-1',qualifiedSeconds:10_800,dailyCap:1_000n,fullRange:[100n,100n],halfRange:[50n,50n]});const later=await service.awardQualifiedVoice({guildId:'g',userId:'u',idempotencyKey:'voice-2',qualifiedSeconds:3_600,dailyCap:1_000n,fullRange:[100n,100n],halfRange:[50n,50n]});assert.equal(first.reward,250n);assert.equal(later.status,'capped');assert.equal((await service.account('g','u')).wallet,250n);});

test('daily claim, spin, and fortune are independent one-use actions in the same cycle',async()=>{const {service}=make();const d=await service.claimDaily({guildId:'g',userId:'u',idempotencyKey:'d',baseReward:10n,milestones:{}});const s=await service.spinDaily({guildId:'g',userId:'u',idempotencyKey:'s',table:[{kind:'ottomans',weight:1,amount:20n}]});const f=await service.fortuneDaily({guildId:'g',userId:'u',idempotencyKey:'f'});assert.equal(d.status,'applied');assert.equal(s.status,'applied');assert.equal(f.status,'applied');assert.equal((await service.dailyHub('g','u')).dailyReady,false);assert.equal((await service.dailyHub('g','u')).spinReady,false);assert.equal((await service.dailyHub('g','u')).fortuneReady,false);assert.equal((await service.spinDaily({guildId:'g',userId:'u',idempotencyKey:'s2',table:[{kind:'ottomans',weight:1,amount:20n}]})).status,'already_used');});

test('4 AM Mountain daily boundary follows daylight-saving offset',()=>{const before=dailyCycle(new Date('2026-07-01T09:59:59Z'));const after=dailyCycle(new Date('2026-07-01T10:00:01Z'));assert.equal(before.key,'2026-06-30');assert.equal(after.key,'2026-07-01');assert.equal(after.start.toISOString(),'2026-07-01T10:00:00.000Z');const winter=dailyCycle(new Date('2026-01-15T11:00:01Z'));assert.equal(winter.start.toISOString(),'2026-01-15T11:00:00.000Z');});
test('economy snapshots schedule at the next 4 AM Mountain boundary through DST',()=>{assert.equal(nextEconomySnapshot(new Date('2026-07-01T09:59:59Z')).toISOString(),'2026-07-01T10:00:00.000Z');assert.equal(nextEconomySnapshot(new Date('2026-01-15T11:00:01Z')).toISOString(),'2026-01-16T11:00:00.000Z');});
test('startup scheduling persists daily snapshots and Monday shadow-policy publication independently',async()=>{const {service,repo}=make('2026-09-21T18:00:00Z');await service.scheduleNextEconomySnapshot('g');await service.scheduleNextEconomyPolicy('g');assert.ok(repo.scheduledJobs.get('snapshot:g'));assert.ok(repo.scheduledJobs.get('policy:g'));assert.equal(repo.scheduledJobs.get('policy:g')?.dueAt.toISOString(),'2026-09-28T10:00:00.000Z');});

test('weekly reward is claimable only once per weekly cycle',async()=>{const {service}=make('2026-09-21T18:00:00Z');const one=await service.weekly({guildId:'g',userId:'u',idempotencyKey:'w1',reward:500n});const two=await service.weekly({guildId:'g',userId:'u',idempotencyKey:'w2',reward:500n});assert.equal(one.status,'applied');assert.equal(two.status,'already_used');assert.equal((await service.account('g','u')).wallet,500n);});

test('grind technical throttle blocks immediate repeats without acting as a gameplay cooldown',async()=>{const {service,clock}=make();const policy={technicalThrottleMs:1000,outcomes:[{outcome:'win',weight:1,minOttomans:10n,maxOttomans:10n}]};const one=await service.grind({guildId:'g',userId:'u',activity:'work',idempotencyKey:'g1',policy});const two=await service.grind({guildId:'g',userId:'u',activity:'work',idempotencyKey:'g2',policy});assert.equal(one.status,'applied');assert.equal(two.status,'throttled');clock.advanceMs(1001);assert.equal((await service.grind({guildId:'g',userId:'u',activity:'work',idempotencyKey:'g3',policy})).status,'applied');});

test('fish, dig and scavenge require the matching equipped usable tool',async()=>{const {service}=make();const policy={technicalThrottleMs:1000,outcomes:[{outcome:'win',weight:1,minOttomans:1n,maxOttomans:1n}]};for(const activity of ['fish','dig','scavenge'])await assert.rejects(()=>service.grind({guildId:'g',userId:'u',activity,idempotencyKey:`${activity}-1`,policy}),e=>e instanceof DomainError&&e.code==='TOOL_REQUIRED');});

test('breaking an equipped tool auto-equips the best usable fallback',async()=>{const {service,repo}=make();repo.seedTool({id:'rod-a',guildId:'g',userId:'u',catalogItemId:'rod',slot:'fishing_rod',durability:1,maxDurability:10,equipped:true});repo.seedTool({id:'rod-b',guildId:'g',userId:'u',catalogItemId:'rod2',slot:'fishing_rod',durability:8,maxDurability:20,equipped:false});const out=await service.grind({guildId:'g',userId:'u',activity:'fish',idempotencyKey:'fish-break',policy:{technicalThrottleMs:1000,outcomes:[{outcome:'tool_damage',weight:1,toolDamage:1}]}});assert.equal(out.tool?.durability,0);assert.equal(out.tool?.equipped,false);assert.equal(out.fallbackTool?.id,'rod-b');assert.equal(out.fallbackTool?.equipped,true);});



test('/work rejects item-drop configuration even when an owner edits the grind table',async()=>{const {service}=make();await assert.rejects(()=>service.grind({guildId:'g',userId:'u',activity:'work',idempotencyKey:'bad-work',policy:{technicalThrottleMs:1000,outcomes:[{outcome:'item',weight:1,itemId:'loot',quantity:1}]}}),e=>e instanceof DomainError&&e.code==='INVALID_WORK_REWARD');});
test('Tier 5 bank interest locks the benchmark-scaled cap and is idempotent per member and cycle',async()=>{const {service,repo}=make();repo.accounts.set('g:u',{guildId:'g',userId:'u',wallet:0n,bank:500_000n,bankTier:5,version:0,starterGrantedAt:new Date()});repo.snapshots.set('g:2026-09-20',{guildId:'g',cycleKey:'2026-09-20',totalSupply:1_000_000n,eligibleMemberCount:20,metrics:{rawMedianWealth:'40000'}});const first=await service.applyTier5Interest({guildId:'g',cycleKey:'2026-09-21',interestBps:100,maxPerMember:1_000n});const second=await service.applyTier5Interest({guildId:'g',cycleKey:'2026-09-21',interestBps:150,maxPerMember:1_000_000n});assert.equal(first.credited,1_000n);assert.equal(second.duplicates,1);assert.equal(repo.bankInterestTerms.get('g:2026-09-21')?.rateBps,100);assert.equal((await service.account('g','u')).bank,501_000n);});

test('automated economy freezes adjustments for invalid reconciliation, anomalies, and small samples',()=>{
  for(const measurement of [
    {eligibleMembers:15,rawMedianWealth:40_000n,reconciliationValid:false,abnormalActivity:false},
    {eligibleMembers:15,rawMedianWealth:40_000n,reconciliationValid:true,abnormalActivity:true},
    {eligibleMembers:14,rawMedianWealth:40_000n,reconciliationValid:true,abnormalActivity:false},
  ])assert.equal(evaluateEconomyPolicy(DEFAULT_AUTOMATED_ECONOMY_POLICY,DEFAULT_AUTOMATED_ECONOMY_BOUNDS,measurement).frozen,true);
});

test('automated economy shadows bounded affordability proposals without changing active values',()=>{
  const result=evaluateEconomyPolicy(DEFAULT_AUTOMATED_ECONOMY_POLICY,DEFAULT_AUTOMATED_ECONOMY_BOUNDS,{eligibleMembers:15,rawMedianWealth:40_000n,reconciliationValid:true,abnormalActivity:false,purchaseAffordabilityBps:1_000n},true);
  assert.equal(result.frozen,false);assert.equal(result.adjustments.length,4);
  assert.ok(result.adjustments.every(change=>change.applied===change.previous));
  assert.ok(result.adjustments.some(change=>change.key==='shopPriceMultiplierBps'&&change.proposed<change.previous));
});
test('composite controller uses participation, item utility, concentration, issuance, and gambling without changing shadow payouts',()=>{const result=evaluateEconomyPolicy(DEFAULT_AUTOMATED_ECONOMY_POLICY,DEFAULT_AUTOMATED_ECONOMY_BOUNDS,{eligibleMembers:20,rawMedianWealth:40_000n,reconciliationValid:true,abnormalActivity:false,purchaseFrequencyBps:100n,itemUtilityBps:2_000n,topFiveConcentrationBps:7_000n,wealthP90:250_000n,recurringNetIssuance:9_000n,gamblingExposureBps:5_500n},true);assert.equal(result.frozen,false);assert.ok(result.adjustments.some(change=>change.key==='starterPercentBps'));assert.ok(result.adjustments.some(change=>change.key==='maximumWagerBenchmarkBps'));assert.ok(result.adjustments.every(change=>change.applied===change.previous));});
test('materialized policy uses the same bounds as shadow proposals',()=>{const shadow=evaluateEconomyPolicy(DEFAULT_AUTOMATED_ECONOMY_POLICY,DEFAULT_AUTOMATED_ECONOMY_BOUNDS,{eligibleMembers:20,rawMedianWealth:40_000n,reconciliationValid:true,abnormalActivity:false,purchaseAffordabilityBps:100n},true),active=materializePolicy(DEFAULT_AUTOMATED_ECONOMY_POLICY,DEFAULT_AUTOMATED_ECONOMY_BOUNDS,shadow.adjustments);assert.equal(active.dailyClaim,262n);assert.equal(active.weeklyClaim,1312n);assert.equal(active.shopPriceMultiplierBps,9500n);assert.equal(active.lotteryTicketBenchmarkBps,24n);});

test('Tier 5 EAJ 1.1 interest is capped by the stable wealth benchmark',()=>{
  assert.equal(tier5Interest(40_000n,100n,40_000n),400n);
  assert.equal(tier5Interest(500_000n,100n,40_000n),1_000n);
});

test('major-purchase affordability reports immediate access and earning time independently of spending',()=>{
  const metric=majorPurchaseAffordability({qualifyingMembers:20,membersAbleToBuy:3,majorPurchaseCost:16_000n,medianActiveWealth:10_000n,typicalDailyEarnings:1_000n});
  assert.equal(metric.immediatelyAffordableBps,1500n);assert.equal(metric.medianDaysToAfford,6n);
});
test('shadow controller requires seven valid observations and uses a seven-day benchmark',()=>{const rows=[10n,20n,30n,40n,50n,60n,70n];assert.equal(smoothedBenchmark(rows),40n);assert.equal(shadowReady(rows.map(benchmark=>({benchmark,reconciliationValid:true,abnormalActivity:false}))),true);assert.equal(shadowReady(rows.slice(1).map(benchmark=>({benchmark,reconciliationValid:true,abnormalActivity:false}))),false);});

test('active benchmark excludes bots, new members, spending, and thin activity',()=>{
  const now=new Date('2026-10-05T10:00:00Z'),old=new Date('2026-09-20T10:00:00Z');
  const members=[{userId:'human',joinedAt:old},{userId:'bot',joinedAt:old,isBot:true},{userId:'new',joinedAt:new Date('2026-10-01T10:00:00Z')},{userId:'thin',joinedAt:old}];
  const observations=[
    ...[1,2,3].map(i=>({userId:'human',occurredAt:new Date(now.getTime()-i*86_400_000),kind:'chat'})),
    ...[1,2,3].map(i=>({userId:'bot',occurredAt:new Date(now.getTime()-i*86_400_000),kind:'voice'})),
    ...[1,2,3].map(i=>({userId:'new',occurredAt:new Date(now.getTime()-i*86_400_000),kind:'command'})),
    {userId:'thin',occurredAt:old,kind:'chat'},
    ...[1,2,3,4].map(i=>({userId:'thin',occurredAt:new Date(now.getTime()-i*86_400_000),kind:'spending'})),
  ];
  assert.deepEqual([...qualifiedActiveMemberIds(members,observations,now)],['human']);
});

test('activity reward caps and voice bands preserve the two-full-one-half-hour policy',()=>{
  assert.equal(cappedActivityPayout(25n,290n,300n),10n);assert.equal(cappedActivityPayout(20n,300n,300n),0n);
  assert.equal(voicePayoutBand(0),'full');assert.equal(voicePayoutBand(7_199),'full');assert.equal(voicePayoutBand(7_200),'half');assert.equal(voicePayoutBand(10_799),'half');assert.equal(voicePayoutBand(10_800),'none');
});

test('economy reconciliation counts active member escrow and communal pots exactly once',()=>{
  const result=reconcileEconomy({accounts:[{userId:'a',wallet:100n,reservedWallet:40n,bank:900n},{userId:'b',wallet:50n,bank:0n}],escrow:[{ownerUserId:'a',amount:40n,state:'ACTIVE'},{ownerUserId:'b',amount:10n,state:'SETTLED'}],pots:[{key:'chair-pot',amount:25n}]});
  assert.equal(result.memberEscrow,40n);assert.equal(result.memberWealth.get('a'),1000n);assert.equal(result.totalSupply,1075n);
});
test('snapshot supply reconciliation compares prior supply with only completed-interval system issuance',()=>{assert.equal(supplyReconciles(undefined,100n,0n),true);assert.equal(supplyReconciles(100n,125n,25n),true);assert.equal(supplyReconciles(100n,124n,25n),false);});

test('daily snapshot capture is idempotent and queues the next Mountain boundary',async()=>{const {service,repo}=make('2026-07-01T09:59:59Z');await service.bootstrap('g','u',100n,'seed');const first=await service.captureEconomySnapshot('g','2026-06-30'),second=await service.captureEconomySnapshot('g','2026-06-30');assert.equal(first.totalSupply,100n);assert.deepEqual(second,first);assert.equal(repo.scheduledJobs.get('snapshot:g')?.dueAt.toISOString(),'2026-07-01T10:00:00.000Z');});

test('weekly policy job persists one replay-safe frozen shadow proposal until seven valid snapshots exist',async()=>{
  const {service,repo}=make();
  for(let day=1;day<=6;day++)repo.snapshots.set(`g:2026-09-0${day}`,{guildId:'g',cycleKey:`2026-09-0${day}`,totalSupply:10_000n,eligibleMemberCount:20,metrics:{rawMedianWealth:'500'}});
  const first=await service.publishShadowEconomyPolicy('g','2026-09-07'),second=await service.publishShadowEconomyPolicy('g','2026-09-07');
  assert.equal(first.frozen,true);assert.equal(second.frozen,true);assert.equal(repo.policyProposals.length,1);assert.ok(repo.policyProposals[0].reason);
});

test('active policy requires seven valid snapshots and changes only the persisted bounded term',async()=>{const {service,repo}=make();await repo.saveEconomyPolicyProposal({guildId:'g',cycleKey:'2026-09-07',frozen:false,policy:Object.fromEntries(Object.entries(DEFAULT_AUTOMATED_ECONOMY_POLICY).map(([key,value])=>[key,value.toString()])),bounds:{},adjustments:[]});const adjustment={key:'dailyClaim',previous:250n,proposed:300n,applied:250n,reason:'simulation'};assert.equal(await service.activateShadowPolicy('g','2026-09-07',[adjustment],true),false);for(let day=1;day<=7;day++)repo.snapshots.set(`g:2026-09-0${day}`,{guildId:'g',cycleKey:`2026-09-0${day}`,totalSupply:10_000n,eligibleMemberCount:20,metrics:{rawMedianWealth:'500'}});assert.equal(await service.activateShadowPolicy('g','2026-09-07',[adjustment],true),true);assert.equal((await service.runtimePolicy('g',true)).dailyClaim,262n);assert.equal((await service.runtimePolicy('g',false)).dailyClaim,250n);});
