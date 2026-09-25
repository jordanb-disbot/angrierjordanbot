import {randomInt,randomUUID} from 'node:crypto';
import type {PrismaClient} from '@prisma/client';
import {DomainError} from '../../core/src/index.js';
import {PrismaAtomicOperations,requestFingerprint} from '../../database/src/atomic-operations.js';
import {PrismaWagerEscrow} from '../../database/src/wager-escrow.js';
import {weeklyCycle} from '../../features-economy/src/service.js';
import type {CasinoContext} from './prisma-repository.js';
export const lotteryCycle=(at=new Date())=>weeklyCycle(at,'FRIDAY',20);
export class PrismaLotteryRepository {
 private readonly atomic:PrismaAtomicOperations;
 constructor(private readonly db:PrismaClient){this.atomic=new PrismaAtomicOperations(db);}
 async current(guildId:string,userId:string,at=new Date()){
  const cycle=lotteryCycle(at),round=await this.db.lotteryRound.findUnique({where:{guildId_weekKey:{guildId,weekKey:cycle.key}}}),ticket=round?await this.db.lotteryTicket.findUnique({where:{roundId_userId:{roundId:round.id,userId}}}):null;
  return{round,drawAt:cycle.next,memberTickets:ticket?.count??0};
 }
 async buy(c:CasinoContext,quantity:number,price:bigint,at=new Date()){
  if(!Number.isSafeInteger(quantity)||quantity<1||quantity>20||price<=0n||price>100000n)throw new DomainError('LOTTERY_TICKETS','Choose 1–20 tickets at the current ticket price.');
  const cycle=lotteryCycle(at);return this.atomic.run(c.guildId,'lottery:buy:'+c.requestKey,requestFingerprint({userId:c.userId,quantity,price,weekKey:cycle.key}),async(tx,ledger)=>{
   if(new Date()>=cycle.next)throw new DomainError('LOTTERY_CLOSED','This drawing has closed. Open the current lottery.');
   const round=await tx.lotteryRound.upsert({where:{guildId_weekKey:{guildId:c.guildId,weekKey:cycle.key}},create:{id:randomUUID(),guildId:c.guildId,weekKey:cycle.key,drawAt:cycle.next},update:{}});
   if(round.status!=='OPEN')throw new DomainError('LOTTERY_CLOSED','Ticket sales are closed for this drawing.');
   const where={roundId_userId:{roundId:round.id,userId:c.userId}},old=await tx.lotteryTicket.findUnique({where});if((old?.count??0)+quantity>20)throw new DomainError('LOTTERY_CAP','The weekly limit is 20 tickets per member.');
   const cost=price*BigInt(quantity);await new PrismaWagerEscrow(tx,ledger).reserve({guildId:c.guildId,userId:c.userId,amount:cost,referenceType:'lottery',referenceId:round.id,key:'lottery:'+c.guildId+':'+c.requestKey});
   await tx.lotteryTicket.upsert({where,create:{roundId:round.id,userId:c.userId,count:quantity,paid:cost},update:{count:{increment:quantity},paid:{increment:cost}}});
   await tx.lotteryRound.update({where:{id:round.id},data:{pot:{increment:cost}}});
   await tx.scheduledJob.upsert({where:{executionKey:'lottery:draw:'+round.id},create:{guildId:c.guildId,jobType:'lottery.draw',executionKey:'lottery:draw:'+round.id,dueAt:round.drawAt,payload:{guildId:c.guildId,roundId:round.id}},update:{}});
   return{roundId:round.id,tickets:(old?.count??0)+quantity};
  });
 }
 async draw(guildId:string,roundId:string,at=new Date()){
  return this.atomic.run(guildId,'lottery:draw:'+roundId,roundId,async(tx,ledger)=>{
   const round=await tx.lotteryRound.findUniqueOrThrow({where:{id:roundId}});if(round.guildId!==guildId)throw new DomainError('LOTTERY_SERVER','This drawing belongs to another server.');if(round.status!=='OPEN')return{roundId,status:round.status};if(round.drawAt>at)throw new DomainError('LOTTERY_NOT_DUE','The drawing is not due.');
   const tickets=await tx.lotteryTicket.findMany({where:{roundId},orderBy:{userId:'asc'}}),total=tickets.reduce((n,t)=>n+t.count,0),paid=tickets.reduce((n,t)=>n+t.paid,0n);
   if(paid!==round.pot)throw new DomainError('LOTTERY_POT','Ticket funding and pot do not match.');
   if(total===0){await tx.lotteryRound.update({where:{id:roundId},data:{status:'SKIPPED',drawnAt:at}});return{roundId,status:'SKIPPED'};}
   if(!Number.isSafeInteger(total)||total>=2**48)throw new DomainError('LOTTERY_SIZE','Lottery ticket count is invalid.');let chosen=randomInt(total);const winner=tickets.find(t=>(chosen-=t.count)<0)!.userId;
   const escrow=new PrismaWagerEscrow(tx,ledger);const settled=await escrow.settle(guildId,'lottery',roundId,new Map([[winner,round.pot]]),'lottery:settle:'+roundId);if(settled.reserved!==round.pot)throw new DomainError('LOTTERY_ESCROW','Escrow funding and lottery pot do not match.');
   await tx.lotteryRound.update({where:{id:roundId},data:{status:'DRAWN',winnerUserId:winner,drawnAt:at}});
   await tx.memberGameStats.upsert({where:{guildId_userId_gameKey:{guildId,userId:winner,gameKey:'lottery'}},create:{guildId,userId:winner,gameKey:'lottery',wins:1,plays:1},update:{wins:{increment:1},plays:{increment:1}}});
   await tx.scheduledJob.create({data:{guildId,jobType:'lottery.announce',executionKey:'lottery:announce:'+roundId,dueAt:at,payload:{guildId,roundId,userId:winner,amount:round.pot.toString(),tickets:total}}});
   await tx.scheduledJob.create({data:{guildId,jobType:'records.observe',executionKey:'lottery:records:'+roundId,dueAt:at,payload:{guildId,userId:winner,records:{'casino.biggest_lottery_jackpot':round.pot.toString()},occurredAt:at.toISOString()}}});
   return{roundId,status:'DRAWN',winner,pot:round.pot.toString()};
  });
 }
 async schedule(guildId:string,at=new Date()){
  const cycle=lotteryCycle(at);const round=await this.db.lotteryRound.upsert({where:{guildId_weekKey:{guildId,weekKey:cycle.key}},create:{guildId,weekKey:cycle.key,drawAt:cycle.next},update:{}});
  for(const open of await this.db.lotteryRound.findMany({where:{guildId,status:'OPEN'}}))await this.db.scheduledJob.upsert({where:{executionKey:'lottery:draw:'+open.id},create:{guildId,jobType:'lottery.draw',executionKey:'lottery:draw:'+open.id,dueAt:open.drawAt,payload:{guildId,roundId:open.id}},update:{}});
  return round;
 }
}
