export type EconomyBucket='wallet'|'bank';
export type DailyAction='daily'|'spin'|'fortune';
export type GrindActivity='work'|'fish'|'dig'|'scavenge';
export type ActivityOutcome='win'|'zero'|'loss'|'fine'|'item'|'mixed'|'tool_damage';

export interface EconomyAccountRecord {guildId:string;userId:string;wallet:bigint;reservedWallet?:bigint;bank:bigint;bankTier:number;version:number;starterGrantedAt?:Date;}
export interface EconomyTransactionRecord {id:string;guildId:string;idempotencyKey:string;kind:string;reason:string;metadata?:Record<string,unknown>;createdAt:Date;}
export interface EconomyLedgerEntryRecord {id:string;guildId:string;transactionId:string;userId?:string;bucket:EconomyBucket|'system';amount:bigint;reason:string;metadata?:Record<string,unknown>;createdAt:Date;}
export interface MemberClaimStateRecord {guildId:string;userId:string;dailyLastClaimAt?:Date;dailyStreak:number;weeklyLastClaimAt?:Date;dailySpinLastAt?:Date;fortuneLastAt?:Date;updatedAt:Date;}
export interface CatalogItemRecord {id:string;type:string;name:string;rarity:string;buyPrice?:bigint;sellValue?:bigint;giftable:boolean;enabled:boolean;metadata?:Record<string,unknown>;}
export interface InventoryEntryRecord {id:string;guildId:string;userId:string;itemId:string;quantity:number;locked:boolean;metadata?:Record<string,unknown>;item?:CatalogItemRecord;}
export interface ToolRecord {id:string;guildId:string;userId:string;catalogItemId:string;slot:string;durability:number;maxDurability:number;equipped:boolean;metadata?:Record<string,unknown>;}
export interface EconomyActivityStatRecord {guildId:string;userId:string;activity:GrindActivity;attempts:number;wins:number;zeroes:number;losses:number;fines:number;itemsFound:number;ottomansEarned:bigint;ottomansLost:bigint;lastAttemptAt?:Date;updatedAt:Date;}
export interface EconomyActivityEventRecord {id:string;guildId:string;userId:string;activity:GrindActivity;outcome:ActivityOutcome;ottomansDelta:bigint;itemGrants:InventoryGrant[];toolDamage:number;idempotencyKey:string;metadata?:Record<string,unknown>;createdAt:Date;}

export interface InventoryGrant {itemId:string;quantity:number;}
export interface BankTierRule {tier:number;cap:bigint|null;upgradeCost:bigint;}
export interface SpinReward {kind:'ottomans'|'item';weight:number;amount?:bigint;itemId?:string;quantity?:number;label?:string;}
export interface GrindOutcomeRule {outcome:ActivityOutcome;weight:number;minOttomans?:bigint;maxOttomans?:bigint;itemId?:string;quantity?:number;toolDamage?:number;}
export interface GrindPolicy {technicalThrottleMs:number;outcomes:readonly GrindOutcomeRule[];}
export interface FortuneEntry {id:string;text:string;enabled?:boolean;}

export interface DailyHubState {cycleKey:string;resetAt:Date;dailyReady:boolean;spinReady:boolean;fortuneReady:boolean;streak:number;}
export interface ClaimResult {status:'applied'|'already_used'|'duplicate';account:EconomyAccountRecord;reward:bigint;bonus:bigint;streak:number;cycleKey:string;}
export interface SpinResult {status:'applied'|'already_used'|'duplicate';account:EconomyAccountRecord;cycleKey:string;reward?:SpinReward;inventory?:InventoryEntryRecord[];}
export interface FortuneResult {status:'applied'|'already_used'|'duplicate';cycleKey:string;fortune?:FortuneEntry;}
export interface WeeklyResult {status:'applied'|'already_used'|'duplicate';account:EconomyAccountRecord;reward:bigint;cycleKey:string;}
export interface ActivityResult {status:'applied'|'duplicate'|'throttled';event?:EconomyActivityEventRecord;account:EconomyAccountRecord;tool?:ToolRecord;fallbackTool?:ToolRecord;}
export interface StatementView {account:EconomyAccountRecord;liquidNetWorth:bigint;entries:EconomyLedgerEntryRecord[];}
export interface BankView {account:EconomyAccountRecord;rule:BankTierRule;nextRule?:BankTierRule;}

export interface RandomSource {next():number;}
export class MathRandomSource implements RandomSource {next(){return Math.random();}}
