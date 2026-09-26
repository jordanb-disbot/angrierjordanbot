import type { IdempotentScheduler } from './scheduler.js';

export class SchedulerWorker {
  private timer:ReturnType<typeof setInterval>|undefined;
  private active:Promise<void>|undefined;
  constructor(private readonly scheduler:IdempotentScheduler,private readonly intervalMs=5_000){}
  start():void{
    if(this.timer)return;
    this.timer=setInterval(()=>{void this.runOnce().catch(()=>console.error('Scheduler tick failed; durable jobs retained.'));},this.intervalMs);
  }
  stop():void{if(this.timer){clearInterval(this.timer);this.timer=undefined;}}
  async stopAndDrain():Promise<void>{this.stop();await this.active;}
  /** A persisted urgent intent must not be skipped when a polling tick is busy. */
  async wake():Promise<void>{
    while(this.active)await this.active;
    await this.runOnce();
  }
  async runOnce(now=new Date()):Promise<void>{
    if(this.active)return;
    this.active=this.scheduler.tick(now);
    try{await this.active;}finally{this.active=undefined;}
  }
}
