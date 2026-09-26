import test from 'node:test';
import assert from 'node:assert/strict';
import {assertItemEscrow,assertMonetaryEscrow} from '../../.test-build/packages/database/src/escrow-contract.js';
import {PrismaItemEscrow} from '../../.test-build/packages/database/src/item-escrow.js';
import {PrismaWagerEscrow} from '../../.test-build/packages/database/src/wager-escrow.js';

const item={kind:'ITEM',ownerUserId:'member',amount:null,walletAmount:0n,bankAmount:0n,itemRef:'ring',itemQuantity:1};
const money={kind:'OTTOMANS',ownerUserId:'member',amount:7n,walletAmount:3n,bankAmount:4n,itemRef:null,itemQuantity:null};
test('typed escrow preserves monetary funding and requires explicit inventory quantity',()=>{
  assert.doesNotThrow(()=>assertItemEscrow(item));assert.doesNotThrow(()=>assertMonetaryEscrow(money));
  assert.doesNotThrow(()=>assertMonetaryEscrow({...money,amount:0n,walletAmount:0n,bankAmount:0n}));
  for(const invalid of [{...item,amount:1n},{...item,walletAmount:1n},{...item,bankAmount:1n},{...item,itemQuantity:null},{...item,itemQuantity:0},{...item,itemQuantity:1.5},{...item,itemQuantity:2_147_483_648},{...item,itemRef:' '},{...item,ownerUserId:null},money])assert.throws(()=>assertItemEscrow(invalid),{code:'ESCROW_ASSET_CONTRACT'});
  for(const invalid of [{...money,itemRef:'ring'},{...money,itemQuantity:1},{...money,amount:null},{...money,walletAmount:2n},{...money,bankAmount:-1n},{...money,kind:'unknown'},item])assert.throws(()=>assertMonetaryEscrow(invalid),{code:'ESCROW_ASSET_CONTRACT'});
});
test('item escrow rejects nontransaction clients and invalid input before touching persistence',async()=>{
  assert.throws(()=>new PrismaItemEscrow({$transaction(){}}),{code:'ITEM_ESCROW_TRANSACTION_REQUIRED'});
  const adapter=new PrismaItemEscrow({}),valid={guildId:'g',userId:'m',itemId:'ring',quantity:1,referenceType:'proposal',referenceId:'p',key:'k'};
  for(const quantity of [0,-1,0.5,Number.NaN,2_147_483_648])await assert.rejects(adapter.reserve({...valid,quantity}),{code:'ITEM_ESCROW_QUANTITY'});
  await assert.rejects(adapter.reserve({...valid,userId:' '}),{code:'ITEM_ESCROW_REFERENCE'});
});
test('monetary adapter rejects item rows before reserve replay, settlement or refund ledger writes',async()=>{
  const row={...item,id:'item',state:'RESERVED',guildId:'g',referenceType:'proposal',referenceId:'p',idempotencyKey:'k'},tx={escrow:{findUnique:async()=>row,findMany:async()=>[row]}},ledger={apply:async()=>assert.fail('Mixed escrow must never reach the ledger')},adapter=new PrismaWagerEscrow(tx,ledger);
  await assert.rejects(adapter.reserve({guildId:'g',userId:'member',amount:1n,referenceType:'proposal',referenceId:'p',key:'k'}),{code:'ESCROW_ASSET_CONTRACT'});
  await assert.rejects(adapter.settle('g','proposal','p',new Map([['member',1n]]),'settle'),{code:'ESCROW_ASSET_CONTRACT'});
  await assert.rejects(adapter.refund('g','proposal','p','refund'),{code:'ESCROW_ASSET_CONTRACT'});
});
test('finalized item replay retains identity and never debits inventory again',async()=>{
  const row={...item,id:'item',state:'REFUNDED',guildId:'g',referenceType:'proposal',referenceId:'p',idempotencyKey:'k'},adapter=new PrismaItemEscrow({escrow:{findUnique:async()=>row}}),input={guildId:'g',userId:'member',itemId:'ring',quantity:1,referenceType:'proposal',referenceId:'p',key:'k'};
  assert.equal((await adapter.reserve(input)).state,'REFUNDED');
  for(const change of [{guildId:'other'},{userId:'other'},{itemId:'other'},{quantity:2},{referenceType:'other'},{referenceId:'other'}])await assert.rejects(adapter.reserve({...input,...change}),{code:'REPLAY_MISMATCH'});
});
