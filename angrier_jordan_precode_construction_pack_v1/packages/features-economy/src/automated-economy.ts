/**
 * Deterministic policy primitives for the EAJ 1.1 economy engine.  This module
 * deliberately has no Discord or database dependency: persisted measurements
 * are supplied by the repository, and every proposed change is reproducible.
 */
export const ECONOMY_TIME_ZONE='America/Denver';
export const ECONOMY_RESET_HOUR=4;

export interface EconomyPolicy {
  dailyClaim:bigint; weeklyClaim:bigint; chatWindowReward:bigint; chatDailyCap:bigint;
  voiceEarlyReward:bigint; voiceThirdHourReward:bigint; starterPercentBps:bigint;
  tier5WeeklyRateBps:bigint; tier5WeeklyCapBps:bigint; maximumWagerBenchmarkBps:bigint;
  lotteryTicketBenchmarkBps:bigint;
}

export interface EconomyPolicyBounds {
  dailyClaim:[bigint,bigint]; weeklyClaim:[bigint,bigint]; chatWindowReward:[bigint,bigint];
  voiceEarlyReward:[bigint,bigint]; voiceThirdHourReward:[bigint,bigint]; starterPercentBps:[bigint,bigint];
  tier5WeeklyRateBps:[bigint,bigint]; maximumWagerBenchmarkBps:[bigint,bigint];
  lotteryTicketBenchmarkBps:[bigint,bigint]; maxWeeklyRelativeChangeBps:bigint;
}

export const DEFAULT_AUTOMATED_ECONOMY_POLICY:EconomyPolicy={
  dailyClaim:250n,weeklyClaim:1250n,chatWindowReward:20n,chatDailyCap:300n,
  voiceEarlyReward:100n,voiceThirdHourReward:50n,starterPercentBps:250n,
  tier5WeeklyRateBps:100n,tier5WeeklyCapBps:250n,maximumWagerBenchmarkBps:3300n,
  lotteryTicketBenchmarkBps:25n,
};

export const DEFAULT_AUTOMATED_ECONOMY_BOUNDS:EconomyPolicyBounds={
  dailyClaim:[200n,300n],weeklyClaim:[1000n,1500n],chatWindowReward:[15n,25n],
  voiceEarlyReward:[80n,120n],voiceThirdHourReward:[40n,60n],starterPercentBps:[200n,300n],
  tier5WeeklyRateBps:[50n,150n],maximumWagerBenchmarkBps:[2500n,4000n],
  lotteryTicketBenchmarkBps:[15n,40n],maxWeeklyRelativeChangeBps:500n,
};

export interface EconomyMeasurement {
  eligibleMembers:number; rawMedianWealth:bigint; smoothedMedianWealth?:bigint;
  reconciliationValid:boolean; abnormalActivity:boolean; purchaseAffordabilityBps?:bigint;
  recurringNetIssuance?:bigint;
  wealthP90?:bigint; topFiveConcentrationBps?:bigint; purchaseFrequencyBps?:bigint;
  medianEarningDaysToMajorPurchase?:bigint; itemUtilityBps?:bigint; gamblingExposureBps?:bigint;
}
export const smoothedBenchmark=(daily:readonly bigint[])=>daily.length<7?undefined:daily.slice(-7).reduce((sum,value)=>sum+value,0n)/7n;
export const shadowReady=(snapshots:readonly {benchmark:bigint;reconciliationValid:boolean;abnormalActivity:boolean}[])=>snapshots.length>=7&&snapshots.slice(-7).every(row=>row.benchmark>0n&&row.reconciliationValid&&!row.abnormalActivity);
/**
 * A qualifying member is a human member observed in the server for seven
 * days and with at least three meaningful, independent observations in the
 * prior 28 days. Spending is intentionally not an activity signal.
 */
