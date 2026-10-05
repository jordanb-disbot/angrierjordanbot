import type {LedgerRepository,LedgerTransaction} from '../../core/src/index.js';
import type {ActivityOutcome,BankTierRule,CatalogItemRecord,EconomyAccountRecord,EconomyActivityEventRecord,EconomyActivityStatRecord,EconomyLedgerEntryRecord,EconomyTransactionRecord,GrindActivity,InventoryEntryRecord,InventoryGrant,MemberClaimStateRecord,ToolRecord} from './types.js';
export interface EconomySnapshotRecord {guildId:string;cycleKey:string;totalSupply:bigint;eligibleMemberCount:number;metrics:Record<string,unknown>;}
export interface EconomyPolicyProposal {guildId:string;cycleKey:string;frozen:boolean;reason?:string;benchmark?:bigint;policy:Record<string,string>;bounds:Record<string,unknown>;adjustments:readonly {key:string;previous:string;proposed:string;applied:string;reason:string}[];}

export type ClaimField='dailyLastClaimAt'|'weeklyLastClaimAt'|'dailySpinLastAt'|'fortuneLastAt';
export interface ClaimCommitInput {
  guildId:string;userId:string;claimField:ClaimField;cycleStart:Date;now:Date;idempotencyKey:string;kind:string;reason:string;
  walletReward:bigint;items?:readonly InventoryGrant[];dailyStreak?:number;metadata?:Record<string,unknown>;
}
export interface ClaimCommitResult {status:'applied'|'already_used'|'duplicate';account:EconomyAccountRecord;state:MemberClaimStateRecord;inventory:InventoryEntryRecord[];transaction?:EconomyTransactionRecord;}
export interface ActivityCommitInput {
  guildId:string;userId:string;activity:GrindActivity;outcome:ActivityOutcome;idempotencyKey:string;reason:string;now:Date;technicalThrottleMs:number;
  requestedDelta:bigint;items?:readonly InventoryGrant[];toolInstanceId?:string;toolDamage?:number;metadata?:Record<string,unknown>;
}
export interface ActivityCommitResult {status:'applied'|'duplicate'|'throttled';account:EconomyAccountRecord;event?:EconomyActivityEventRecord;tool?:ToolRecord;fallbackTool?:ToolRecord;}
export interface BankUpgradeCommitInput {guildId:string;userId:string;idempotencyKey:string;currentRule:BankTierRule;nextRule:BankTierRule;reason:string;now:Date;}
export interface StarterCommitResult {status:'applied'|'existing'|'duplicate';account:EconomyAccountRecord;}
export interface BankInterestTermRecord {guildId:string;cycleKey:string;rateBps:number;capAmount:bigint;}
export interface ActivityPayoutCounter {guildId:string;userId:string;cycleKey:string;chatPaidWindows:number;chatLastWindowKey?:string|null;chatPaidAmount:bigint;voiceQualifiedSeconds:number;voicePaidSeconds:number;voicePaidAmount:bigint;}
/**
 * A non-interactive activity award.  The caller samples the proposed amount,
 * but this operation persists that exact sample with the cap counter and the
 * balancing ledger lines in one transaction.  Retried events therefore never
 * get another random roll.
 */
export interface ActivityPayoutCommitInput {guildId:string;userId:string;cycleKey:string;kind:'chat'|'voice';idempotencyKey:string;now:Date;requestedReward:bigint;dailyCap:bigint;chatWindows?:number;chatWindowKey?:string;voiceQualifiedSeconds?:number;voicePaidSeconds?:number;reason:string;metadata?:Record<string,unknown>;}
export interface ActivityPayoutCommitResult {status:'applied'|'duplicate'|'capped'|'throttled';account:EconomyAccountRecord;counter:ActivityPayoutCounter;reward:bigint;transaction?:EconomyTransactionRecord;}

export interface EconomyRepository extends LedgerRepository {
  ensureMember(guildId:string,userId:string):Promise<void>;
  getEconomyAccount(guildId:string,userId:string):Promise<EconomyAccountRecord>;
  grantStarter(input:{guildId:string;userId:string;amount:bigint;idempotencyKey:string;now:Date}):Promise<StarterCommitResult>;
  getTransactionByIdempotencyKey(key:string):Promise<EconomyTransactionRecord|null>;
  listLedgerEntries(guildId:string,userId:string,limit:number):Promise<EconomyLedgerEntryRecord[]>;
  getClaimState(guildId:string,userId:string):Promise<MemberClaimStateRecord>;
  commitClaim(input:ClaimCommitInput):Promise<ClaimCommitResult>;
  listInventory(guildId:string,userId:string):Promise<InventoryEntryRecord[]>;
  getCatalogItem(itemId:string):Promise<CatalogItemRecord|null>;
  listCatalogItems(enabledOnly?:boolean):Promise<CatalogItemRecord[]>;
  getEquippedUsableTool(guildId:string,userId:string,slot:string):Promise<ToolRecord|null>;
  commitActivity(input:ActivityCommitInput):Promise<ActivityCommitResult>;
  getActivityStats(guildId:string,userId:string):Promise<EconomyActivityStatRecord[]>;
  commitBankUpgrade(input:BankUpgradeCommitInput):Promise<EconomyAccountRecord>;
  listAccountsAtTier(guildId:string,tier:number):Promise<EconomyAccountRecord[]>;
  listBankLedgerEntries(guildId:string,start:Date,end:Date):Promise<EconomyLedgerEntryRecord[]>;
  lockBankInterestTerm(input:BankInterestTermRecord):Promise<BankInterestTermRecord>;
  getActivityPayoutCounter(guildId:string,userId:string,cycleKey:string):Promise<ActivityPayoutCounter>;
  commitActivityPayout(input:ActivityPayoutCommitInput):Promise<ActivityPayoutCommitResult>;
  upsertBankInterestJob(input:{guildId:string;dueAt:Date;cycleKey:string}):Promise<void>;
  upsertEconomySnapshotJob(input:{guildId:string;dueAt:Date;cycleKey:string}):Promise<void>;
  upsertEconomyPolicyJob(input:{guildId:string;dueAt:Date;cycleKey:string}):Promise<void>;
  captureEconomySnapshot(input:{guildId:string;cycleKey:string}):Promise<EconomySnapshotRecord>;
  listEconomySnapshots(guildId:string,limit:number):Promise<(EconomySnapshotRecord&{rawMedianWealth:bigint;reconciliationValid:boolean;abnormalActivity:boolean})[]>;
  saveEconomyPolicyProposal(input:EconomyPolicyProposal):Promise<void>;
}

export const balancedSystemReward=(guildId:string,userId:string,amount:bigint,idempotencyKey:string,reason:string,bucket:'wallet'|'bank'='wallet',metadata?:Record<string,unknown>):LedgerTransaction=>({
  guildId,idempotencyKey,lines:[
    {userId,bucket,amount,reason,...(metadata?{metadata}:{})},
    {bucket:'system',amount:-amount,reason,...(metadata?{metadata}:{})},
  ],
});
