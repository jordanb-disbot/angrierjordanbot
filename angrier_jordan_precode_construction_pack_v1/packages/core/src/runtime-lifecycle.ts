/** Tracks in-flight work so shutdown stops admission before closing dependencies. */
export class RuntimeLifecycle {
  private pending=new Set<Promise<unknown>>();
  private stopping=false;
  get isStopping():boolean{return this.stopping;}
  get pendingCount():number{return this.pending.size;}
  run(task:()=>unknown|Promise<unknown>,onError:()=>void=()=>{}):void{
    if(this.stopping)return;
    const promise=Promise.resolve().then(task).catch(onError);
    this.pending.add(promise);
    void promise.finally(()=>this.pending.delete(promise));
  }
  stopAdmission():void{this.stopping=true;}
  async drain(timeoutMs=20_000):Promise<boolean>{
    this.stopAdmission();
    let timer:ReturnType<typeof setTimeout>|undefined;
    try{return await Promise.race([Promise.allSettled([...this.pending]).then(()=>true),new Promise<boolean>(resolve=>{timer=setTimeout(()=>resolve(false),timeoutMs);})]);}
    finally{if(timer)clearTimeout(timer);}
  }
}
