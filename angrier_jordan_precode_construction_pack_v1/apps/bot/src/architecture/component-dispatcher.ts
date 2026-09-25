import type { InteractionResponse } from './handler-contract.js';
export interface ComponentContext { guildId:string;channelId:string;userId:string;customId:string;requestId:string;isStaff?:boolean; }
export type ComponentHandler=(ctx:ComponentContext)=>Promise<InteractionResponse>;
interface PrefixRoute { prefix:string;handler:ComponentHandler; }
export class ComponentDispatcher {
  private readonly routes:PrefixRoute[]=[];
  registerPrefix(prefix:string,handler:ComponentHandler):void{
    if(this.routes.some(r=>r.prefix===prefix))throw new Error(`Duplicate component prefix ${prefix}`);
    this.routes.push({prefix,handler});this.routes.sort((a,b)=>b.prefix.length-a.prefix.length);
  }
  async dispatch(ctx:ComponentContext):Promise<InteractionResponse>{
    const route=this.routes.find(r=>ctx.customId.startsWith(r.prefix));
    if(!route)throw new Error(`Component handler not registered: ${ctx.customId}`);
    return route.handler(ctx);
  }
}
