import { AuditService } from '../../core/src/audit.js';
import { ConfigService, type ConfigRepository } from '../../core/src/config-service.js';
import type { SettingDefinition } from '../../core/src/config.js';
import { emptyDraft, type ConfigDraft, type ConfigDraftRepository, type DraftTransaction } from '../../core/src/config-draft.js';
import { PrismaAuditSink, PrismaConfigRepository, lockConfigServer, type FoundationPrismaLike } from '../../database/src/prisma-adapters.js';

interface DraftPrismaTransaction extends Omit<FoundationPrismaLike,'$transaction'> {
  dashboardDraft:{findUnique(args:unknown):Promise<{state:unknown}|null>;upsert(args:unknown):Promise<unknown>};
  operationReceipt:{findUnique(args:unknown):Promise<{fingerprint:string;result:unknown}|null>;create(args:unknown):Promise<unknown>};
}
export interface DraftPrismaLike {
  $transaction<T>(work:(tx:DraftPrismaTransaction)=>Promise<T>,options?:{timeout:number}):Promise<T>;
}
/** One DB transaction contains draft, live settings, revisions, audit events and receipt. */
export class PrismaConfigDraftRepository implements ConfigDraftRepository {
  constructor(private readonly db:DraftPrismaLike,private readonly definitions:readonly SettingDefinition[]){}
  async run<T>(guildId:string,work:(tx:DraftTransaction)=>Promise<T>):Promise<T>{
    return this.db.$transaction(async raw=>{
      if(!raw.$queryRawUnsafe)throw new Error('Transactional PostgreSQL configuration locks are required.');
      await lockConfigServer(raw,guildId);
      // The shared config adapter may open a transaction; reuse the current outer transaction.
      const bound:FoundationPrismaLike={configValue:raw.configValue,configRevision:raw.configRevision,auditEvent:raw.auditEvent,scheduledJob:raw.scheduledJob,
        $queryRawUnsafe:raw.$queryRawUnsafe.bind(raw),$transaction:async callback=>callback(raw)};
      const configRepository:ConfigRepository=new PrismaConfigRepository(bound),audit=new AuditService(new PrismaAuditSink(bound));
      const tx:DraftTransaction={
        config:new ConfigService(this.definitions,configRepository,audit),configRepository,audit,
        draft:async()=>{
          const row=await raw.dashboardDraft.findUnique({where:{guildId}});
          return row?structuredClone(row.state) as ConfigDraft:emptyDraft();
        },
        saveDraft:async draft=>{await raw.dashboardDraft.upsert({where:{guildId},create:{guildId,revision:draft.version,state:json(draft)},update:{revision:draft.version,state:json(draft)}});},
        receipt:async key=>raw.operationReceipt.findUnique({where:{guildId_key:{guildId,key}}}),
        saveReceipt:async(key,fingerprint,result)=>{await raw.operationReceipt.create({data:{guildId,key,fingerprint,result:json(result)}});},
      };
      return work(tx);
    },{timeout:30000});
  }
}
const json=(value:unknown):unknown=>JSON.parse(JSON.stringify(value));
