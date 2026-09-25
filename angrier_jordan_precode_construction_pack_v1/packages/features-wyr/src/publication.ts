import type {PrismaClient} from '@prisma/client';
import {DomainError} from '../../core/src/index.js';
import {PrismaJobDeliveryRepository} from '../../database/src/job-delivery.js';

/** WYR publication reuses the original deferred interaction message as its durable destination. */
export class PrismaWyrPublicationRepository {
  constructor(private readonly db:PrismaClient){}
  async jobForSession(sessionId:string){
    const row=await this.db.scheduledJob.findUniqueOrThrow({where:{executionKey:'wyr:publish:'+sessionId}});
    if(row.jobType!=='wyr.publish')throw new DomainError('WYR_PUBLICATION','Invalid WYR publication job.');
    return row;
  }
  delivery(jobId:string){return new PrismaJobDeliveryRepository(this.db,jobId);}
}
