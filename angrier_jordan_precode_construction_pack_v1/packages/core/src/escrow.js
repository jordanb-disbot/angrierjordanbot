import { invariant } from './errors.js';
export class EscrowStateMachine {
    static settle(e) { invariant(e.state === 'RESERVED', 'ESCROW_NOT_RESERVED', 'Only reserved escrow can settle.'); return { ...e, state: 'SETTLED' }; }
    static refund(e) { invariant(e.state === 'RESERVED', 'ESCROW_NOT_RESERVED', 'Only reserved escrow can refund.'); return { ...e, state: 'REFUNDED' }; }
    static forfeit(e) { invariant(e.state === 'RESERVED', 'ESCROW_NOT_RESERVED', 'Only reserved escrow can forfeit.'); return { ...e, state: 'FORFEITED' }; }
}
//# sourceMappingURL=escrow.js.map