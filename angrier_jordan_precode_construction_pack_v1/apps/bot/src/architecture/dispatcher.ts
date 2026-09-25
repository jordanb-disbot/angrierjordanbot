import type { CommandHandler,InteractionContext,InteractionResponse } from './handler-contract.js';
export class CommandDispatcher {
  private handlers=new Map<string,CommandHandler>();
  register(id:string,handler:CommandHandler):void{if(this.handlers.has(id))throw new Error(`Duplicate handler ${id}`);this.handlers.set(id,handler);}
  async dispatch(ctx:InteractionContext):Promise<InteractionResponse>{const h=this.handlers.get(ctx.commandId);if(!h)throw new Error(`Handler not registered: ${ctx.commandId}`);return h(ctx);}
}
