import {Events,type Interaction,type RepliableInteraction} from 'discord.js';

const dailyActions=new Set(['economy:daily:claim','economy:daily:spin','economy:daily:fortune']);
export const isDailyRewardButton=(interaction:Interaction)=>interaction.isButton()&&dailyActions.has(interaction.customId);

/** Only these non-modal controls may be acknowledged before bootstrap/auth reads. */
export async function runWithDailyAcknowledgement<T>(event:string,args:readonly unknown[],enabled:boolean,work:()=>T|Promise<T>):Promise<T|undefined>{
 const interaction=event===Events.InteractionCreate?args[0] as Interaction|undefined:undefined;
 if(!interaction||!isDailyRewardButton(interaction)||!interaction.isButton())return work();
 if(!enabled){await interaction.reply({ephemeral:true,content:'Economy controls are not enabled yet.'});return;}
 if(!interaction.deferred&&!interaction.replied)await interaction.deferUpdate();
 try{return await work();}catch(error){
  await interaction.followUp({ephemeral:true,content:'That action could not be completed. Please try again shortly.'}).catch(()=>undefined);
  throw error;
 }
}

/** Preserve the private denial when the daily button has already been ACKed. */
export async function replyDailyRestriction(interaction:RepliableInteraction,content:string):Promise<void>{
 if(isDailyRewardButton(interaction)&&(interaction.deferred||interaction.replied))await interaction.followUp({ephemeral:true,content});
 else if(interaction.isChatInputCommand()&&interaction.commandName==='jail'&&interaction.options.getSubcommand(false)==='send'&&interaction.deferred&&!interaction.replied)await interaction.editReply({content});
 else await interaction.reply({ephemeral:true,content});
}
