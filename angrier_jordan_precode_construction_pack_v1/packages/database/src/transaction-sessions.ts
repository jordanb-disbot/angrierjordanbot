import {Prisma,type GameSession} from '@prisma/client';
import type {Session,SessionRepository} from '../../core/src/session.js';
const map=<T>(row:GameSession):Session<T>=>({id:row.id,guildId:row.guildId,channelId:row.channelId,type:row.type,state:row.state,data:row.data as T,...(row.ownerUserId?{ownerUserId:row.ownerUserId}:{}),...(row.expiresAt?{expiresAt:row.expiresAt}:{}),extensionUsed:row.extensionUsed,version:row.version,createdAt:row.createdAt,updatedAt:row.updatedAt});
/** Shared SessionEngine adapter can participate in a larger serializable wager transaction. */
export class PrismaTransactionSessions implements SessionRepository {
 constructor(private readonly tx:Prisma.TransactionClient){}
 async get<T>(id:string){const row=await this.tx.gameSession.findUnique({where:{id}});return row?map<T>(row):null;}
 async create<T>(session:Session<T>){const row=await this.tx.gameSession.create({data:{...session,data:session.data as Prisma.InputJsonValue}});return map<T>(row);}
 async compareAndSwap<T>(id:string,expectedVersion:number,next:Session<T>){return(await this.tx.gameSession.updateMany({where:{id,version:expectedVersion},data:{state:next.state,data:next.data as Prisma.InputJsonValue,expiresAt:next.expiresAt??null,extensionUsed:next.extensionUsed,version:next.version,updatedAt:next.updatedAt}})).count===1;}
 async listOpen(type?:string){return(await this.tx.gameSession.findMany({where:{state:{in:['OPEN','LOCKED','SETTLING']},...(type?{type}:{})}})).map(row=>map<Record<string,unknown>>(row));}
}
