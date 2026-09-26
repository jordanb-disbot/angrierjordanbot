import {Prisma} from '@prisma/client';
import type {PrismaClient} from '@prisma/client';
import type {ServerBootstrapInput,ServerBootstrapRepository,ServerBootstrapResult} from '../../core/src/server-bootstrap.js';
import {normalizeServerBootstrapInput,serverBootstrapAudit} from '../../core/src/server-bootstrap.js';
import {PrismaAuditSink} from './prisma-adapters.js';

/** Minimal server prerequisite, safe across processes and retries; never seeds features or settings. */
export class PrismaServerBootstrapRepository implements ServerBootstrapRepository {
 constructor(private readonly db:Pick<PrismaClient,'$transaction'>){}
 async ensure(value:ServerBootstrapInput):Promise<ServerBootstrapResult>{
  const input=normalizeServerBootstrapInput(value);
  return this.db.$transaction(async tx=>{
   // PostgreSQL ON CONFLICT DO NOTHING waits for a competing insertion to commit or roll back.
   // READ COMMITTED gives the following read a fresh snapshot of the winning committed row.
   const inserted=await tx.guild.createMany({data:[{id:input.guildId,name:input.name}],skipDuplicates:true});
   const guild=await tx.guild.findUniqueOrThrow({where:{id:input.guildId},select:{id:true,name:true,createdAt:true}});
   if(inserted.count===1){
    const audit=new PrismaAuditSink({auditEvent:{create:args=>tx.auditEvent.create(args as Prisma.AuditEventCreateArgs)}});
    await audit.write(serverBootstrapAudit(input,guild));
   }
   // A failing audit rolls the insertion back, so another caller can safely perform the first bootstrap.
   return{created:inserted.count===1,guild};
  },{isolationLevel:Prisma.TransactionIsolationLevel.ReadCommitted});
 }
}
