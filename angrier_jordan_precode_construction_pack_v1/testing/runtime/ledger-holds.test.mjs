import test from 'node:test';
import assert from 'node:assert/strict';
import {LedgerEngine,spendableWallet} from '../../.test-build/packages/core/src/ledger.js';
import {AuditService} from '../../.test-build/packages/core/src/audit.js';
import {InMemoryEconomyRepository} from '../../.test-build/packages/features-economy/src/in-memory.js';
import {EconomyService} from '../../.test-build/packages/features-economy/src/service.js';

const setup=()=>{
  const repo=new InMemoryEconomyRepository();
  repo.accounts.set('g:a',{guildId:'g',userId:'a',wallet:100n,reservedWallet:80n,bank:50n,bankTier:1,version:1});
  const service=new EconomyService(repo,new AuditService({write:async()=>{}}),{now:()=>new Date()});
  return{repo,service,ledger:new LedgerEngine(repo)};
};
const tx=(amount,key='debit')=>({guildId:'g',idempotencyKey:key,lines:[{userId:'a',bucket:'wallet',amount,reason:'test'},{bucket:'system',amount:-amount,reason:'test'}]});
test('wallet holds preserve displayed funds but prevent wallet debits beyond spendable balance',async()=>{
  const{repo,ledger}=setup();assert.equal(spendableWallet(await repo.getAccount('g','a')),20n);
  await assert.rejects(ledger.apply(tx(-21n)),{code:'WALLET_FUNDS_HELD'});
  assert.equal((await repo.getAccount('g','a')).wallet,100n);assert.equal(repo.transactions.size,0);
  await ledger.apply(tx(-20n));const result=await repo.getAccount('g','a');assert.equal(result.wallet,80n);assert.equal(result.reservedWallet,80n);
});
test('credits remain usable above the hold and missing optional aggregate preserves older accounts',async()=>{
  const{repo,ledger}=setup();await ledger.apply(tx(30n,'credit'));assert.equal(spendableWallet(await repo.getAccount('g','a')),50n);
  await ledger.apply(tx(-50n));assert.equal((await repo.getAccount('g','a')).wallet,80n);
  assert.equal(spendableWallet({wallet:50n}),50n);
  assert.throws(()=>spendableWallet({wallet:50n,reservedWallet:51n}),{code:'WALLET_HOLD_INVARIANT'});
});
test('memory repository commit cannot bypass wallet holds even without LedgerEngine validation',async()=>{
  const{repo}=setup();await assert.rejects(repo.commit(tx(-50n),new Map([['a',1]])),{code:'WALLET_FUNDS_HELD'});
  assert.equal((await repo.getAccount('g','a')).wallet,100n);assert.equal(repo.transactions.size,0);
});
test('hold version change after ledger read causes optimistic conflict rather than spending held funds',async()=>{
  const{repo}=setup();repo.accounts.get('g:a').reservedWallet=0n;
  const changing={hasIdempotencyKey:repo.hasIdempotencyKey.bind(repo),getAccount:repo.getAccount.bind(repo),commit:async(input,versions)=>{
    const account=repo.accounts.get('g:a');account.reservedWallet=80n;account.version++;
    return repo.commit(input,versions);
  }};
  await assert.rejects(new LedgerEngine(changing).apply(tx(-50n)),{code:'LEDGER_CONFLICT'});
  assert.equal((await repo.getAccount('g','a')).wallet,100n);
});
test('member transfers use spendable wallet first then bank without reducing held amount',async()=>{
  const{repo,service}=setup();const result=await service.transfer({guildId:'g',fromUserId:'a',toUserId:'b',amount:40n,idempotencyKey:'transfer'});
  assert.equal(result.from.wallet,80n);assert.equal(result.from.reservedWallet,80n);assert.equal(result.from.bank,30n);assert.equal(result.to.wallet,40n);
  assert.equal((await repo.getEconomyAccount('g','a')).wallet,80n);
});
test('non-ledger activity fines cap at spendable wallet plus bank and preserve all held funds',async()=>{
  const{repo}=setup();const result=await repo.commitActivity({guildId:'g',userId:'a',activity:'work',outcome:'fine',idempotencyKey:'fine',reason:'fine',now:new Date(),technicalThrottleMs:0,requestedDelta:-1000n});
  assert.equal(result.account.wallet,80n);assert.equal(result.account.reservedWallet,80n);assert.equal(result.account.bank,0n);assert.equal(result.event.ottomansDelta,-70n);
});
test('non-ledger bank upgrades use available funds and credit-only methods reject debit inputs',async()=>{
  const{repo}=setup();const result=await repo.commitBankUpgrade({guildId:'g',userId:'a',idempotencyKey:'upgrade',currentRule:{tier:1,cap:50n,upgradeCost:40n},nextRule:{tier:2,cap:100n,upgradeCost:80n},reason:'upgrade',now:new Date()});
  assert.equal(result.wallet,80n);assert.equal(result.bank,30n);assert.equal(result.reservedWallet,80n);
  await assert.rejects(repo.grantStarter({guildId:'g',userId:'a',amount:-1n,idempotencyKey:'bad',now:new Date()}),{code:'INVALID_REWARD'});
  await assert.rejects(repo.commitClaim({guildId:'g',userId:'a',walletReward:-1n}),{code:'INVALID_REWARD'});
});
