import test from 'node:test';
import assert from 'node:assert/strict';
import {AuditService,DomainError,FixedClock,InMemoryAuditSink} from '../../.test-build/packages/core/src/index.js';
import {DEFAULT_AUTOMATED_ECONOMY_BOUNDS,DEFAULT_AUTOMATED_ECONOMY_POLICY,dailyCycle,evaluateEconomyPolicy,EconomyService,guardSystemReward,InMemoryEconomyRepository,majorPurchaseAffordability,reconcileEconomy,tier5Interest} from '../../.test-build/packages/features-economy/src/index.js';

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

test('member transfers are free and consume wallet before bank',async()=>{const {service}=make();await funded(service,'a',200n);await service.deposit({guildId:'g',userId:'a',amount:100n,idempotencyKey:'dep',tiers});const out=await service.transfer({guildId:'g',fromUserId:'a',toUserId:'b',amount:150n,idempotencyKey:'xfer'});assert.equal(out.status,'applied');assert.equal(out.from.wallet,0n);assert.equal(out.from.bank,50n);assert.equal(out.to.wallet,150n);});

test('duplicate transfer idempotency does not move money twice',async()=>{const {service}=make();await funded(service,'a',200n);const input={guildId:'g',fromUserId:'a',toUserId:'b',amount:40n,idempotencyKey:'same'};assert.equal((await service.transfer(input)).status,'applied');assert.equal((await service.transfer(input)).status,'duplicate');assert.equal((await service.account('g','a')).wallet,160n);assert.equal((await service.account('g','b')).wallet,40n);});

test('insufficient transfer preserves both accounts',async()=>{const {service}=make();await funded(service,'a',20n);await assert.rejects(()=>service.transfer({guildId:'g',fromUserId:'a',toUserId:'b',amount:21n,idempotencyKey:'nope'}),e=>e instanceof DomainError&&e.code==='INSUFFICIENT_FUNDS');assert.equal((await service.account('g','a')).wallet,20n);assert.equal((await service.account('g','b')).wallet,0n);});

test('bank capacity is enforced and upgrade requires a full current tier',async()=>{const {service}=make();await funded(service,'u',200n);await service.deposit({guildId:'g',userId:'u',amount:90n,idempotencyKey:'d1',tiers});await assert.rejects(()=>service.deposit({guildId:'g',userId:'u',amount:20n,idempotencyKey:'d2',tiers}),e=>e instanceof DomainError&&e.code==='BANK_CAP');await assert.rejects(()=>service.upgradeBank({guildId:'g',userId:'u',idempotencyKey:'up0',tiers}),e=>e instanceof DomainError&&e.code==='BANK_NOT_FULL');await service.deposit({guildId:'g',userId:'u',amount:10n,idempotencyKey:'d3',tiers});const upgraded=await service.upgradeBank({guildId:'g',userId:'u',idempotencyKey:'up1',tiers});assert.equal(upgraded.bankTier,2);assert.equal(upgraded.wallet+upgraded.bank,150n);});

test('daily claim increments consecutive streak and resets after a missed cycle',async()=>{const {service,clock}=make('2026-09-21T12:00:00Z');let r=await service.claimDaily({guildId:'g',userId:'u',idempotencyKey:'d1',baseReward:100n,milestones:{2:25n}});assert.equal(r.streak,1);clock.advanceMs(24*3600_000);r=await service.claimDaily({guildId:'g',userId:'u',idempotencyKey:'d2',baseReward:100n,milestones:{2:25n}});assert.equal(r.streak,2);assert.equal(r.reward,125n);clock.advanceMs(48*3600_000);r=await service.claimDaily({guildId:'g',userId:'u',idempotencyKey:'d3',baseReward:100n,milestones:{2:25n}});assert.equal(r.streak,1);});

