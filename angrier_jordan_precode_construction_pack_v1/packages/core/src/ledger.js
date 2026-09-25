import { invariant } from './errors.js';
export class LedgerEngine {
    repo;
    constructor(repo) {
        this.repo = repo;
    }
    async apply(tx) {
        if (await this.repo.hasIdempotencyKey(tx.idempotencyKey))
            return 'duplicate';
        const net = tx.lines.reduce((s, l) => s + l.amount, 0n);
        invariant(net === 0n, 'UNBALANCED_LEDGER', 'Ledger transaction lines must sum to zero.');
        const users = [...new Set(tx.lines.flatMap(l => l.userId ? [l.userId] : []))];
        const accounts = await Promise.all(users.map(u => this.repo.getAccount(tx.guildId, u)));
        const expected = new Map(accounts.map(a => [a.userId, a.version]));
        for (const a of accounts) {
            const walletDelta = tx.lines.filter(l => l.userId === a.userId && l.bucket === 'wallet').reduce((s, l) => s + l.amount, 0n);
            const bankDelta = tx.lines.filter(l => l.userId === a.userId && l.bucket === 'bank').reduce((s, l) => s + l.amount, 0n);
            invariant(a.wallet + walletDelta >= 0n, 'NEGATIVE_WALLET', 'Wallet cannot go negative.');
            invariant(a.bank + bankDelta >= 0n, 'NEGATIVE_BANK', 'Bank cannot go negative.');
        }
        const ok = await this.repo.commit(tx, expected);
        invariant(ok, 'LEDGER_CONFLICT', 'Concurrent balance change; retry transaction.');
        return 'applied';
    }
}
//# sourceMappingURL=ledger.js.map