export const qualifiedActiveMemberIds=(members:readonly {userId:string;joinedAt?:Date|null;isBot?:boolean}[],observations:readonly {userId:string;occurredAt:Date;kind?:string}[],now:Date)=>{
  const joinedBefore=now.getTime()-7*86_400_000,activeAfter=now.getTime()-28*86_400_000;
  const qualifyingKinds=new Set(['chat','voice','command','event']);
  const counts=new Map<string,number>();
  for(const observation of observations)if(observation.occurredAt.getTime()>=activeAfter&&qualifyingKinds.has(observation.kind??'chat'))counts.set(observation.userId,(counts.get(observation.userId)??0)+1);
  return new Set(members.filter(member=>!member.isBot&&member.joinedAt&&member.joinedAt.getTime()<=joinedBefore&&(counts.get(member.userId)??0)>=3).map(member=>member.userId));
};
/** The affordability signal is published with its inputs, never inferred from low spending alone. */
export interface MajorPurchaseAffordability {
  qualifyingMembers:number; membersAbleToBuy:number; majorPurchaseCost:bigint;
  medianActiveWealth:bigint; typicalDailyEarnings:bigint;
  immediatelyAffordableBps:bigint; medianDaysToAfford:bigint;
}
export interface EconomyAdjustment {key:keyof EconomyPolicy; previous:bigint; proposed:bigint; applied:bigint; reason:string;}
export interface EconomyControlResult {frozen:boolean; reason?:string; benchmark?:bigint; adjustments:EconomicAdjustment[];}
type EconomicAdjustment=EconomyAdjustment;

const floor=(value:bigint,step=1n)=>value/step*step;
const clamp=(value:bigint,[min,max]:[bigint,bigint])=>value<min?min:value>max?max:value;
/** Limits a normal weekly change to the policy's explicitly configured 5%. */
export const boundedWeeklyChange=(previous:bigint,proposed:bigint,maxBps=500n)=>{
  if(previous<=0n)return proposed;
  const delta=previous*maxBps/10_000n;
  return proposed>previous+delta?previous+delta:proposed<previous-delta?previous-delta:proposed;
};
export const benchmarkPercent=(benchmark:bigint,bps:bigint,roundTo=1n)=>floor(benchmark*bps/10_000n,roundTo);
/** Initial currency follows the published benchmark policy; it is never a legacy fixed grant. */
export const starterFromBenchmark=(benchmark:bigint,percentBps=250n)=>benchmark<=0n?0n:benchmarkPercent(benchmark,percentBps);
/** Pure payout guards; callers persist the sampled amount before reporting success. */
export const cappedActivityPayout=(sampled:bigint,alreadyPaid:bigint,dailyCap:bigint)=>sampled<=0n||alreadyPaid>=dailyCap?0n:sampled>dailyCap-alreadyPaid?dailyCap-alreadyPaid:sampled;
/** First two qualifying voice hours pay full rate, hour three pays half, then earnings stop. */
export const voicePayoutBand=(qualifiedSeconds:number)=>qualifiedSeconds<7_200?'full':qualifiedSeconds<10_800?'half':'none';
export const majorPurchaseAffordability=(input:{qualifyingMembers:number;membersAbleToBuy:number;majorPurchaseCost:bigint;medianActiveWealth:bigint;typicalDailyEarnings:bigint}):MajorPurchaseAffordability=>{
  const qualifying=Math.max(0,Math.trunc(input.qualifyingMembers)),able=Math.max(0,Math.min(qualifying,Math.trunc(input.membersAbleToBuy)));
  const cost=input.majorPurchaseCost<0n?0n:input.majorPurchaseCost,wealth=input.medianActiveWealth<0n?0n:input.medianActiveWealth,earnings=input.typicalDailyEarnings;
  const gap=cost>wealth?cost-wealth:0n,days=gap===0n?0n:earnings>0n?(gap+earnings-1n)/earnings:999_999n;
  return{qualifyingMembers:qualifying,membersAbleToBuy:able,majorPurchaseCost:cost,medianActiveWealth:wealth,typicalDailyEarnings:earnings,immediatelyAffordableBps:qualifying?BigInt(able)*10_000n/BigInt(qualifying):0n,medianDaysToAfford:days};
};
export const tier5Interest=(eligibleBank:bigint,rateBps:bigint,benchmark:bigint,capBps=250n)=>{
  if(eligibleBank<=0n||benchmark<=0n)return 0n;
  const earned=eligibleBank*rateBps/10_000n,cap=benchmark*capBps/10_000n;
  return earned<cap?earned:cap;
};

