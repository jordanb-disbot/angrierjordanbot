import {DiscordAPIError,type Guild} from 'discord.js';
import type {PrismaClient} from '@prisma/client';
import type {PrismaFamilyRepository} from '../../../../packages/features-family/src/prisma-repository.js';

type Presence={userId:string;joinedAt:Date|null;leftAt:Date|null};
type Estate={id:string;ownerUserId:string|null;state:string;createdAt:Date};
type Tracked={userId:string;presence:Presence|null};
type HumanState={present:boolean;bot:boolean;joinedAt:Date|null};
export interface FamilyMembershipStore {
  tracked(guildId:string,before:Date):Promise<Tracked[]>;
  estates(guildId:string):Promise<Estate[]>;
  markAbsent(guildId:string,userId:string,detectedAt:Date):Promise<Presence>;
  markPresent(guildId:string,userId:string,prior:Presence|null,joinedAt:Date):Promise<void>;
}
export interface FamilyMembershipCensus {
  guildId:string;
  /** Must resolve only after all chunks of an authoritative full census arrive. */
  fetch():Promise<{available:boolean;expectedCount:number;members:Map<string,{bot:boolean;joinedAt?:Date|null}>}>;
  /** Fresh member lookup; only Unknown Member may become absent, never an outage. */
  lookup(userId:string):Promise<HumanState>;
}
const pending=(state:string)=>['OPEN','LOCKED','SETTLING'].includes(state);

export class FamilyMembershipChanged extends Error {
  constructor(){super('Family membership changed during reconciliation; retry with a fresh census.');}
}

/** One v1 worker serializes membership writes and estate work; gateway observations invalidate stale censuses. */
export class FamilyMembershipRecovery {
  private tail:Promise<unknown>=Promise.resolve();
  private revision=0;
  private reconciled=false;
  private pendingObservations=new Set<number>();
  get ready(){return this.reconciled&&this.pendingObservations.size===0;}
  get generation(){return this.revision;}
  transactionGeneration(){if(!this.ready)throw new Error('Family membership recovery is not ready.');return this.revision;}
  suspend(){this.reconciled=false;}
  private enqueue<T>(work:()=>Promise<T>):Promise<T>{
    const result=this.tail.then(work);
    this.tail=result.catch(()=>undefined);
    return result;
  }
  observe(){const revision=++this.revision;this.pendingObservations.add(revision);return revision;}
  live<T>(work:()=>Promise<T>,observation?:number):Promise<T>{
    return this.enqueue(async()=>{
      try{return await work();}catch(error){this.reconciled=false;throw error;}
      finally{if(observation!==undefined)this.pendingObservations.delete(observation);}
    });
  }
  initialize(work:(assertCurrent:()=>void)=>Promise<unknown>):Promise<void>{
    return this.enqueue(async()=>{
      this.reconciled=false;
      for(let attempt=0;attempt<3;attempt++){
        const revision=this.revision;
        const assertCurrent=()=>{if(revision!==this.revision)throw new FamilyMembershipChanged();};
        try{await work(assertCurrent);assertCurrent();this.reconciled=true;return;}
        catch(error){if(!(error instanceof FamilyMembershipChanged)||attempt===2)throw error;}
      }
    });
  }
  scheduled<T>(work:()=>Promise<T>,enabled?:()=>Promise<boolean>):Promise<T>{
    return this.enqueue(async()=>{
      if(enabled&&!await enabled()){this.suspend();throw new Error('Family runtime disabled; retain pending work.');}
      if(!this.ready)throw new Error('Family membership recovery is not ready.');
      return work();
    });
  }
}

