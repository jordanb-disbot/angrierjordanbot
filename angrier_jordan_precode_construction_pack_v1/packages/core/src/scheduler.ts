export interface ScheduledJob { id:string; guildId:string; jobType:string; executionKey:string; dueAt:Date; status:'PENDING'|'RUNNING'|'COMPLETED'|'FAILED'; payload?:unknown; attempts:number; }
export interface JobRepository { claimDue(now:Date, limit:number):Promise<ScheduledJob[]>; complete(id:string):Promise<void>; fail(id:string,error:string):Promise<void>; wasExecuted(executionKey:string):Promise<boolean>; }
export type JobHandler=(job:ScheduledJob)=>Promise<void>;
export class IdempotentScheduler {
  constructor(private readonly repo:JobRepository, private readonly handlers:Record<string,JobHandler>){}
  async tick(now=new Date(),limit=25):Promise<void>{
    for(const job of await this.repo.claimDue(now,limit)){
      try{ if(!(await this.repo.wasExecuted(job.executionKey))){ const h=this.handlers[job.jobType]; if(!h) throw new Error(`No handler for ${job.jobType}`); await h(job); } await this.repo.complete(job.id); }
      catch(e){ await this.repo.fail(job.id,e instanceof Error?e.message:String(e)); }
    }
  }
}
