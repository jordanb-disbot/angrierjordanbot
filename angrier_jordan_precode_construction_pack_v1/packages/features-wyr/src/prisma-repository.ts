import { DomainError } from '../../core/src/index.js';
import type { WyrCategory, WyrPrompt, WyrRuntimeSession, WyrVote } from './types.js';
import type { WyrPromptRepository, WyrSessionRepository } from './repository.js';

interface ContentRow { id:string;category:string|null;payload:unknown;enabled:boolean; }
interface HistoryRow { contentId:string; }
interface VoteRow { voterUserId:string;choiceKey:string;updatedAt:Date; }
interface SessionRow { id:string;guildId:string;channelId:string;ownerUserId:string|null;messageId:string|null;state:string;data:unknown;expiresAt:Date|null;extensionUsed:boolean;version:number;createdAt:Date;votes?:VoteRow[]; }
interface UpdateManyResult { count:number; }

interface PrismaTxLike {
  gameSession:{create(args:unknown):Promise<unknown>;updateMany(args:unknown):Promise<UpdateManyResult>};
  vote:{upsert(args:unknown):Promise<unknown>};
  scheduledJob:{create(args:unknown):Promise<unknown>;updateMany(args:unknown):Promise<UpdateManyResult>};
}
export interface WyrPrismaLike extends PrismaTxLike {
  contentEntry:{findMany(args:unknown):Promise<ContentRow[]>;update(args:unknown):Promise<unknown>};
  contentUseHistory:{findMany(args:unknown):Promise<HistoryRow[]>;create(args:unknown):Promise<unknown>};
  gameSession:{
    create(args:unknown):Promise<unknown>;
    findUnique(args:unknown):Promise<SessionRow|null>;
    findMany(args:unknown):Promise<SessionRow[]>;
    updateMany(args:unknown):Promise<UpdateManyResult>;
  };
  vote:{upsert(args:unknown):Promise<unknown>};
  $transaction<T>(fn:(tx:PrismaTxLike)=>Promise<T>):Promise<T>;
}

const asObject=(value:unknown):Record<string,unknown>=>value!==null&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:{};
const asString=(value:unknown,key:string):string=>{if(typeof value!=='string'||value.trim()==='')throw new DomainError('INVALID_CONTENT',`WYR content is missing ${key}.`);return value;};

export class PrismaWyrPromptRepository implements WyrPromptRepository {
  constructor(private readonly db:WyrPrismaLike,private readonly random:()=>number=()=>Math.random()){}
  async pick(category:WyrCategory,excludedIds:readonly string[],requiredExclusions:readonly string[]=[]):Promise<WyrPrompt>{
    const base={game:'wyr',category,enabled:true};
    let rows=await this.db.contentEntry.findMany({where:{...base,id:{notIn:[...excludedIds,...requiredExclusions]}},orderBy:{id:'asc'}});
    if(rows.length===0&&excludedIds.length)rows=await this.db.contentEntry.findMany({where:{...base,...(requiredExclusions.length?{id:{notIn:[...requiredExclusions]}}:{})},orderBy:{id:'asc'}});
    if(rows.length===0)throw new DomainError('NO_WYR_PROMPTS',`No enabled WYR prompts exist for ${category}.`);
    const raw=this.random();const index=Math.floor(Math.max(0,Math.min(0.999999999,Number.isFinite(raw)?raw:0))*rows.length);
    const row=rows[index]!;const payload=asObject(row.payload);
    return {id:row.id,category,text:asString(payload.text,'text'),optionA:asString(payload.optionA,'optionA'),optionB:asString(payload.optionB,'optionB'),enabled:row.enabled};
  }
  async rememberUsed(guildId:string,promptId:string,category:WyrCategory):Promise<void>{
    await this.db.contentUseHistory.create({data:{guildId,contentId:promptId,game:'wyr',category}});
    await this.db.contentEntry.update({where:{id:promptId},data:{useCount:{increment:1},lastUsedAt:new Date()}});
  }
  async recent(guildId:string,category:WyrCategory,limit:number):Promise<string[]>{
    const rows=await this.db.contentUseHistory.findMany({where:{guildId,game:'wyr',category},orderBy:{usedAt:'desc'},take:Math.max(0,limit)});
    return rows.map(r=>r.contentId);
  }
}

