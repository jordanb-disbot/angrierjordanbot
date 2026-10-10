import {readFileSync} from 'node:fs';
import type {Prisma,PrismaClient} from '@prisma/client';
interface SeedItem {id:string;name:string;type:string;rarity:string;buyPrice:string;sellValue:string;giftable:boolean;enabled:boolean;metadata:Record<string,unknown>;}
const familyCatalog=JSON.parse(readFileSync(new URL('../../content/economy/family_catalog.json',import.meta.url),'utf8')) as {items:SeedItem[]};
export const FAMILY_CATALOG_ITEMS:readonly SeedItem[]=familyCatalog.items;
/** Add missing catalog definitions only; preserve live prices, metadata and disabled items. */
export async function seedFamilyCatalog(db:Pick<PrismaClient,'catalogItem'>){
 for(const item of FAMILY_CATALOG_ITEMS)await db.catalogItem.upsert({where:{id:item.id},create:{...item,metadata:item.metadata as Prisma.InputJsonValue,buyPrice:BigInt(item.buyPrice),sellValue:BigInt(item.sellValue)},update:{}});
}
