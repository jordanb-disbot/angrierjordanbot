import {randomUUID} from 'node:crypto';
import type {PrismaClient} from '@prisma/client';
import {TIME_CONTROLS,timeControl,type LichessAdapter} from './domain.js';
export type ChessStatus='PENDING'|'DECLINED'|'EXPIRED'|'CREATING'|'ACTIVE'|'ERROR'|'FINISHED';
export class ChairmateRepository {
 constructor(private readonly db:PrismaClient,private readonly clock:()=>Date=()=>new Date(),private readonly random:()=>number=Math.random){}
 async create(input:{guildId:string;channelId:string;challengerUserId:string;opponentUserId:string;challengerName:string;opponentName:string;control:string;key:string}){
  const control=timeControl(input.control),spec=TIME_CONTROLS[control];
  return this.db.chairmateChallenge.upsert({where:{createKey:input.key},create:{id:randomUUID(),guildId:input.guildId,channelId:input.channelId,challengerUserId:input.challengerUserId,opponentUserId:input.opponentUserId,challengerName:input.challengerName,opponentName:input.opponentName,timeControl:control,clockLimit:spec.limit,clockIncrement:spec.increment,status:'PENDING',expiresAt:new Date(this.clock().getTime()+300_000),createKey:input.key},update:{}});
 }
 async linkMessage(id:string,messageId:string){await this.db.chairmateChallenge.updateMany({where:{id,messageId:null},data:{messageId}});}
 async get(id:string){const row=await this.db.chairmateChallenge.findUnique({where:{id}});if(!row)throw new Error('That Chairmate challenge is unavailable.');return row;}
 async decide(id:string,userId:string,accept:boolean,provider:LichessAdapter,key:string,retry=false){
  const claimed=await this.db.$transaction(async tx=>{const row=await tx.chairmateChallenge.findUnique({where:{id}});if(!row)throw new Error('That Chairmate challenge is unavailable.');if(row.opponentUserId!==userId)throw new Error('Only the nominated member can accept or decline this challenge.');if(row.status!=='PENDING')return {row,providerClaim:retry&&accept&&(row.status==='CREATING'||row.status==='ERROR'&&row.providerRetryAt!==null)};if(row.expiresAt<=this.clock())return {row:await tx.chairmateChallenge.update({where:{id},data:{status:'EXPIRED'}}),providerClaim:false};if(!accept)return {row:await tx.chairmateChallenge.update({where:{id},data:{status:'DECLINED',acceptKey:key}}),providerClaim:false};return {row:await tx.chairmateChallenge.update({where:{id},data:{status:'CREATING',acceptKey:key}}),providerClaim:true};});
  if(!accept||!claimed.providerClaim)return claimed.row;const claim=claimed.row;
  try{const game=await provider.createGuestGame({limit:claim.clockLimit,increment:claim.clockIncrement,idempotencyKey:`chairmate:${id}`});const challengerWhite=this.random()<.5;
   return await this.db.chairmateChallenge.update({where:{id},data:{status:'ACTIVE',lichessChallengeId:game.challengeId,lichessGameId:game.gameId??game.challengeId,lichessGameUrl:game.gameUrl,whiteUrl:game.whiteUrl,blackUrl:game.blackUrl,challengerColor:challengerWhite?'white':'black',opponentColor:challengerWhite?'black':'white',lastProviderError:null,providerRetryAt:null}});
  }catch(error){const providerError=error as {retryable?:boolean;retrySafe?:boolean};const retryable=Boolean(providerError.retryable),retrySafe=Boolean(providerError.retrySafe);return this.db.chairmateChallenge.update({where:{id},data:{status:retryable?'CREATING':'ERROR',lastProviderError:error instanceof Error?error.message:'Lichess unavailable',providerRetryAt:retryable?new Date(this.clock().getTime()+60_000):retrySafe?this.clock():null}});}
 }
 async retry(id:string,userId:string,provider:LichessAdapter,key:string){return this.decide(id,userId,true,provider,key,true);}
 async expire(id:string){return this.db.chairmateChallenge.updateMany({where:{id,status:'PENDING',expiresAt:{lte:this.clock()}},data:{status:'EXPIRED'}});}
 /** Returns every card whose persisted state may have changed, so the Discord
  * surface cannot remain on the temporary "being set" state after recovery. */
 async recover(provider:LichessAdapter){const changed:string[]=[];const rows=await this.db.chairmateChallenge.findMany({where:{OR:[{status:'PENDING',expiresAt:{lte:this.clock()}},{status:'CREATING',OR:[{providerRetryAt:null},{providerRetryAt:{lte:this.clock()}}]},{status:'ACTIVE'}]},take:100});for(const row of rows){if(row.status==='PENDING'){if((await this.expire(row.id)).count)changed.push(row.id);continue;}if(row.status==='CREATING'){const previousStatus=row.status;const recovered=await this.decide(row.id,row.opponentUserId,true,provider,row.acceptKey??`recover:${row.id}`,true);if(recovered.status!==previousStatus)changed.push(row.id);continue;}if(!row.lichessGameId)continue;try{const state=await provider.game(row.lichessGameId);if(state.finished){const outcome=state.winnerColor?`${state.winnerColor==='white'?(row.challengerColor==='white'?row.challengerName:row.opponentName):(row.challengerColor==='black'?row.challengerName:row.opponentName)} wins by ${state.result??'completion'}`:`Draw${state.result?` by ${state.result}`:''}`;await this.db.chairmateChallenge.update({where:{id:row.id},data:{status:'FINISHED',result:outcome,winnerColor:state.winnerColor??null}});changed.push(row.id);}}catch(error){await this.db.chairmateChallenge.update({where:{id:row.id},data:{lastProviderError:error instanceof Error?error.message:'Lichess poll failed',providerRetryAt:new Date(this.clock().getTime()+30_000)}});}}
 return changed;
 }
 async markResultPosted(id:string){await this.db.chairmateChallenge.updateMany({where:{id,status:'FINISHED',resultPostedAt:null},data:{resultPostedAt:this.clock()}});}
 async resultsToPost(){return this.db.chairmateChallenge.findMany({where:{status:'FINISHED',resultPostedAt:null}});}
}
