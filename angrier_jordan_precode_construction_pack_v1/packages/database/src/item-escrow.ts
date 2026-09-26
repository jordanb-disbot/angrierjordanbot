import type {Prisma} from '@prisma/client';
import {DomainError,EscrowStateMachine} from '../../core/src/index.js';
import {assertItemEscrow} from './escrow-contract.js';

export interface ItemEscrowReservation {
  guildId:string;userId:string;itemId:string;quantity:number;referenceType:string;referenceId:string;key:string;
}
/** Inventory and escrow must commit together in the caller's shared atomic transaction. */
export class PrismaItemEscrow {
  constructor(private readonly tx:Prisma.TransactionClient,private readonly clock:()=>Date=()=>new Date()){
    if(typeof (tx as unknown as {$transaction?:unknown}).$transaction==='function')throw new DomainError('ITEM_ESCROW_TRANSACTION_REQUIRED','Item escrow requires a caller-owned database transaction.');
  }
  async reserve(input:ItemEscrowReservation){
    if([input.guildId,input.userId,input.itemId,input.referenceType,input.referenceId,input.key].some(value=>typeof value!=='string'||!value.trim()||value.length>256))throw new DomainError('ITEM_ESCROW_REFERENCE','A bounded server, member, item and request reference are required.');
    if(!Number.isInteger(input.quantity)||input.quantity<=0||input.quantity>2_147_483_647)throw new DomainError('ITEM_ESCROW_QUANTITY','Choose a positive whole item quantity.');
    const prior=await this.tx.escrow.findUnique({where:{idempotencyKey:input.key}});
    if(prior){
      assertItemEscrow(prior);
      if(prior.guildId!==input.guildId||prior.ownerUserId!==input.userId||prior.itemRef!==input.itemId||prior.itemQuantity!==input.quantity||prior.referenceType!==input.referenceType||prior.referenceId!==input.referenceId)throw new DomainError('REPLAY_MISMATCH','Item reservation belongs to another action.');
      return prior; // A finalized reservation is never resurrected by a replay.
    }
    const item=await this.tx.catalogItem.findUnique({where:{id:input.itemId}});
    if(!item?.enabled||await this.tx.inventoryCategoryLock.findUnique({where:{guildId_userId_category:{guildId:input.guildId,userId:input.userId,category:item.type}}}))throw new DomainError('ITEM_ESCROW_UNAVAILABLE','The required item is unavailable or its category is locked.');
    const changed=await this.tx.inventoryEntry.updateMany({where:{guildId:input.guildId,userId:input.userId,itemId:input.itemId,quantity:{gte:input.quantity},locked:false},data:{quantity:{decrement:input.quantity}}});
    if(changed.count!==1)throw new DomainError('ITEM_ESCROW_INVENTORY','There are not enough unlocked items for this reservation.');
    return this.tx.escrow.create({data:{guildId:input.guildId,ownerUserId:input.userId,kind:'ITEM',amount:null,walletAmount:0n,bankAmount:0n,itemRef:input.itemId,itemQuantity:input.quantity,referenceType:input.referenceType,referenceId:input.referenceId,idempotencyKey:input.key}});
  }
  async finish(guildId:string,id:string,outcome:'SETTLED'|'REFUNDED'){
    const row=await this.tx.escrow.findUnique({where:{id}});
    if(!row||row.guildId!==guildId)throw new DomainError('ITEM_ESCROW_MISSING','The item reservation is unavailable in this server.');
    assertItemEscrow(row);
    if(row.state===outcome)return row;
    if(row.state!=='RESERVED')throw new DomainError('ESCROW_FINAL','The item reservation already has a different final outcome.');
    const record={id:row.id,state:row.state,ownerUserId:row.ownerUserId,itemRef:row.itemRef,referenceType:row.referenceType,referenceId:row.referenceId,idempotencyKey:row.idempotencyKey};
    if(outcome==='SETTLED')EscrowStateMachine.settle(record);else EscrowStateMachine.refund(record);
    const settledAt=this.clock(),changed=await this.tx.escrow.updateMany({where:{id:row.id,guildId,state:'RESERVED'},data:{state:outcome,settledAt}});
    if(changed.count!==1)throw new DomainError('LEDGER_CONFLICT','The item reservation changed; retry the operation.');
    if(outcome==='REFUNDED')await this.tx.inventoryEntry.upsert({where:{guildId_userId_itemId:{guildId,userId:row.ownerUserId,itemId:row.itemRef}},create:{guildId,userId:row.ownerUserId,itemId:row.itemRef,quantity:row.itemQuantity},update:{quantity:{increment:row.itemQuantity}}});
    return {...row,state:outcome,settledAt};
  }
  async finishReference(guildId:string,referenceType:string,referenceId:string,consume:ReadonlySet<string>){
    const rows=await this.tx.escrow.findMany({where:{guildId,referenceType,referenceId},orderBy:{id:'asc'}});
    for(const row of rows){assertItemEscrow(row);await this.finish(guildId,row.id,consume.has(row.itemRef)?'SETTLED':'REFUNDED');}
  }
}
