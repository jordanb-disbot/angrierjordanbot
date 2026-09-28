/** Short-lived public results. A replacement never changes the saved game or ledger result. */
export class DisposableCardLifecycle {
 private readonly latest=new Map<string,{id:string;delete:()=>Promise<unknown>;timer:NodeJS.Timeout}>();
 constructor(private readonly ttlMs=75_000){}
 async track(key:string,message:{id:string;delete:()=>Promise<unknown>}){
  const previous=this.latest.get(key);
  if(previous){clearTimeout(previous.timer);if(previous.id!==message.id)await previous.delete().catch(()=>{});}
  const timer=setTimeout(()=>{if(this.latest.get(key)?.id===message.id)this.latest.delete(key);void message.delete().catch(()=>{});},this.ttlMs);
  timer.unref();this.latest.set(key,{id:message.id,delete:()=>message.delete(),timer});
  if(this.latest.size>1000){const oldest=this.latest.keys().next().value;if(oldest){const entry=this.latest.get(oldest);if(entry)clearTimeout(entry.timer);this.latest.delete(oldest);}}
 }
}
