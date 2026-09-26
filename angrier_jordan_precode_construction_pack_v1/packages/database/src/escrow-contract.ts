import {DomainError} from '../../core/src/index.js';

export interface PersistedEscrowAsset {
  kind:string;ownerUserId:string|null;amount:bigint|null;walletAmount:bigint;bankAmount:bigint;
  itemRef:string|null;itemQuantity:number|null;
}
export function assertMonetaryEscrow(row:PersistedEscrowAsset):void {
  if(row.kind!=='OTTOMANS'||!row.ownerUserId?.trim()||row.amount===null||row.amount<0n||row.itemRef!==null||row.itemQuantity!==null||row.walletAmount<0n||row.bankAmount<0n||row.walletAmount+row.bankAmount!==row.amount)
    throw new DomainError('ESCROW_ASSET_CONTRACT','The monetary escrow asset is inconsistent.');
}
export function assertItemEscrow(row:PersistedEscrowAsset):asserts row is PersistedEscrowAsset&{ownerUserId:string;itemRef:string;itemQuantity:number} {
  if(row.kind!=='ITEM'||!row.ownerUserId?.trim()||!row.itemRef?.trim()||row.amount!==null||row.walletAmount!==0n||row.bankAmount!==0n||!Number.isInteger(row.itemQuantity)||row.itemQuantity===null||row.itemQuantity<=0||row.itemQuantity>2_147_483_647)
    throw new DomainError('ESCROW_ASSET_CONTRACT','The inventory escrow asset is inconsistent.');
}
