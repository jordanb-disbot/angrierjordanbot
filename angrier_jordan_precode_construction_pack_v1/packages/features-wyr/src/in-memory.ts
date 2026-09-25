import { DomainError } from '../../core/src/index.js';
import type { WyrCategory, WyrPrompt, WyrRuntimeSession } from './types.js';
import type { WyrPromptRepository, WyrSessionRepository } from './repository.js';

const cloneSession=(s:WyrRuntimeSession):WyrRuntimeSession=>({
  ...s,
  data:{...s.data},
  openedAt:new Date(s.openedAt),
  expiresAt:new Date(s.expiresAt),
  votes:s.votes.map(v=>({...v,updatedAt:new Date(v.updatedAt)})),
});

export class InMemoryWyrPromptRepository implements WyrPromptRepository {
  private readonly history:{guildId:string;promptId:string;category:WyrCategory;usedAt:number}[]=[];
  constructor(private readonly prompts:readonly WyrPrompt[]){}
  async pick(category:WyrCategory,excludedIds:readonly string[],requiredExclusions:readonly string[]=[]):Promise<WyrPrompt>{
    const enabled=this.prompts.filter(p=>p.enabled&&p.category===category&&!requiredExclusions.includes(p.id));
    if(enabled.length===0)throw new DomainError('NO_WYR_PROMPTS',`No enabled WYR prompts exist for ${category}.`);
    const excluded=new Set(excludedIds);
    return enabled.find(p=>!excluded.has(p.id)) ?? enabled[0]!;
  }
  async rememberUsed(guildId:string,promptId:string,category:WyrCategory):Promise<void>{
    this.history.push({guildId,promptId,category,usedAt:Date.now()});
  }
  async recent(guildId:string,category:WyrCategory,limit:number):Promise<string[]>{
    return this.history.filter(h=>h.guildId===guildId&&h.category===category).slice(-Math.max(0,limit)).reverse().map(h=>h.promptId);
  }
}

export class InMemoryWyrSessionRepository implements WyrSessionRepository {
  private readonly sessions=new Map<string,WyrRuntimeSession>();
  async create(session:WyrRuntimeSession):Promise<void>{
    if(this.sessions.has(session.id))throw new DomainError('SESSION_EXISTS','WYR session already exists.');
    this.sessions.set(session.id,cloneSession(session));
  }
  async get(id:string):Promise<WyrRuntimeSession|null>{
    const s=this.sessions.get(id);return s?cloneSession(s):null;
  }
  async compareAndSwap(id:string,expectedVersion:number,next:WyrRuntimeSession):Promise<boolean>{
    const current=this.sessions.get(id);
    if(!current||current.version!==expectedVersion)return false;
    this.sessions.set(id,cloneSession(next));return true;
  }
  async attachMessage(id:string,messageId:string):Promise<void>{
    const current=this.sessions.get(id);if(!current)throw new DomainError('SESSION_NOT_FOUND','WYR session not found.');
    this.sessions.set(id,cloneSession({...current,messageId,version:current.version+1}));
  }
  async listOpen(guildId?:string,channelId?:string):Promise<WyrRuntimeSession[]>{
    return [...this.sessions.values()].filter(s=>s.state==='OPEN'&&(guildId===undefined||s.guildId===guildId)&&(channelId===undefined||s.channelId===channelId)).map(cloneSession);
  }
}

export class SequentialIdGenerator {
  private value=0;
  next(prefix:string):string{this.value+=1;return `${prefix}_${String(this.value).padStart(6,'0')}`;}
}
