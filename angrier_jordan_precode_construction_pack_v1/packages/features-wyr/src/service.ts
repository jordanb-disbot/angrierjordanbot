import { DomainError, TimerEngine, VotingEngine, invariant, type Clock } from '../../core/src/index.js';
import { renderWyrOpen, renderWyrResults } from './render.js';
import { WYR_CATEGORIES, type WyrCategory, type WyrCategoryInput, type WyrChoice, type WyrResults, type WyrRuntimeSession } from './types.js';
import type { WyrPromptRepository, WyrSessionRepository } from './repository.js';

export interface IdGenerator { next(prefix:string):string; }
export interface RandomSource { next():number; }
export const systemRandom:RandomSource={next:()=>Math.random()};

export interface StartWyrInput {
  guildId:string;
  channelId:string;
  ownerUserId:string;
  category:WyrCategoryInput;
  durationSeconds?:number;
  extensionSeconds?:number;
  enforceSinglePublicRound?:boolean;
  excludedPromptId?:string;
  messageId?:string;
}

export interface ClosedWyrRound { session:WyrRuntimeSession;results:WyrResults;svg:string; }

export class WyrService {
  constructor(
    private readonly prompts:WyrPromptRepository,
    private readonly sessions:WyrSessionRepository,
    private readonly clock:Clock,
    private readonly ids:IdGenerator,
    private readonly random:RandomSource=systemRandom,
  ){}

  async start(input:StartWyrInput):Promise<WyrRuntimeSession>{
    const duration=input.durationSeconds??60;
    const extension=input.extensionSeconds??30;
    invariant(duration>0,'INVALID_DURATION','WYR duration must be positive.');
    invariant(extension>=0,'INVALID_EXTENSION','WYR extension cannot be negative.');
    if(input.enforceSinglePublicRound??true){
      const existing=await this.sessions.listOpen(input.guildId,input.channelId);
      invariant(existing.length===0,'PARTY_ROUND_ACTIVE','A public party-game round is already active in this channel.');
    }
    const category=this.resolveCategory(input.category);
    const recent=await this.prompts.recent(input.guildId,category,100);
    const prompt=await this.prompts.pick(category,recent,input.excludedPromptId?[input.excludedPromptId]:[]);
    const now=this.clock.now();
    const timer=TimerEngine.create(now,duration);
    const session:WyrRuntimeSession={
      id:this.ids.next('wyr'),guildId:input.guildId,channelId:input.channelId,ownerUserId:input.ownerUserId,state:'OPEN',...(input.messageId?{messageId:input.messageId}:{}),
      data:{promptId:prompt.id,category,question:prompt.text,optionA:prompt.optionA,optionB:prompt.optionB,durationSeconds:duration,extensionSeconds:extension},
      openedAt:now,expiresAt:timer.expiresAt,extensionUsed:false,votes:[],version:0,
    };
    await this.sessions.create(session);
    await this.prompts.rememberUsed(input.guildId,prompt.id,category);
    return session;
  }

  async vote(sessionId:string,userId:string,choice:WyrChoice):Promise<WyrRuntimeSession>{
    invariant(choice==='A'||choice==='B','INVALID_CHOICE','Choose A or B.');
    return this.updateOpen(sessionId,s=>{
      invariant(this.clock.now()<s.expiresAt,'ROUND_EXPIRED','Voting has ended.');
      const now=this.clock.now();
      const voting=this.voting(s);voting.cast(userId,choice,now);
      s.votes=voting.snapshotForPersistence().map(v=>({userId:v.voterUserId,choice:v.choiceKey as WyrChoice,updatedAt:v.updatedAt}));
      return s;
    });
  }

  async extend(sessionId:string,actorUserId:string,isStaff=false):Promise<WyrRuntimeSession>{
    return this.updateOpen(sessionId,s=>{
      invariant(actorUserId===s.ownerUserId,'NOT_ALLOWED','Only the host may extend the round.');
      invariant(s.data.extensionSeconds>0,'EXTENSION_DISABLED','This round does not allow an extension.');
      const t=TimerEngine.extendOnce({openedAt:s.openedAt,expiresAt:s.expiresAt,extensionUsed:s.extensionUsed},s.data.extensionSeconds,this.clock.now());
      s.expiresAt=t.expiresAt;s.extensionUsed=t.extensionUsed;return s;
    });
  }

  async close(sessionId:string):Promise<ClosedWyrRound>{
    for(let attempt=0;attempt<4;attempt+=1){
      const current=await this.sessions.get(sessionId);
      if(!current)throw new DomainError('SESSION_NOT_FOUND','WYR session not found.');
      if(current.state==='CLOSED')return this.closedView(current);
      invariant(current.state==='OPEN','ROUND_CLOSED','This WYR round is not open.');
      invariant(this.clock.now()>=current.expiresAt,'NOT_DUE','Voting remains open.');
      const next=this.clone(current);next.state='CLOSED';next.version=current.version+1;
      if(await this.sessions.compareAndSwap(sessionId,current.version,next))return this.closedView(next);
    }
    throw new DomainError('SESSION_CONFLICT','WYR round changed concurrently. Retry the operation.');
  }

