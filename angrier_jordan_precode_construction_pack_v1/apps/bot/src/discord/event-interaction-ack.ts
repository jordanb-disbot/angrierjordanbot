import {Events,type Interaction,type ButtonInteraction} from 'discord.js';

/** ACK before cold bootstrap/config reads. A bet button only displays a modal;
 * its submit still passes through bootstrap and all coordinator authorization. */
export async function runWithEventAcknowledgement<T>(event:string,args:readonly unknown[],enabled:{events:boolean;special:boolean},work:()=>T|Promise<T>,showBet:(i:ButtonInteraction)=>Promise<unknown>):Promise<T|undefined>{
 const i=event===Events.InteractionCreate?args[0] as Interaction|undefined:undefined;
 if(!i)return work();
 const race=enabled.events&&i.isChatInputCommand()&&i.commandName==='race';
 const control=(i.isButton()||i.isModalSubmit())?i.customId.split(':'):[];
 const eventControl=enabled.events&&(control[0]==='event'||control[0]==='fight');
 const lineControl=enabled.special&&i.isButton()&&control[0]==='line';
 if(!race&&!eventControl&&!lineControl)return work();
 if(!i.isRepliable())return work();
 if(eventControl&&i.isButton()&&control[1]==='bet'){await showBet(i);return;}
 const privateReply=race||i.isModalSubmit()||control[1]==='rules'||control[1]==='roster';
 if(!i.deferred&&!i.replied){if(privateReply)await i.deferReply({ephemeral:true});else if(i.isButton())await i.deferUpdate();}
 try{return await work();}catch(error){
  const content='That action could not be completed. Check its current state before retrying.';
  if(privateReply&&i.deferred&&!i.replied)await i.editReply({content}).catch(()=>undefined);
  else await i.followUp({ephemeral:true,content}).catch(()=>undefined);
  throw error;
 }
}
