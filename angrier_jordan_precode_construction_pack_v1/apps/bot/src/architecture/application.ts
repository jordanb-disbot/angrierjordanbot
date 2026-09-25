import type { HealthService, SchedulerWorker } from '../../../../packages/core/src/index.js';
import type { CommandDispatcher } from './dispatcher.js';
import type { ComponentDispatcher } from './component-dispatcher.js';

export interface RecoveryTask { name:string; recover():Promise<void>; }
export interface ApplicationStartResult { recovered:string[]; health:'ok'|'degraded'|'down'; }

export class AngrierJordanApplication {
  private started=false;
  constructor(
    readonly commands:CommandDispatcher,
    readonly components:ComponentDispatcher,
    private readonly schedulerWorker:SchedulerWorker,
    private readonly healthService:HealthService,
    private readonly recoveryTasks:readonly RecoveryTask[]=[],
  ){}
  async start():Promise<ApplicationStartResult>{
    if(this.started)throw new Error('Application already started.');
    const recovered:string[]=[];
    for(const task of this.recoveryTasks){await task.recover();recovered.push(task.name);}
    await this.schedulerWorker.runOnce();
    this.schedulerWorker.start();
    this.started=true;
    const health=await this.healthService.check();
    return {recovered,health:health.status};
  }
  stop():void{this.schedulerWorker.stop();this.started=false;}
  async health(){return this.healthService.check();}
}
