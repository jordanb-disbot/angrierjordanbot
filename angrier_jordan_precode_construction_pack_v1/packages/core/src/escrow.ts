import { invariant } from './errors.js';
export type EscrowState='RESERVED'|'SETTLED'|'REFUNDED'|'FORFEITED';
export interface EscrowRecord { id:string; ownerUserId?:string; amount?:bigint; itemRef?:string; state:EscrowState; referenceType:string; referenceId:string; idempotencyKey:string; }
export class EscrowStateMachine {
  static settle(e: EscrowRecord): EscrowRecord { invariant(e.state==='RESERVED','ESCROW_NOT_RESERVED','Only reserved escrow can settle.'); return {...e,state:'SETTLED'}; }
  static refund(e: EscrowRecord): EscrowRecord { invariant(e.state==='RESERVED','ESCROW_NOT_RESERVED','Only reserved escrow can refund.'); return {...e,state:'REFUNDED'}; }
  static forfeit(e: EscrowRecord): EscrowRecord { invariant(e.state==='RESERVED','ESCROW_NOT_RESERVED','Only reserved escrow can forfeit.'); return {...e,state:'FORFEITED'}; }
}
