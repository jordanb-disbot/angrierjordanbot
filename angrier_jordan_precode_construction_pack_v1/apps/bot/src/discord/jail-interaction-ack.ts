import {Events,type Interaction} from 'discord.js';
export async function runWithJailSendAcknowledgement<T>(event:string,args:readonly unknown[],enabled:boolean,work:()=>T|Promise<T>):Promise<T|undefined>{
 const i=event===Events.InteractionCreate?args[0] as Interaction|undefined:undefined;
 if(!enabled||!i?.isChatInputCommand()||i.commandName!=='jail'||i.options.getSubcommand(false)!=='send')return work();
 if(!i.deferred&&!i.replied)await i.deferReply({ephemeral:true});
 try{return await work();}catch(error){
  if(!i.replied)await i.editReply({content:'Hotseat could not be completed. Check the member’s current status before retrying.'}).catch(()=>undefined);
  throw error;
 }
}