test('daily and weekly rewards select a persisted amount within their configured ranges',async()=>{const {service}=make('2026-09-21T12:00:00Z',[0.999]);const daily=await service.claimDaily({guildId:'g',userId:'u',idempotencyKey:'daily-range',minReward:200n,maxReward:300n,milestones:{}});assert.equal(daily.reward,300n);const replay=await service.claimDaily({guildId:'g',userId:'u',idempotencyKey:'daily-range',minReward:200n,maxReward:300n,milestones:{}});assert.notEqual(replay.status,'applied');const weekly=await service.weekly({guildId:'g',userId:'u',idempotencyKey:'weekly-range',minReward:1000n,maxReward:1500n});assert.equal(weekly.reward,1500n);const ledger=await service.statement('g','u');assert.equal(ledger.entries.filter(entry=>entry.reason==='Daily claim')[0]?.metadata?.base,'300');assert.equal(ledger.entries.filter(entry=>entry.reason==='Weekly claim')[0]?.metadata?.reward,'1500');});

test('daily claim, spin, and fortune are independent one-use actions in the same cycle',async()=>{const {service}=make();const d=await service.claimDaily({guildId:'g',userId:'u',idempotencyKey:'d',baseReward:10n,milestones:{}});const s=await service.spinDaily({guildId:'g',userId:'u',idempotencyKey:'s',table:[{kind:'ottomans',weight:1,amount:20n}]});const f=await service.fortuneDaily({guildId:'g',userId:'u',idempotencyKey:'f'});assert.equal(d.status,'applied');assert.equal(s.status,'applied');assert.equal(f.status,'applied');assert.equal((await service.dailyHub('g','u')).dailyReady,false);assert.equal((await service.dailyHub('g','u')).spinReady,false);assert.equal((await service.dailyHub('g','u')).fortuneReady,false);assert.equal((await service.spinDaily({guildId:'g',userId:'u',idempotencyKey:'s2',table:[{kind:'ottomans',weight:1,amount:20n}]})).status,'already_used');});

test('4 AM Mountain daily boundary follows daylight-saving offset',()=>{const before=dailyCycle(new Date('2026-07-01T09:59:59Z'));const after=dailyCycle(new Date('2026-07-01T10:00:01Z'));assert.equal(before.key,'2026-06-30');assert.equal(after.key,'2026-07-01');assert.equal(after.start.toISOString(),'2026-07-01T10:00:00.000Z');const winter=dailyCycle(new Date('2026-01-15T11:00:01Z'));assert.equal(winter.start.toISOString(),'2026-01-15T11:00:00.000Z');});

test('weekly reward is claimable only once per weekly cycle',async()=>{const {service}=make('2026-09-21T18:00:00Z');const one=await service.weekly({guildId:'g',userId:'u',idempotencyKey:'w1',reward:500n});const two=await service.weekly({guildId:'g',userId:'u',idempotencyKey:'w2',reward:500n});assert.equal(one.status,'applied');assert.equal(two.status,'already_used');assert.equal((await service.account('g','u')).wallet,500n);});

test('grind technical throttle blocks immediate repeats without acting as a gameplay cooldown',async()=>{const {service,clock}=make();const policy={technicalThrottleMs:1000,outcomes:[{outcome:'win',weight:1,minOttomans:10n,maxOttomans:10n}]};const one=await service.grind({guildId:'g',userId:'u',activity:'work',idempotencyKey:'g1',policy});const two=await service.grind({guildId:'g',userId:'u',activity:'work',idempotencyKey:'g2',policy});assert.equal(one.status,'applied');assert.equal(two.status,'throttled');clock.advanceMs(1001);assert.equal((await service.grind({guildId:'g',userId:'u',activity:'work',idempotencyKey:'g3',policy})).status,'applied');});

test('fish, dig and scavenge require the matching equipped usable tool',async()=>{const {service}=make();const policy={technicalThrottleMs:1000,outcomes:[{outcome:'win',weight:1,minOttomans:1n,maxOttomans:1n}]};for(const activity of ['fish','dig','scavenge'])await assert.rejects(()=>service.grind({guildId:'g',userId:'u',activity,idempotencyKey:`${activity}-1`,policy}),e=>e instanceof DomainError&&e.code==='TOOL_REQUIRED');});