  async replay(sourceSessionId:string,actorUserId:string,messageId?:string):Promise<WyrRuntimeSession>{
    const source=await this.sessions.get(sourceSessionId);
    if(!source)throw new DomainError('SESSION_NOT_FOUND','WYR session not found.');
    invariant(source.state==='CLOSED','ROUND_NOT_COMPLETE','Play Again is available after results close.');
    return this.start({
      guildId:source.guildId,channelId:source.channelId,ownerUserId:actorUserId,category:source.data.category,
      durationSeconds:source.data.durationSeconds,extensionSeconds:source.data.extensionSeconds,enforceSinglePublicRound:true,
      excludedPromptId:source.data.promptId,
      ...(messageId?{messageId}:{}),
    });
  }

  async attachMessage(sessionId:string,messageId:string):Promise<WyrRuntimeSession>{
    invariant(messageId.trim().length>0,'INVALID_MESSAGE_ID','Discord message ID is required.');
    await this.sessions.attachMessage(sessionId,messageId);
    return this.get(sessionId);
  }

  async get(sessionId:string):Promise<WyrRuntimeSession>{
    const session=await this.sessions.get(sessionId);
    if(!session)throw new DomainError('SESSION_NOT_FOUND','WYR session not found.');
    return session;
  }

  async recover():Promise<{active:WyrRuntimeSession[];expired:WyrRuntimeSession[]}>{
    const open=await this.sessions.listOpen();const now=this.clock.now();
    return {active:open.filter(s=>s.expiresAt>now),expired:open.filter(s=>s.expiresAt<=now)};
  }

  async recoverAndCloseExpired():Promise<{active:WyrRuntimeSession[];closed:ClosedWyrRound[]}>{
    const recovered=await this.recover();
    const closed:ClosedWyrRound[]=[];
    for(const session of recovered.expired)closed.push(await this.close(session.id));
    return {active:recovered.active,closed};
  }

  renderOpen(session:WyrRuntimeSession):string{
    invariant(session.state==='OPEN','ROUND_CLOSED','Only an open WYR round can render as open.');
    const remaining=Math.max(0,Math.ceil((session.expiresAt.getTime()-this.clock.now().getTime())/1000));
    return renderWyrOpen(session,remaining);
  }

  results(session:WyrRuntimeSession):WyrResults{
    const counts=this.voting(session).results(),A=counts.A??0,B=counts.B??0,total=A+B;
    return {A,B,total,winner:total===0?'NONE':A===B?'TIE':A>B?'A':'B'};
  }

  private closedView(session:WyrRuntimeSession):ClosedWyrRound{
    const results=this.results(session);
    const svg=renderWyrResults(session,results);
    return {session,results,svg};
  }

  private voting(session:WyrRuntimeSession){const engine=new VotingEngine({anonymous:true,editable:true,hiddenUntilClose:true,eligibleChoices:['A','B']});for(const v of session.votes)engine.cast(v.userId,v.choice,v.updatedAt);return engine;}

  private resolveCategory(input:WyrCategoryInput):WyrCategory{
    if(input!=='Random')return input;
    const raw=this.random.next();const safe=Number.isFinite(raw)?Math.max(0,Math.min(0.999999999,raw)):0;
    return WYR_CATEGORIES[Math.floor(safe*WYR_CATEGORIES.length)]!;
  }

  private async updateOpen(sessionId:string,mutate:(session:WyrRuntimeSession)=>WyrRuntimeSession):Promise<WyrRuntimeSession>{
    for(let attempt=0;attempt<4;attempt+=1){
      const current=await this.sessions.get(sessionId);
      if(!current)throw new DomainError('SESSION_NOT_FOUND','WYR session not found.');
      invariant(current.state==='OPEN','ROUND_CLOSED','This WYR round is closed.');
      const next=mutate(this.clone(current));next.version=current.version+1;
      if(await this.sessions.compareAndSwap(sessionId,current.version,next))return next;
    }
    throw new DomainError('SESSION_CONFLICT','WYR round changed concurrently. Retry the operation.');
  }

  private clone(session:WyrRuntimeSession):WyrRuntimeSession{
    return {...session,data:{...session.data},openedAt:new Date(session.openedAt),expiresAt:new Date(session.expiresAt),votes:session.votes.map(v=>({...v,updatedAt:new Date(v.updatedAt)}))};
  }
}
