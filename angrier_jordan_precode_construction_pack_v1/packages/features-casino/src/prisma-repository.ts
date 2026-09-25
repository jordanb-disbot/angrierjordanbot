import {randomUUID} from 'node:crypto';
import {Prisma,type PrismaClient} from '@prisma/client';
import {DomainError,SessionEngine,type LedgerEngine,type Session} from '../../core/src/index.js';
import {PrismaAtomicOperations,requestFingerprint} from '../../database/src/atomic-operations.js';
import {PrismaWagerEscrow} from '../../database/src/wager-escrow.js';
import {PrismaTransactionSessions} from '../../database/src/transaction-sessions.js';
import {shuffleDeck,secureRandom,type CasinoRandom,blackjackAction,blackjackAdditionalStake,finishBlackjack,instantGame,startBlackjack,type BlackjackState,type CasinoGame,type ChairSymbol} from './domain.js';
export interface CasinoPolicy {minBet:bigint;maxBet:bigint;chairPotPercent:number;symbols:ChairSymbol[];slotsWagers:bigint[];rouletteChoices:string[];diceChoices:string[];}
export interface CasinoContext {guildId:string;userId:string;channelId:string;requestKey:string;}
export interface CasinoData {game:CasinoGame;stake:string;selection:string;blackjack?:BlackjackState;symbols?:string[];payout:string;outcome:string;jackpot:boolean;jackpotAmount?:string;}
const json=(value:unknown)=>JSON.parse(JSON.stringify(value)) as Prisma.InputJsonObject;
function validateBet(amount:bigint,policy:CasinoPolicy){if(amount<policy.minBet||amount>policy.maxBet)throw new DomainError('BET_LIMIT',`Choose a wager from ${policy.minBet} to ${policy.maxBet} Ottomans.`);}
export class PrismaCasinoRepository {
 private readonly atomic:PrismaAtomicOperations;
 constructor(private readonly db:PrismaClient,private readonly rng:CasinoRandom=secureRandom,private readonly deck:()=>number[]=()=>shuffleDeck(rng)){this.atomic=new PrismaAtomicOperations(db);}
 async get(id:string){const row=await this.db.gameSession.findUnique({where:{id}});if(!row||row.type!=='casino')throw new DomainError('ROUND_MISSING','This casino round is unavailable.');return{...row,data:row.data as unknown as CasinoData};}
 async linkMessage(id:string,guildId:string,userId:string,messageId:string){await this.db.gameSession.updateMany({where:{id,guildId,ownerUserId:userId,type:'casino',messageId:null},data:{messageId}});}
 async start(c:CasinoContext,game:CasinoGame,stake:bigint,selection:string,policy:CasinoPolicy){
  validateBet(stake,policy);if(game==='slots'&&!policy.slotsWagers.includes(stake))throw new DomainError('SLOT_WAGER','Choose a currently supported slot wager.');if(game==='roulette'&&!policy.rouletteChoices.includes(selection)||game==='dice'&&!policy.diceChoices.includes(selection))throw new DomainError('CASINO_SELECTION','That selection is no longer available.');if(!['blackjack','roulette','slots','dice','coinflip'].includes(game))throw new DomainError('CASINO_GAME','Choose an available casino game.');
  const id=randomUUID();return this.atomic.run(c.guildId,'casino:start:'+c.requestKey,requestFingerprint({userId:c.userId,game,stake,selection}),async(tx,ledger)=>{
   const escrow=new PrismaWagerEscrow(tx,ledger),sessions=new PrismaTransactionSessions(tx),now=new Date();
   await escrow.reserve({guildId:c.guildId,userId:c.userId,amount:stake,referenceType:'casino',referenceId:id,key:'casino:'+c.guildId+':'+c.requestKey});
   let data:CasinoData={game,stake:stake.toString(),selection,payout:'0',outcome:'In progress',jackpot:false};
   if(game==='blackjack'){data.blackjack=startBlackjack(stake,this.deck());data.payout=data.blackjack.payout;data.outcome=data.blackjack.outcome;}
   else{
    const result=instantGame(game,stake,selection,policy.symbols,this.rng);data={...data,...result};
    if(game==='slots'){
     if(!Number.isInteger(policy.chairPotPercent)||policy.chairPotPercent<0||policy.chairPotPercent>10)throw new DomainError('CHAIR_POT_POLICY','Chair Pot configuration is unavailable.');
     const contribution=stake*BigInt(policy.chairPotPercent)/100n;
     const pot=await tx.casinoPool.upsert({where:{guildId_poolKey:{guildId:c.guildId,poolKey:'chair_pot'}},create:{guildId:c.guildId,poolKey:'chair_pot',amount:contribution},update:{amount:{increment:contribution},version:{increment:1}}});
     if(result.jackpot){data.jackpotAmount=pot.amount.toString();data.payout=(BigInt(data.payout)+pot.amount).toString();await tx.casinoPool.update({where:{guildId_poolKey:{guildId:c.guildId,poolKey:'chair_pot'}},data:{amount:0n,version:{increment:1}}});}
    }
   }
   const session=await sessions.create<CasinoData>({id,guildId:c.guildId,channelId:c.channelId,ownerUserId:c.userId,type:'casino',state:'OPEN',data,expiresAt:new Date(now.getTime()+300000),extensionUsed:false,version:0,createdAt:now,updatedAt:now});
   if(game!=='blackjack'||data.blackjack!.closed)await this.close(tx,ledger,session,data);
   else await tx.scheduledJob.create({data:{guildId:c.guildId,jobType:'casino.expire',executionKey:'casino:expire:'+id,dueAt:session.expiresAt!,payload:{guildId:c.guildId,sessionId:id}}});
   return{sessionId:id};
  });
 }
 async action(c:CasinoContext,id:string,version:number,action:'hit'|'stand'|'double'|'split',policy:CasinoPolicy){
  return this.atomic.run(c.guildId,'casino:action:'+c.requestKey,requestFingerprint({userId:c.userId,id,version,action}),async(tx,ledger)=>{
   const sessions=new PrismaTransactionSessions(tx),session=await sessions.get<CasinoData>(id);
   if(!session||session.guildId!==c.guildId||session.type!=='casino'||session.ownerUserId!==c.userId)throw new DomainError('ROUND_OWNER','Open your own casino round.');
   if(session.state!=='OPEN'||session.version!==version)throw new DomainError('ROUND_CHANGED','This hand changed. Use its current controls.');
   if(session.expiresAt&&session.expiresAt<=new Date())throw new DomainError('ROUND_EXPIRED','This hand timed out and will stand automatically.');
   if(!session.data.blackjack)throw new DomainError('BLACKJACK_ONLY','This control is for blackjack.');
   const extra=blackjackAdditionalStake(session.data.blackjack,action),total=session.data.blackjack.hands.reduce((n,h)=>n+BigInt(h.stake),0n);
   if(extra){validateBet(total+extra,policy);await new PrismaWagerEscrow(tx,ledger).reserve({guildId:c.guildId,userId:c.userId,amount:extra,referenceType:'casino',referenceId:id,key:'casino:extra:'+c.guildId+':'+c.requestKey});}
   const blackjack=blackjackAction(session.data.blackjack,action),data={...session.data,blackjack,payout:blackjack.payout,outcome:blackjack.outcome};
   if(blackjack.closed)await this.close(tx,ledger,session,data);else await new SessionEngine(sessions).transition<CasinoData>(id,['OPEN'],'OPEN',s=>({...s,data}));
   return{sessionId:id};
  });
 }
 async expire(guildId:string,id:string){return this.atomic.run(guildId,'casino:expire:'+id,id,async(tx,ledger)=>{
  const session=await new PrismaTransactionSessions(tx).get<CasinoData>(id);if(!session||session.guildId!==guildId||session.type!=='casino')throw new DomainError('ROUND_MISSING','Casino round missing.');
  if(session.state==='CLOSED')return{sessionId:id};if(!session.expiresAt||session.expiresAt>new Date())throw new DomainError('NOT_DUE','The hand has not expired.');
  if(!session.data.blackjack)throw new DomainError('BLACKJACK_ONLY','Only active blackjack hands can expire.');const blackjack=finishBlackjack(session.data.blackjack);await this.close(tx,ledger,session,{...session.data,blackjack,payout:blackjack.payout,outcome:blackjack.outcome});return{sessionId:id};
 });}
 private async close(tx:Prisma.TransactionClient,ledger:LedgerEngine,session:Session<CasinoData>,data:CasinoData){
  const userId=session.ownerUserId!;const engine=new SessionEngine(new PrismaTransactionSessions(tx));await engine.transition<CasinoData>(session.id,['OPEN'],'SETTLING',s=>({...s,data}));
  const settled=await new PrismaWagerEscrow(tx,ledger).settle(session.guildId,'casino',session.id,new Map([[userId,BigInt(data.payout)]]),'casino:settle:'+session.id);
  const win=settled.paid>settled.reserved,loss=settled.paid<settled.reserved,where={guildId_userId_gameKey:{guildId:session.guildId,userId,gameKey:data.game}};
  const previous=await tx.memberGameStats.findUnique({where}),oldMeta=previous?.metadata as {streak?:number}|null;const streak=win?(oldMeta?.streak??0)+1:loss?0:oldMeta?.streak??0;
  await tx.memberGameStats.upsert({where,create:{guildId:session.guildId,userId,gameKey:data.game,plays:1,wins:Number(win),losses:Number(loss),draws:Number(!win&&!loss),metadata:{streak}},update:{plays:{increment:1},wins:{increment:Number(win)},losses:{increment:Number(loss)},draws:{increment:Number(!win&&!loss)},metadata:{streak}}});
  const records:Record<string,string>={'casino.biggest_bet':settled.reserved.toString(),'casino.longest_win_streak':String(streak)};if(win)records['casino.biggest_win']=(settled.paid-settled.reserved).toString();if(loss)records['casino.biggest_loss']=(settled.reserved-settled.paid).toString();if(data.jackpot)records['casino.biggest_chair_pot']=data.jackpotAmount??'0';
  await tx.scheduledJob.create({data:{guildId:session.guildId,jobType:'records.observe',executionKey:'casino:records:'+session.id,dueAt:new Date(),payload:{guildId:session.guildId,userId,records,occurredAt:new Date().toISOString()}}});
  if(data.jackpot)await tx.scheduledJob.create({data:{guildId:session.guildId,jobType:'casino.jackpot_announce',executionKey:'casino:jackpot:'+session.id,dueAt:new Date(),payload:{guildId:session.guildId,sessionId:session.id,userId,amount:data.jackpotAmount??'0'}}});
  await engine.transition<CasinoData>(session.id,['SETTLING'],'CLOSED',s=>({...s,data}));
 }
}