test('breaking an equipped tool auto-equips the best usable fallback',async()=>{const {service,repo}=make();repo.seedTool({id:'rod-a',guildId:'g',userId:'u',catalogItemId:'rod',slot:'fishing_rod',durability:1,maxDurability:10,equipped:true});repo.seedTool({id:'rod-b',guildId:'g',userId:'u',catalogItemId:'rod2',slot:'fishing_rod',durability:8,maxDurability:20,equipped:false});const out=await service.grind({guildId:'g',userId:'u',activity:'fish',idempotencyKey:'fish-break',policy:{technicalThrottleMs:1000,outcomes:[{outcome:'tool_damage',weight:1,toolDamage:1}]}});assert.equal(out.tool?.durability,0);assert.equal(out.tool?.equipped,false);assert.equal(out.fallbackTool?.id,'rod-b');assert.equal(out.fallbackTool?.equipped,true);});



test('/work rejects item-drop configuration even when an owner edits the grind table',async()=>{const {service}=make();await assert.rejects(()=>service.grind({guildId:'g',userId:'u',activity:'work',idempotencyKey:'bad-work',policy:{technicalThrottleMs:1000,outcomes:[{outcome:'item',weight:1,itemId:'loot',quantity:1}]}}),e=>e instanceof DomainError&&e.code==='INVALID_WORK_REWARD');});
test('Tier 5 bank interest is idempotent per member and cycle',async()=>{const {service,repo}=make();repo.accounts.set('g:u',{guildId:'g',userId:'u',wallet:0n,bank:10_000n,bankTier:5,version:0,starterGrantedAt:new Date()});const first=await service.applyTier5Interest({guildId:'g',cycleKey:'2026-09-21',interestBps:100,maxPerMember:1_000n});const second=await service.applyTier5Interest({guildId:'g',cycleKey:'2026-09-21',interestBps:100,maxPerMember:1_000n});assert.equal(first.credited,100n);assert.equal(second.duplicates,1);assert.equal((await service.account('g','u')).bank,10_100n);});

test('automated economy freezes adjustments for invalid reconciliation, anomalies, and small samples',()=>{
  for(const measurement of [
    {eligibleMembers:15,rawMedianWealth:40_000n,reconciliationValid:false,abnormalActivity:false},
    {eligibleMembers:15,rawMedianWealth:40_000n,reconciliationValid:true,abnormalActivity:true},
    {eligibleMembers:14,rawMedianWealth:40_000n,reconciliationValid:true,abnormalActivity:false},
  ])assert.equal(evaluateEconomyPolicy(DEFAULT_AUTOMATED_ECONOMY_POLICY,DEFAULT_AUTOMATED_ECONOMY_BOUNDS,measurement).frozen,true);
});

test('automated economy shadows bounded affordability proposals without changing active values',()=>{
  const result=evaluateEconomyPolicy(DEFAULT_AUTOMATED_ECONOMY_POLICY,DEFAULT_AUTOMATED_ECONOMY_BOUNDS,{eligibleMembers:15,rawMedianWealth:40_000n,reconciliationValid:true,abnormalActivity:false,purchaseAffordabilityBps:1_000n},true);
  assert.equal(result.frozen,false);assert.equal(result.adjustments.length,2);
  assert.ok(result.adjustments.every(change=>change.applied===change.previous));
  assert.ok(result.adjustments.every(change=>change.proposed>=change.previous));
});

test('Tier 5 EAJ 1.1 interest is capped by the stable wealth benchmark',()=>{
  assert.equal(tier5Interest(40_000n,100n,40_000n),400n);
  assert.equal(tier5Interest(500_000n,100n,40_000n),1_000n);
});

test('major-purchase affordability reports immediate access and earning time independently of spending',()=>{
  const metric=majorPurchaseAffordability({qualifyingMembers:20,membersAbleToBuy:3,majorPurchaseCost:16_000n,medianActiveWealth:10_000n,typicalDailyEarnings:1_000n});
  assert.equal(metric.immediatelyAffordableBps,1500n);assert.equal(metric.medianDaysToAfford,6n);
});

test('economy reconciliation counts active member escrow and communal pots exactly once',()=>{
  const result=reconcileEconomy({accounts:[{userId:'a',wallet:100n,bank:900n},{userId:'b',wallet:50n,bank:0n}],escrow:[{ownerUserId:'a',amount:40n,state:'ACTIVE'},{ownerUserId:'b',amount:10n,state:'SETTLED'}],pots:[{key:'chair-pot',amount:25n}]});
  assert.equal(result.memberEscrow,40n);assert.equal(result.memberWealth.get('a'),1040n);assert.equal(result.totalSupply,1115n);
});
