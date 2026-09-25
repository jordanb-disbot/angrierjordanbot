import type { WyrCategory, WyrPrompt, WyrRuntimeSession } from './types.js';

export interface WyrPromptRepository {
  pick(category:WyrCategory, excludedIds:readonly string[], requiredExclusions?:readonly string[]):Promise<WyrPrompt>;
  rememberUsed(guildId:string,promptId:string,category:WyrCategory):Promise<void>;
  recent(guildId:string,category:WyrCategory,limit:number):Promise<string[]>;
}

export interface WyrSessionRepository {
  create(session:WyrRuntimeSession):Promise<void>;
  get(id:string):Promise<WyrRuntimeSession|null>;
  compareAndSwap(id:string,expectedVersion:number,next:WyrRuntimeSession):Promise<boolean>;
  attachMessage(id:string,messageId:string):Promise<void>;
  listOpen(guildId?:string,channelId?:string):Promise<WyrRuntimeSession[]>;
}