/**
 * Proposes only a small, evidence-backed correction.  It is intentionally
 * conservative: missing data, small samples, anomalies and reconciliation
 * failures freeze adjustments while leaving already-accepted settlements alone.
 */
export function evaluateEconomyPolicy(current:EconomyPolicy,bounds:EconomyPolicyBounds,m:EconomyMeasurement,shadow=true):EconomyControlResult {
  if(!m.reconciliationValid)return{frozen:true,reason:'Ledger reconciliation failed.',adjustments:[]};
  if(m.abnormalActivity)return{frozen:true,reason:'Abnormal activity requires administrator review.',adjustments:[]};
  if(m.eligibleMembers<15)return{frozen:true,reason:'Fewer than 15 qualifying active members.',adjustments:[]};
  const benchmark=m.smoothedMedianWealth??m.rawMedianWealth;
  if(benchmark<=0n)return{frozen:true,reason:'No stable active-member benchmark.',adjustments:[]};
  const adjustments:EconomicAdjustment[]=[];
  const propose=(key:keyof Pick<EconomyPolicy,'dailyClaim'|'weeklyClaim'|'starterPercentBps'|'maximumWagerBenchmarkBps'|'lotteryTicketBenchmarkBps'>,target:bigint,range:[bigint,bigint],reason:string)=>{
    const previous=current[key];const constrained=clamp(boundedWeeklyChange(previous,target,bounds.maxWeeklyRelativeChangeBps),range);
    if(constrained!==previous)adjustments.push({key,previous,proposed:target,applied:constrained,reason});
  };
  // Affordability is deliberately composite: immediate access under 20%, a
  // median path longer than 30 earning days, weak purchasing participation,
  // or poor usable-item coverage all indicate inaccessible progression. Low
  // spending alone never raises prices or lowers rewards.
  if((m.purchaseAffordabilityBps??2500n)<2000n||(m.medianEarningDaysToMajorPurchase??0n)>30n){
    propose('dailyClaim',current.dailyClaim*105n/100n,bounds.dailyClaim,'Major-purchase affordability is below policy target.');
    propose('weeklyClaim',current.weeklyClaim*105n/100n,bounds.weeklyClaim,'Major-purchase affordability is below policy target.');
  }
  if((m.purchaseFrequencyBps??2500n)<500n&&(m.itemUtilityBps??5000n)<3000n)propose('starterPercentBps',current.starterPercentBps*105n/100n,bounds.starterPercentBps,'Low purchase participation and usable-item coverage indicate an onboarding progression gap.');
  // High concentration, persistent issuance/removal imbalance, or gambling
  // exposure only tighten future wager caps. They never rewrite accepted terms,
  // alter odds, or reduce a reward already sampled.
  if((m.recurringNetIssuance??0n)>benchmark/5n||(m.gamblingExposureBps??0n)>5_000n||((m.topFiveConcentrationBps??0n)>6_500n&&(m.wealthP90??0n)>benchmark*5n))propose('maximumWagerBenchmarkBps',current.maximumWagerBenchmarkBps*95n/100n,bounds.maximumWagerBenchmarkBps,'Issuance, wealth concentration, or gambling exposure exceeds the conservative policy threshold.');
  return{frozen:false,benchmark,adjustments:shadow?adjustments.map(x=>({...x,applied:x.previous})):adjustments};
}

/** Turns a shadow proposal into the exact bounded policy that would apply.
 * Kept pure so publication and audit cannot disagree about the live terms. */
export const materializePolicy=(current:EconomyPolicy,bounds:EconomyPolicyBounds,adjustments:readonly EconomyAdjustment[]):EconomyPolicy=>{
  const next={...current};
  for(const adjustment of adjustments){const key=adjustment.key;if(key==='dailyClaim'||key==='weeklyClaim'||key==='starterPercentBps'||key==='maximumWagerBenchmarkBps'||key==='lotteryTicketBenchmarkBps')next[key]=clamp(boundedWeeklyChange(current[key],adjustment.proposed,bounds.maxWeeklyRelativeChangeBps),bounds[key]);}
  return next;
};
