import { getPrismaClient } from '../../../packages/database/src/client';

export type DashboardAuditEntry={id:string;createdAt:Date;source:string;action:string;actorUserId:string|null;targetType:string|null;targetId:string|null;before:unknown;after:unknown};

export async function readRecentAudit(guildId:string,limit=24):Promise<DashboardAuditEntry[]>{
 return getPrismaClient().auditEvent.findMany({
  where:{guildId},orderBy:{createdAt:'desc'},take:limit,
  select:{id:true,createdAt:true,source:true,action:true,actorUserId:true,targetType:true,targetId:true,before:true,after:true},
 });
}
