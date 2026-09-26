import {readFileSync} from 'node:fs';
import type {PrismaClient} from '@prisma/client';
interface SeedItem {id:string;name:string;type:string;rarity:string;buyPrice:string;sellValue:string;giftable:boolean;enabled:boolean;metadata:{inheritable:boolean;consumable:boolean};}
const familyCatalog=JSON.parse(readFileSync(new URL('../../content/economy/family_catalog.json',import.meta.url),'utf8')) as {items:SeedItem[]};
/** Add missing catalog definitions only; preserve live prices, metadata and disabled items. */
export async function seedFamilyCatalog(db:Pick<PrismaClient,'catalogItem'>){
 for(const item of familyCatalog.items)await db.catalogItem.upsert({where:{id:item.id},create:{...item,buyPrice:BigInt(item.buyPrice),sellValue:BigInt(item.sellValue)},update:{}});
}
