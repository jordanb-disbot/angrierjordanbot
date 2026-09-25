import type {CatalogItemRecord,ToolRecord} from './types.js';
export const QUALITIES=['Standard','Fine','Exceptional','Masterwork','Perfect'] as const;
export const RANKS=['Apprentice','Craftsman','Chairwright','Master Chairwright','Grand Chairwright'] as const;
export const RARITIES=['Common','Uncommon','Rare','Epic','Legendary','Mythic'] as const;
export interface ItemStack {id:string;userId:string;itemId:string;quantity:number;locked:boolean;acquiredAt:Date;}
export interface ItemTool extends ToolRecord {locked:boolean;}
export interface ItemChair {id:string;userId:string;chairType:string;quality:string;locked:boolean;createdAt:Date;}
export interface ItemRecipe {id:string;name:string;outputItemId:string;inputs:Record<string,number>;chairInput?:string;success:number;enabled:boolean;}
export interface ItemCollection {id:string;name:string;hidden:boolean;itemIds:string[];badgeId:string;}
export interface ItemMember {
 userId:string;wallet:bigint;reservedWallet?:bigint;bank:bigint;stacks:ItemStack[];tools:ItemTool[];chairs:ItemChair[];recipes:string[];discoveries:string[];categoryLocks:string[];pity:Record<string,number>;
 progress:{rank:string;skillPoints:number;attempts:number;successes:number};achievements:string[];
}
export interface ItemState {guildId:string;catalog:CatalogItemRecord[];recipes:ItemRecipe[];collections:ItemCollection[];members:ItemMember[];}
export interface ItemOutcome {message:string;[key:string]:string|number|boolean|string[];}
export interface ItemContext {guildId:string;userId:string;requestKey:string;}
export interface ItemUnit {state:ItemState;spend(userId:string,amount:bigint,reason:string):Promise<void>;reward(userId:string,amount:bigint,reason:string):Promise<void>;gift(senderId:string,recipientId:string,itemId:string,quantity:number):void;}
export interface ItemRepository {
 read(guildId:string,userIds:string[]):Promise<ItemState>;
 transact(context:ItemContext,fingerprint:unknown,userIds:string[],operation:(unit:ItemUnit)=>Promise<ItemOutcome>):Promise<ItemOutcome>;
}
export interface ItemPolicy {bonusSlots:number;buybackPercent:number;repairs:Record<'cheap'|'standard'|'premium',{cost:bigint;min:number;max:number}>;}
