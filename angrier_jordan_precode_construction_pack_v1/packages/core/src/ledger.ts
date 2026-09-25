import { invariant } from './errors.js';
export type BalanceBucket = 'wallet'|'bank';
export interface LedgerAccount { guildId: string; userId: string; wallet: bigint; reservedWallet?:bigint; bank: bigint; version: number; }
/** Wallet remains the displayed owned balance; temporary holds reduce only spendability. */
export function spendableWallet(account:{wallet:bigint;reservedWallet?:bigint}):bigint {
  const reserved=account.reservedWallet??0n;
  invariant(reserved>=0n&&reserved<=account.wallet,'WALLET_HOLD_INVARIANT','Wallet holds must be within the owned wallet balance.');
  return account.wallet-reserved;
}
export interface LedgerLine { userId?: string; bucket: BalanceBucket|'system'; amount: bigint; reason: string; metadata?: Record<string,unknown>; }
export interface LedgerTransaction { idempotencyKey: string; guildId: string; lines: readonly LedgerLine[]; }
export interface LedgerRepository {
  hasIdempotencyKey(key: string): Promise<boolean>;
  getAccount(guildId: string, userId: string): Promise<LedgerAccount>;
  commit(tx: LedgerTransaction, expectedVersions: ReadonlyMap<string,number>): Promise<boolean>;
}
export class LedgerEngine {
  constructor(private readonly repo: LedgerRepository) {}
  async apply(tx: LedgerTransaction): Promise<'applied'|'duplicate'> {
    if (await this.repo.hasIdempotencyKey(tx.idempotencyKey)) return 'duplicate';
    const net = tx.lines.reduce((s,l)=>s+l.amount,0n);
    invariant(net===0n,'UNBALANCED_LEDGER','Ledger transaction lines must sum to zero.');
    const users=[...new Set(tx.lines.flatMap(l=>l.userId?[l.userId]:[]))];
    const accounts=await Promise.all(users.map(u=>this.repo.getAccount(tx.guildId,u)));
    const expected=new Map(accounts.map(a=>[a.userId,a.version]));
    for (const a of accounts) {
      const walletDelta=tx.lines.filter(l=>l.userId===a.userId&&l.bucket==='wallet').reduce((s,l)=>s+l.amount,0n);
      const bankDelta=tx.lines.filter(l=>l.userId===a.userId&&l.bucket==='bank').reduce((s,l)=>s+l.amount,0n);
      invariant(a.wallet+walletDelta>=0n,'NEGATIVE_WALLET','Wallet cannot go negative.');
      invariant(spendableWallet(a)+walletDelta>=0n,'WALLET_FUNDS_HELD','These wallet funds are reserved until the active transaction resolves.');
      invariant(a.bank+bankDelta>=0n,'NEGATIVE_BANK','Bank cannot go negative.');
    }
    const ok=await this.repo.commit(tx,expected); invariant(ok,'LEDGER_CONFLICT','Concurrent balance change; retry transaction.');
    return 'applied';
  }
}
