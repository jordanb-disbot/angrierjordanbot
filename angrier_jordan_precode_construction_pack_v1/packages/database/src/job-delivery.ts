import {Prisma,type PrismaClient} from '@prisma/client';
import type {DeliveryRepository,DeliveryState} from '../../core/src/delivery.js';
import {DomainError} from '../../core/src/errors.js';
/** Delivery metadata is persisted in the existing scheduled-job payload alongside its immutable event. */
export class PrismaJobDeliveryRepository implements DeliveryRepository {
 constructor(private readonly db:PrismaClient,private readonly jobId:string){}
 private async payload(){const row=await this.db.scheduledJob.findUniqueOrThrow({where:{id:this.jobId}});return row.payload as Prisma.JsonObject;}
 async read():Promise<DeliveryState>{const p=await this.payload();return{state:p.deliveryState==='SENT'?'SENT':p.deliveryState==='SENDING'?'SENDING':'PENDING',...(typeof p.deliveryMessageId==='string'?{messageId:p.deliveryMessageId}:{})};}
 async claim(){const p=await this.payload();if(p.deliveryState==='SENDING'||p.deliveryState==='SENT')return false;return(await this.db.scheduledJob.updateMany({where:{id:this.jobId,payload:{equals:p}},data:{payload:{...p,deliveryState:'SENDING'} as Prisma.InputJsonObject}})).count===1;}
 async complete(messageId:string){
  for(let attempt=0;attempt<8;attempt++){
   const p=await this.payload();
   if(p.deliveryState==='SENT'){
    if(p.deliveryMessageId!==messageId)throw new DomainError('DELIVERY_CONFLICT','This delivery already has a different confirmed message.');
    return;
   }
   // Recovery and the original sender may finish together. Never overwrite newer feature
   // metadata (including a finalized/scrubbed snapshot) with this reader's stale payload.
   if((await this.db.scheduledJob.updateMany({where:{id:this.jobId,payload:{equals:p}},data:{payload:{...p,deliveryState:'SENT',deliveryMessageId:messageId} as Prisma.InputJsonObject}})).count===1)return;
  }
  throw new DomainError('DELIVERY_BUSY','Delivery metadata changed concurrently; reconcile again.');
 }
}
