import {randomUUID} from 'node:crypto';
import {Prisma,type PrismaClient} from '@prisma/client';
import {DomainError,SessionEngine,TimerEngine,type LedgerEngine,type Session} from '../../core/src/index.js';
import {PrismaAtomicOperations,requestFingerprint} from '../../database/src/atomic-operations.js';
import {PrismaTransactionSessions} from '../../database/src/transaction-sessions.js';
import {PrismaWagerEscrow} from '../../database/src/wager-escrow.js';
import {autoFleet,boardMove,createBoard,fire,other,validateFleet,type Board,type Fleet,type PvpGame,type Seat} from './domain.js';
export interface PvpContext {guildId:string;channelId:string;userId:string;requestKey:string;}
export interface PvpPolicy {enabled:boolean;minWager:bigint;maxWager:bigint;}
export interface PvpPlayer {userId:string;name:string;}
export interface PvpData {game:PvpGame;players:[PvpPlayer,PvpPlayer];wager:string;phase:'challenge'|'placement'|'playing'|'finished';board:Board;ready:[boolean,boolean];acceptedAt?:string;winnerId?:string;result?:'win'|'draw'|'forfeit'|'timeout'|'cancelled'|'declined'|'expired';paid?:string;finishedAt?:string;}
export type PvpAction={kind:'accept'}|{kind:'cancel'}|{kind:'decline'}|{kind:'move';choice:number}|{kind:'place';fleet?:Fleet}|{kind:'forfeit';confirmed:boolean};
const json=(v:unknown)=>JSON.parse(JSON.stringify(v)) as Prisma.InputJsonObject;
const activeStates=['OPEN','LOCKED','SETTLING'] as const;
export function validatePvpPolicy(policy:PvpPolicy,wager:bigint){if(policy.enabled!==true)throw new DomainError('PVP_DISABLED','Skill games are not enabled yet.');if(policy.minWager<1n||policy.maxWager<policy.minWager||policy.maxWager>1_000_000_000n)throw new DomainError('PVP_CONFIG','Skill-game wager settings are invalid.');if(wager<0n||wager>0n&&(wager<policy.minWager||wager>policy.maxWager))throw new DomainError('PVP_WAGER',`Choose a free game or wager ${policy.minWager}–${policy.maxWager} Ottomans each.`);}
export class PrismaPvpRepository {
 private readonly atomic:PrismaAtomicOperations;
 constructor(private readonly db:PrismaClient,private readonly clock:()=>Date=()=>new Date(),private readonly rng?:(max:number)=>number){this.atomic=new PrismaAtomicOperations(db);}
 async get(id:string){const row=await this.db.gameSession.findUnique({where:{id}});if(!row||row.type!=='pvp')throw new DomainError('PVP_MISSING','This match is unavailable.');return{...row,data:row.data as unknown as PvpData};}
 async active(){return this.db.gameSession.findMany({where:{type:'pvp',state:{in:[...activeStates]}}});}
 async linkMessage(id:string,guildId:string,messageId:string){await this.db.gameSession.updateMany({where:{id,guildId,type:'pvp',messageId:null},data:{messageId}});}
 private async session(tx:Prisma.TransactionClient,c:PvpContext,id:string){const s=await new PrismaTransactionSessions(tx).get<PvpData>(id);if(!s||s.type!=='pvp'||s.guildId!==c.guildId||s.channelId!==c.channelId)throw new DomainError('PVP_MISSING','Use this match in its original channel.');const seat=s.data.players.findIndex(p=>p.userId===c.userId);if(seat<0)throw new DomainError('PVP_PLAYER','Only the two named members may control this match.');return{s,seat:seat as Seat};}
 private async available(tx:Prisma.TransactionClient,guildId:string,players:PvpPlayer[],except?:string){if(await tx.gameSession.findFirst({where:{guildId,type:'pvp',state:{in:[...activeStates]},...(except?{id:{not:except}}:{}),participants:{some:{userId:{in:players.map(p=>p.userId)}}}}}))throw new DomainError('PVP_ACTIVE','Both members must finish their current skill-game challenge or match first.');}
 async challenge(c:PvpContext,game:PvpGame,players:[PvpPlayer,PvpPlayer],wager:bigint,policy:PvpPolicy){validatePvpPolicy(policy,wager);return this.atomic.run(c.guildId,'pvp:start:'+c.requestKey,requestFingerprint({channelId:c.channelId,userId:c.userId,game,players,wager}),tx=>this.create(tx,c,game,players,wager));}
 private async create(tx:Prisma.TransactionClient,c:PvpContext,game:PvpGame,players:[PvpPlayer,PvpPlayer],wager:bigint){
  if(players[0].userId!==c.userId||players[0].userId===players[1].userId||players.some(p=>!p.userId))throw new DomainError('PVP_TARGET','Challenge another eligible member.');await this.available(tx,c.guildId,players);
  const now=this.clock(),id=randomUUID(),expiresAt=TimerEngine.create(now,120).expiresAt,data:PvpData={game,players,wager:wager.toString(),phase:'challenge',board:createBoard(game),ready:[false,false]};
  await new PrismaTransactionSessions(tx).create({id,guildId:c.guildId,channelId:c.channelId,ownerUserId:c.userId,type:'pvp',state:'OPEN',data:json(data),expiresAt,extensionUsed:false,version:0,createdAt:now,updatedAt:now});
  await tx.gameParticipant.createMany({data:players.map((p,seat)=>({sessionId:id,userId:p.userId,role:seat===0?'challenger':'opponent'}))});await this.schedule(tx,c.guildId,id,0,expiresAt);return{sessionId:id};
 }
 async replay(c:PvpContext,id:string,policy:PvpPolicy){return this.atomic.run(c.guildId,'pvp:replay:'+c.requestKey,requestFingerprint({id,userId:c.userId,channelId:c.channelId}),async tx=>{const{s,seat}=await this.session(tx,c,id);if(s.state!=='CLOSED')throw new DomainError('PVP_REPLAY','Complete this match before playing again.');const wager=BigInt(s.data.wager);validatePvpPolicy(policy,wager);return this.create(tx,c,s.data.game,[s.data.players[seat],s.data.players[other(seat)]],wager);});}
 async act(c:PvpContext,id:string,version:number,action:PvpAction,policy:PvpPolicy){return this.atomic.run(c.guildId,'pvp:act:'+c.requestKey,requestFingerprint({id,userId:c.userId,channelId:c.channelId,version,action}),async(tx,ledger)=>{
  const{s,seat}=await this.session(tx,c,id);if(!policy.enabled)throw new DomainError('PVP_DISABLED','Skill games are not enabled yet.');if(s.version!==version||!['OPEN','LOCKED'].includes(s.state))throw new DomainError('PVP_CHANGED','This match changed. Use its latest controls.');if(!s.expiresAt||s.expiresAt<=this.clock())throw new DomainError('PVP_EXPIRED','The deadline passed. The match result will appear shortly.');
  const data=structuredClone(s.data);
  if(action.kind==='cancel'||action.kind==='decline'){
   if(s.state!=='OPEN'||(action.kind==='cancel'?seat!==0:seat!==1))throw new DomainError('PVP_CHALLENGE','Only the challenger may cancel and only the opponent may decline before acceptance.');await this.cancelInside(tx,s,action.kind==='cancel'?'cancelled':'declined');return{sessionId:id};
  }
  if(action.kind==='accept'){
   if(s.state!=='OPEN'||seat!==1)throw new DomainError('PVP_ACCEPT','Only the challenged member may accept.');validatePvpPolicy(policy,BigInt(data.wager));await this.available(tx,c.guildId,data.players,id);
   const wager=BigInt(data.wager),escrow=new PrismaWagerEscrow(tx,ledger);if(wager>0n)for(const p of data.players){const funded=await escrow.reserve({guildId:c.guildId,userId:p.userId,amount:wager,referenceType:'pvp',referenceId:id,key:'pvp:reserve:'+id+':'+p.userId});await tx.wager.create({data:{sessionId:id,userId:p.userId,selectionKey:p.userId,amount:wager,escrowId:funded.id}});}
   data.acceptedAt=this.clock().toISOString();data.phase=data.game==='battleship'?'placement':'playing';await this.advanceInside(tx,s,data);return{sessionId:id};
  }
  if(s.state!=='LOCKED')throw new DomainError('PVP_ACCEPT','The opponent must accept before playing.');
  if(action.kind==='forfeit'){if(action.confirmed!==true)throw new DomainError('PVP_CONFIRM','Confirm Forfeit Match before ending it.');await this.finish(tx,ledger,s,data,'forfeit',other(seat));return{sessionId:id};}
  if(data.board.turn!==seat)throw new DomainError('PVP_TURN','Wait for your turn.');
  if(action.kind==='place'){
   if(data.game!=='battleship'||data.phase!=='placement'||data.ready[seat])throw new DomainError('PVP_PLACEMENT','Fleet placement is unavailable.');const fleet=action.fleet?validateFleet(action.fleet):autoFleet(this.rng);await tx.gameParticipant.update({where:{sessionId_userId:{sessionId:id,userId:c.userId}},data:{data:json({fleet})}});data.ready[seat]=true;data.board.turn=other(seat);if(data.ready.every(Boolean)){data.phase='playing';data.board.turn=0;}await this.advanceInside(tx,s,data);return{sessionId:id};
  }
  if(data.phase!=='playing')throw new DomainError('PVP_PLACEMENT','Both members must place their fleet first.');
  let result:ReturnType<typeof boardMove>;
  if(data.game==='battleship'){const participant=await tx.gameParticipant.findUniqueOrThrow({where:{sessionId_userId:{sessionId:id,userId:data.players[other(seat)].userId}}});const privateData=participant.data as unknown as {fleet:Fleet};result=fire(data.board,seat,action.choice,privateData.fleet);}else result=boardMove(data.board,seat,action.choice);
  data.board=result.board;if(result.winner!==undefined)await this.finish(tx,ledger,s,data,'win',result.winner);else if(result.draw)await this.finish(tx,ledger,s,data,'draw');else await this.advanceInside(tx,s,data);return{sessionId:id};
 });}
 private async schedule(tx:Prisma.TransactionClient,guildId:string,id:string,version:number,dueAt:Date){await tx.scheduledJob.create({data:{guildId,jobType:'pvp.expire',executionKey:`pvp:expire:${id}:${version}`,dueAt,payload:{guildId,sessionId:id,version}}});}
 private async advanceInside(tx:Prisma.TransactionClient,s:Session<PvpData>,data:PvpData){const expiresAt=TimerEngine.create(this.clock(),300).expiresAt,next=await new SessionEngine(new PrismaTransactionSessions(tx)).transition<PvpData>(s.id,['OPEN','LOCKED'],'LOCKED',current=>({...current,data,expiresAt}));await this.schedule(tx,s.guildId,s.id,next.version,expiresAt);}
 private async cancelInside(tx:Prisma.TransactionClient,s:Session<PvpData>,result:'cancelled'|'declined'|'expired'){await new SessionEngine(new PrismaTransactionSessions(tx)).transition<PvpData>(s.id,['OPEN'],'CANCELLED',current=>({...current,data:{...current.data,phase:'finished',result,paid:'0',finishedAt:this.clock().toISOString()}}));}
 /** Publication failures may only cancel an unfunded challenge. Active financial matches persist for recovery. */
 async cancelUnpublished(guildId:string,id:string){return this.atomic.run(guildId,'pvp:unpublished:'+id,id,async tx=>{const s=await new PrismaTransactionSessions(tx).get<PvpData>(id);if(!s||s.type!=='pvp'||s.guildId!==guildId)throw new DomainError('PVP_MISSING','Match unavailable.');if(s.state==='OPEN')await this.cancelInside(tx,s,'cancelled');return{sessionId:id};});}
 async expire(guildId:string,id:string,version:number){return this.atomic.run(guildId,`pvp:expire:${id}:${version}`,id,async(tx,ledger)=>{const s=await new PrismaTransactionSessions(tx).get<PvpData>(id);if(!s||s.type!=='pvp'||s.guildId!==guildId)throw new DomainError('PVP_MISSING','Match unavailable.');if(s.version!==version||!['OPEN','LOCKED'].includes(s.state))return{sessionId:id};if(!s.expiresAt||s.expiresAt>this.clock())throw new DomainError('NOT_DUE','This match deadline has not passed.');if(s.state==='OPEN')await this.cancelInside(tx,s,'expired');else await this.finish(tx,ledger,s,s.data,'timeout',other(s.data.board.turn));return{sessionId:id};});}
 private async finish(tx:Prisma.TransactionClient,ledger:LedgerEngine,s:Session<PvpData>,data:PvpData,result:'win'|'draw'|'forfeit'|'timeout',winner?:Seat){
  const engine=new SessionEngine(new PrismaTransactionSessions(tx)),escrow=new PrismaWagerEscrow(tx,ledger),stake=BigInt(data.wager),winnerId=winner===undefined?undefined:data.players[winner].userId;
  await engine.transition<PvpData>(s.id,['LOCKED'],'SETTLING');if(stake>0n){if(winnerId===undefined)await escrow.refund(s.guildId,'pvp',s.id,'pvp:draw:'+s.id);else{const settled=await escrow.settle(s.guildId,'pvp',s.id,new Map([[winnerId,stake*2n]]),'pvp:win:'+s.id);if(settled.reserved!==stake*2n)throw new DomainError('PVP_ESCROW','Match funding does not match the accepted wager.');}}
  for(const p of data.players)for(const gameKey of [data.game,'skill_games']){const wins=Number(p.userId===winnerId),draws=Number(winnerId===undefined),losses=Number(winnerId!==undefined&&p.userId!==winnerId);await tx.memberGameStats.upsert({where:{guildId_userId_gameKey:{guildId:s.guildId,userId:p.userId,gameKey}},create:{guildId:s.guildId,userId:p.userId,gameKey,plays:1,wins,draws,losses},update:{plays:{increment:1},wins:{increment:wins},draws:{increment:draws},losses:{increment:losses}}});}
  await engine.transition<PvpData>(s.id,['SETTLING'],'CLOSED',current=>({...current,data:{...data,phase:'finished',result,...(winnerId?{winnerId}:{}),paid:winnerId?(stake*2n).toString():'0',finishedAt:this.clock().toISOString()}}));
 }
 async publicView(id:string){const s=await this.get(id),d=s.data;return{id:s.id,guildId:s.guildId,channelId:s.channelId,messageId:s.messageId,state:s.state,version:s.version,expiresAt:s.expiresAt,game:d.game,players:d.players,wager:d.wager,phase:d.phase,ready:d.ready,turn:d.board.turn,cells:d.board.cells,shots:d.board.shots,...(d.result?{result:d.result}:{}),...(d.winnerId?{winnerId:d.winnerId}:{}),...(d.paid?{paid:d.paid}:{})};}
 async privateView(c:PvpContext,id:string){return this.db.$transaction(async tx=>{const{s,seat}=await this.session(tx,c,id);const row=await tx.gameParticipant.findUniqueOrThrow({where:{sessionId_userId:{sessionId:id,userId:c.userId}}});const fleet=(row.data as unknown as {fleet?:Fleet}|null)?.fleet??[];return{id:s.id,version:s.version,game:s.data.game,phase:s.data.phase,seat,turn:s.data.board.turn,fleet,ownShots:s.data.board.shots[seat],incomingShots:s.data.board.shots[other(seat)]};});}
}
export type PvpView=Awaited<ReturnType<PrismaPvpRepository['publicView']>>;
export type PvpPrivateView=Awaited<ReturnType<PrismaPvpRepository['privateView']>>;
