export interface ScheduledJob { id:string; guildId:string; jobType:string; executionKey:string; dueAt:Date; status:'PENDING'|'RUNNING'|'COMPLETED'|'FAILED'; payload?:unknown; attempts:number; leaseToken?:string; }
export interface JobRepository { claimDue(now:Date, limit:number):Promise<ScheduledJob[]>; complete(id:string,leaseToken?:string):Promise<void>; fail(id:string,error:string,leaseToken?:string):Promise<void>; wasExecuted(executionKey:string):Promise<boolean>; renew?(id:string,leaseToken:string):Promise<boolean>; }
export type JobHandler=(job:ScheduledJob)=>Promise<void>;
export class IdempotentScheduler {
  constructor(private readonly repo:JobRepository, private readonly handlers:Record<string,JobHandler>){}
  async tick(now=new Date(),limit=25):Promise<void>{
    for(const job of await this.repo.claimDue(now,limit)){
      let heartbeat:ReturnType<typeof setInterval>|undefined;
      try{
        if(job.leaseToken&&this.repo.renew){
          if(!await this.repo.renew(job.id,job.leaseToken))continue;
          heartbeat=setInterval(()=>{void this.repo.renew!(job.id,job.leaseToken!).catch(()=>false);},30_000);
        }
        if(!(await this.repo.wasExecuted(job.executionKey))){const handler=this.handlers[job.jobType];if(!handler)throw new Error(`No handler for ${job.jobType}`);await handler(job);}
        await this.repo.complete(job.id,job.leaseToken);
      }catch(e){await this.repo.fail(job.id,e instanceof Error?e.message:String(e),job.leaseToken);}
      finally{if(heartbeat)clearInterval(heartbeat);}
    }
  }
}
