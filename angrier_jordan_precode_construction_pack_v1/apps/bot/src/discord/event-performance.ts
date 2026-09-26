/** Opt-in timings contain stages and durations only; never members, credentials or payloads. */
export async function eventTiming<T>(stage:string,work:()=>Promise<T>):Promise<T>{
 const start=performance.now();try{return await work();}finally{
  if(process.env.EVENT_PERF==='1')console.info(JSON.stringify({scope:'event-performance',stage,ms:Math.round(performance.now()-start)}));
 }
}
