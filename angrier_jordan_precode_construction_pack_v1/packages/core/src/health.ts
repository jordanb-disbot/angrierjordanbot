export type HealthStatus='ok'|'degraded'|'down';
export interface HealthCheckResult { name:string;status:HealthStatus;latencyMs?:number;detail?:string; }
export type HealthProbe=()=>Promise<HealthCheckResult>;
export interface HealthSnapshot { status:HealthStatus;checkedAt:Date;checks:HealthCheckResult[]; }

export class HealthService {
  constructor(private readonly probes:readonly HealthProbe[]){}
  async check():Promise<HealthSnapshot>{
    const checks:HealthCheckResult[]=[];
    for(const probe of this.probes){
      try{checks.push(await probe());}
      catch(error){checks.push({name:'unknown',status:'down',detail:error instanceof Error?error.message:String(error)});}
    }
    const status:HealthStatus=checks.some(c=>c.status==='down')?'down':checks.some(c=>c.status==='degraded')?'degraded':'ok';
    return {status,checkedAt:new Date(),checks};
  }
}

export const timedHealthProbe=(name:string,probe:()=>Promise<void>):HealthProbe=>async()=>{
  const start=Date.now();
  try{await probe();return {name,status:'ok',latencyMs:Date.now()-start};}
  catch(error){return {name,status:'down',latencyMs:Date.now()-start,detail:error instanceof Error?error.message:String(error)};}
};