export class PrismaWyrSessionRepository implements WyrSessionRepository {
  constructor(private readonly db:WyrPrismaLike){}
  async create(session:WyrRuntimeSession):Promise<void>{
    await this.db.$transaction(async tx=>{await tx.gameSession.create({data:{
      id:session.id,guildId:session.guildId,type:'wyr',channelId:session.channelId,ownerUserId:session.ownerUserId,...(session.messageId===undefined?{}:{messageId:session.messageId}),state:session.state,
      data:{...session.data,openedAt:session.openedAt.toISOString()},expiresAt:session.expiresAt,extensionUsed:session.extensionUsed,version:session.version,
    }});await tx.scheduledJob.create({data:{guildId:session.guildId,jobType:'wyr.close',executionKey:'wyr:close:'+session.id,dueAt:session.expiresAt,payload:{guildId:session.guildId,sessionId:session.id}}});await tx.scheduledJob.create({data:{guildId:session.guildId,jobType:'wyr.publish',executionKey:'wyr:publish:'+session.id,dueAt:session.openedAt,payload:{guildId:session.guildId,channelId:session.channelId,sessionId:session.id,deliveryState:'PENDING'}}});});
  }
  async get(id:string):Promise<WyrRuntimeSession|null>{
    const row=await this.db.gameSession.findUnique({where:{id,type:'wyr'},include:{votes:{where:{questionKey:'main'},orderBy:{updatedAt:'asc'}}}});
    return row?this.map(row):null;
  }
  async compareAndSwap(id:string,expectedVersion:number,next:WyrRuntimeSession):Promise<boolean>{
    return this.db.$transaction(async tx=>{
      const updated=await tx.gameSession.updateMany({where:{id,version:expectedVersion},data:{state:next.state,data:{...next.data,openedAt:next.openedAt.toISOString()},expiresAt:next.expiresAt,extensionUsed:next.extensionUsed,version:next.version}});
      if(updated.count!==1)return false;
      if(next.state==='OPEN')await tx.scheduledJob.updateMany({where:{executionKey:'wyr:close:'+id},data:{dueAt:next.expiresAt}});
      for(const vote of next.votes){
        await tx.vote.upsert({where:{sessionId_voterUserId_questionKey:{sessionId:id,voterUserId:vote.userId,questionKey:'main'}},create:{sessionId:id,voterUserId:vote.userId,questionKey:'main',choiceKey:vote.choice,anonymous:true,updatedAt:vote.updatedAt},update:{choiceKey:vote.choice,anonymous:true,updatedAt:vote.updatedAt}});
      }
      return true;
    });
  }
  async attachMessage(id:string,messageId:string):Promise<void>{
    const result=await this.db.gameSession.updateMany({where:{id,type:'wyr'},data:{messageId,version:{increment:1}}});
    if(result.count!==1)throw new DomainError('SESSION_NOT_FOUND','WYR session not found.');
  }
  async listOpen(guildId?:string,channelId?:string):Promise<WyrRuntimeSession[]>{
    const rows=await this.db.gameSession.findMany({where:{type:'wyr',state:'OPEN',...(guildId===undefined?{}:{guildId}),...(channelId===undefined?{}:{channelId})},include:{votes:{where:{questionKey:'main'},orderBy:{updatedAt:'asc'}}},orderBy:{createdAt:'asc'}});
    return rows.map(r=>this.map(r));
  }
  private map(row:SessionRow):WyrRuntimeSession{
    const data=asObject(row.data);const openedRaw=data.openedAt;
    const openedAt=typeof openedRaw==='string'?new Date(openedRaw):row.createdAt;
    const expiresAt=row.expiresAt??openedAt;
    const votes:WyrVote[]=(row.votes??[]).filter(v=>v.choiceKey==='A'||v.choiceKey==='B').map(v=>({userId:v.voterUserId,choice:v.choiceKey as 'A'|'B',updatedAt:new Date(v.updatedAt)}));
    const category=asString(data.category,'category') as WyrCategory;
    return {id:row.id,guildId:row.guildId,channelId:row.channelId,ownerUserId:row.ownerUserId??'',...(row.messageId===null?{}:{messageId:row.messageId}),state:row.state==='CLOSED'?'CLOSED':row.state==='CANCELLED'?'CANCELLED':'OPEN',data:{promptId:asString(data.promptId,'promptId'),category,question:asString(data.question,'question'),optionA:asString(data.optionA,'optionA'),optionB:asString(data.optionB,'optionB'),durationSeconds:Number(data.durationSeconds??60),extensionSeconds:Number(data.extensionSeconds??30)},openedAt,expiresAt:new Date(expiresAt),extensionUsed:row.extensionUsed,votes,version:row.version};
  }
}
