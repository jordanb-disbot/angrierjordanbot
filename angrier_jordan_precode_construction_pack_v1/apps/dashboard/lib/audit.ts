import { getPrismaClient } from '../../../packages/database/src/client';

export type DashboardAuditEntry={id:string;createdAt:Date;source:string;action:string;actorUserId:string|null;actorDisplayName:string|null;targetType:string|null;targetId:string|null;targetDisplayName:string|null;before:unknown;after:unknown};

export async function readRecentAudit(guildId:string,limit=24):Promise<DashboardAuditEntry[]>{
 const db=getPrismaClient(),events=await db.auditEvent.findMany({
  where:{guildId},orderBy:{createdAt:'desc'},take:limit,
  select:{id:true,createdAt:true,source:true,action:true,actorUserId:true,targetType:true,targetId:true,before:true,after:true},
 });
 const ids=[...new Set(events.flatMap(event=>[event.actorUserId,event.targetType==='member'?event.targetId:null]).filter((id):id is string=>Boolean(id&&/^\d{17,20}$/.test(id))))];
 const names=ids.length?await db.memberDirectory.findMany({where:{guildId,archivedAt:null,userId:{in:ids}},select:{userId:true,displayName:true}}):[];
 const byId=new Map(names.map(member=>[member.userId,member.displayName]));
 return events.map(event=>({...event,actorDisplayName:event.actorUserId?byId.get(event.actorUserId)??null:null,targetDisplayName:event.targetType==='member'&&event.targetId?byId.get(event.targetId)??null:null}));
}
