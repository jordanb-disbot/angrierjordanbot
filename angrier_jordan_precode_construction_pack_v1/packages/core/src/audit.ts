export interface AuditEvent { guildId:string; actorUserId?:string; source:string; action:string; targetType?:string; targetId?:string; before?:unknown; after?:unknown; reason?:string; requestId:string; createdAt:Date; }
export interface AuditSink { write(event: AuditEvent): Promise<void>; }
export class AuditService { constructor(private readonly sink:AuditSink){} async record(event:AuditEvent):Promise<void>{ await this.sink.write(event); } }