/** A gateway join remains evidence of a new membership even if another leave is already observed. */
export async function applyFamilyGatewayReturn(input:{guildId:string;channelId:string;userId:string;joinedAt:Date;prior:Presence|null;estates:Estate[];store:FamilyMembershipStore;repository:Pick<PrismaFamilyRepository,'rejoin'>}){
  const {guildId,channelId,userId,joinedAt,prior,repository}=input;
  if(!Number.isFinite(joinedAt.getTime()))throw new Error('Family member has no authoritative join timestamp.');
  // Replayed old join events cannot erase a later departure or replace a newer membership.
  if(prior?.joinedAt&&(joinedAt<prior.joinedAt||(joinedAt.getTime()===prior.joinedAt.getTime()&&prior.leftAt&&prior.leftAt>=joinedAt)))return false;
  await repository.rejoin({guildId,channelId,userId,requestKey:'member-rejoin-v2:'+userId+':'+joinedAt.toISOString()},joinedAt);
  return true;
}

/** No clock inferred from startup or an old epoch is used to shorten the grace period. */
export async function reconcileFamilyMembership(input:{guildId:string;channelId:string;store:FamilyMembershipStore;census:FamilyMembershipCensus;repository:Pick<PrismaFamilyRepository,'depart'|'rejoin'>;now?:()=>Date;assertCurrent?:()=>void}){
  const {guildId,channelId,store,census,repository}=input;
  const assertCurrent=input.assertCurrent??(()=>{});
  if(census.guildId!==guildId)throw new Error('Family census server mismatch.');
  const startedAt=(input.now??(()=>new Date()))();
  const snapshot=await census.fetch();
  assertCurrent();
  if(!snapshot.available||!Number.isSafeInteger(snapshot.expectedCount)||snapshot.expectedCount<1||snapshot.members.size!==snapshot.expectedCount)throw new Error('Family census is incomplete; membership unchanged.');
  const [tracked,estates]=await Promise.all([store.tracked(guildId,startedAt),store.estates(guildId)]);
  const actions:Array<{member:Tracked;state:HumanState;estates:Estate[]}>=[];
  // Finish all fresh lookups before mutation: a failed lookup cannot be mistaken for absence.
  for(const member of tracked){
    const own=estates.filter(row=>row.ownerUserId===member.userId).sort((a,b)=>b.createdAt.getTime()-a.createdAt.getTime());
    const current=snapshot.members.get(member.userId);
    if(current?.bot)continue;
    if(current?.joinedAt&&member.presence?.joinedAt?.getTime()===current.joinedAt.getTime()&&!member.presence.leftAt&&!own.some(row=>pending(row.state)))continue;
    const state=await census.lookup(member.userId);
    if(state.present&&!state.bot&&(!state.joinedAt||!Number.isFinite(state.joinedAt.getTime())))throw new Error('Family census member has no authoritative join timestamp.');
    if(!state.bot)actions.push({member,state,estates:own});
  }
  let departed=0,returned=0;
  for(const action of actions){
    assertCurrent();
    const {member,estates:own}=action;
    // Plans are only hints: a member can return while other members are being looked up.
    const state=await census.lookup(member.userId);
    assertCurrent();
    if(state.bot)continue;
    if(state.present){
      if(!state.joinedAt||!Number.isFinite(state.joinedAt.getTime()))throw new Error('Family census member has no authoritative join timestamp.');
      const open=own.filter(row=>pending(row.state));
      if(!open.length&&!member.presence?.leftAt&&member.presence?.joinedAt?.getTime()===state.joinedAt.getTime())continue;
      const returnKey=open.length?open.map(row=>row.id).sort().join(':'):member.presence?.leftAt?.toISOString();
      await repository.rejoin({guildId,channelId,userId:member.userId,requestKey:'membership-return-v2:'+member.userId+':'+state.joinedAt.toISOString()+':'+(returnKey??'presence')},state.joinedAt,true);
      if(returnKey)returned++;
      assertCurrent();
      continue;
    }
    const presence=await store.markAbsent(guildId,member.userId,startedAt);
    assertCurrent();
    // Retain any already-recorded departure for this membership, including a completed estate.
    // A later authoritative joinedAt establishes a new membership and permits another estate.
    const existing=own.some(row=>pending(row.state)||(!presence.joinedAt||row.createdAt>=presence.joinedAt));
    if(existing)continue;
    if(!presence.leftAt)throw new Error('Family departure snapshot was not persisted.');
    await repository.depart({guildId,channelId,userId:member.userId,requestKey:'membership-absence:'+member.userId+':'+presence.leftAt.toISOString()},'unavailable');
    departed++;
  }
  assertCurrent();
  return{departed,returned};
}

