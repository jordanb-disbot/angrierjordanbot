import type { IdempotentScheduler } from './scheduler.js';

export class SchedulerWorker {
  private timer:ReturnType<typeof setInterval>|undefined;
  private running=false;
  constructor(private readonly scheduler:IdempotentScheduler,private readonly intervalMs=5_000){}
  start():void{
    if(this.timer)return;
    this.timer=setInterval(()=>{void this.runOnce();},this.intervalMs);
  }
  stop():void{if(this.timer){clearInterval(this.timer);this.timer=undefined;}}
  async runOnce(now=new Date()):Promise<void>{
    if(this.running)return;
    this.running=true;
    try{await this.scheduler.tick(now);}finally{this.running=false;}
  }
}
