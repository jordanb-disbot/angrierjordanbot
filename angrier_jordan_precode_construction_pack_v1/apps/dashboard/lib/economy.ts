import { getPrismaClient } from '../../../packages/database/src/client';

export async function readEconomyOverview(guildId:string){
  const db=getPrismaClient();
  const [accounts,accountBalances,activeHolds,inventoryEntries,items,catalogItems,snapshot,policy]=await Promise.all([
    db.economyAccount.aggregate({where:{guildId},_count:{_all:true},_sum:{wallet:true,bank:true}}),
    db.economyAccount.findMany({where:{guildId},select:{wallet:true,bank:true}}),
    db.walletHold.count({where:{guildId,state:'ACTIVE'}}),
    db.inventoryEntry.count({where:{guildId}}),
    db.catalogItem.groupBy({by:['enabled'],_count:{_all:true}}),
    db.catalogItem.findMany({orderBy:[{enabled:'desc'},{type:'asc'},{name:'asc'}],take:18,select:{id:true,name:true,type:true,rarity:true,buyPrice:true,sellValue:true,enabled:true,giftable:true}}),
    db.economySnapshot.findFirst({where:{guildId},orderBy:{snapshotDate:'desc'},select:{snapshotDate:true,eligibleMemberCount:true,rawMedianWealth:true,totalSupply:true,reconciliation:true}}),
    db.economyPolicyVersion.findFirst({where:{guildId},orderBy:{createdAt:'desc'},select:{cycleKey:true,mode:true,pausedAt:true,createdAt:true}}),
  ]);
  const catalog=Object.fromEntries(items.map(row=>[String(row.enabled),row._count._all]));
  const balances=accountBalances.map(account=>account.wallet+account.bank).sort((left,right)=>left>right?-1:left<right?1:0),supply=balances.reduce((total,balance)=>total+balance,0n),topTen=balances.slice(0,10).reduce((total,balance)=>total+balance,0n),median=balances.length?balances[Math.floor((balances.length-1)/2)]!:0n;
  return {accounts:accounts._count._all,wallet:accounts._sum.wallet??0n,bank:accounts._sum.bank??0n,activeHolds,inventoryEntries,catalogEnabled:catalog.true??0,catalogDisabled:catalog.false??0,catalogItems,medianBalance:median,topTenShare:supply?Number(topTen*100n/supply):0,snapshot,policy};
}
