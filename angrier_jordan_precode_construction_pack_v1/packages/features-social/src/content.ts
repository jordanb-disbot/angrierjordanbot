import {readFileSync} from 'node:fs';
import type {PrismaClient} from '@prisma/client';
import {SOCIAL_ACTIONS,formatSocialResponse} from './domain.js';
interface Entry {id:string;text:string;enabled:boolean;intensity?:string;}
const read=(name:string)=>JSON.parse(readFileSync(new URL('../content/'+name,import.meta.url),'utf8'));
/** Insert seeds once. Published PostgreSQL edits/enabled states win on every later startup. */
export async function seedSocialContent(db:PrismaClient){
 const social=read('social_response_pools.json') as Record<string,Entry[]>,roasts=read('roast_300.json') as Entry[],haiku=read('haiku_complaints_60.json') as Entry[];
 const rows=[];for(const action of SOCIAL_ACTIONS){const pool=social[action];if(!pool?.length)throw new Error('Missing authored social pool: '+action);for(const entry of pool){formatSocialResponse(action,entry.text,'111111111111111111','222222222222222222');rows.push({id:entry.id,game:'social',category:action,payload:{text:entry.text},tags:[],enabled:entry.enabled,contentVersion:1});}}
 for(const entry of roasts){if(!['mild','angry','brutal','nuclear'].includes(entry.intensity??''))throw new Error('Invalid authored roast intensity');formatSocialResponse('roast',entry.text,'111111111111111111','222222222222222222');rows.push({id:entry.id,game:'roast',category:entry.intensity!,payload:{text:entry.text},tags:[],enabled:entry.enabled,contentVersion:1});}
 for(const entry of haiku){if(!entry.text.trim()||entry.text.length>1800)throw new Error('Invalid authored haiku complaint');rows.push({id:entry.id,game:'haiku',category:'complaint',payload:{text:entry.text},tags:[],enabled:entry.enabled,contentVersion:1});}
 await db.contentEntry.createMany({data:rows,skipDuplicates:true});return rows.length;
}