export function prismaFamilyMembershipStore(db:PrismaClient):FamilyMembershipStore{
  return{
    tracked:(guildId,before)=>db.member.findMany({where:{guildId,createdAt:{lte:before}},select:{userId:true,presence:{select:{userId:true,joinedAt:true,leftAt:true}}}}),
    estates:guildId=>db.gameSession.findMany({where:{guildId,type:'family_estate'},select:{id:true,ownerUserId:true,state:true,createdAt:true}}),
    async markAbsent(guildId,userId,detectedAt){
      await db.memberPresenceState.upsert({where:{guildId_userId:{guildId,userId}},create:{guildId,userId,leftAt:detectedAt},update:{}});
      await db.memberPresenceState.updateMany({where:{guildId,userId,leftAt:null},data:{leftAt:detectedAt}});
      return db.memberPresenceState.findUniqueOrThrow({where:{guildId_userId:{guildId,userId}},select:{userId:true,joinedAt:true,leftAt:true}});
    },
    async markPresent(guildId,userId,prior,joinedAt){
      if(prior)await db.memberPresenceState.updateMany({where:{guildId,userId,leftAt:prior.leftAt,joinedAt:prior.joinedAt},data:{leftAt:null,joinedAt}});
      else await db.memberPresenceState.upsert({where:{guildId_userId:{guildId,userId}},create:{guildId,userId,joinedAt},update:{}});
    },
  };
}

export function discordFamilyMembershipCensus(guild:Guild):FamilyMembershipCensus{
  return{
    guildId:guild.id,
    async fetch(){
      if(!guild.available)throw new Error('Family census server unavailable.');
      // Guild#memberCount is gateway state and can lag a complete REST member
      // listing.  A stale count must not indefinitely pause Family recovery, but
      // neither may a moving/incomplete listing drive estate mutations.  Require
      // two consecutive complete REST listings with the same membership before
      // accepting the snapshot; a continuously changing guild fails closed.
      const stable=(left:Map<string,{bot:boolean;joinedAt:Date|null}>,right:Map<string,{bot:boolean;joinedAt:Date|null}>)=>left.size===right.size&&[...left].every(([id,member])=>{
        const other=right.get(id);
        if(!other)return false;
        return other.bot===member.bot&&other.joinedAt?.getTime()===member.joinedAt?.getTime();
      });
      for(let attempt=0;attempt<3;attempt++){
        const read=async()=>{
          const members=await guild.members.fetch({withPresences:false});
          return new Map([...members].map(([id,member])=>[id,{bot:member.user.bot,joinedAt:member.joinedAt}]));
        };
        const first=await read();
        if(!guild.available)throw new Error('Family census server unavailable.');
        const second=await read();
        if(!guild.available)throw new Error('Family census server unavailable.');
        if(stable(first,second))return{available:true,expectedCount:second.size,members:second};
      }
      throw new Error('Family census changed during REST reconciliation.');
    },
    async lookup(userId){
      if(!guild.available)throw new Error('Family census server unavailable.');
      try{const member=await guild.members.fetch({user:userId,force:true});return{present:true,bot:member.user.bot,joinedAt:member.joinedAt};}
      catch(error){
        if(!(error instanceof DiscordAPIError)||error.code!==10007)throw error;
        const user=await guild.client.users.fetch(userId,{force:true});
        return{present:false,bot:user.bot,joinedAt:null};
      }
    },
  };
}
