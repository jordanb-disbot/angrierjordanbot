import { getPrismaClient } from '../../../packages/database/src/client';

export async function readEconomyOverview(guildId:string){
  const db=getPrismaClient();
  const [accounts,activeHolds,inventoryEntries,items,catalogItems]=await Promise.all([
    db.economyAccount.aggregate({where:{guildId},_count:{_all:true},_sum:{wallet:true,bank:true}}),
    db.walletHold.count({where:{guildId,state:'ACTIVE'}}),
    db.inventoryEntry.count({where:{guildId}}),
    db.catalogItem.groupBy({by:['enabled'],_count:{_all:true}}),
    db.catalogItem.findMany({orderBy:[{enabled:'desc'},{type:'asc'},{name:'asc'}],take:18,select:{id:true,name:true,type:true,rarity:true,buyPrice:true,sellValue:true,enabled:true,giftable:true}}),
  ]);
  const catalog=Object.fromEntries(items.map(row=>[String(row.enabled),row._count._all]));
  return {accounts:accounts._count._all,wallet:accounts._sum.wallet??0n,bank:accounts._sum.bank??0n,activeHolds,inventoryEntries,catalogEnabled:catalog.true??0,catalogDisabled:catalog.false??0,catalogItems};
}
