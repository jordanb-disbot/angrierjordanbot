import type {ChatInputCommandInteraction} from 'discord.js';
import {AuditService,DomainError} from '../../../../packages/core/src/index.js';

type MemberStore={member:{upsert(input:{where:{guildId_userId:{guildId:string;userId:string}};create:{guildId:string;userId:string;dmsEnabled:boolean};update:{dmsEnabled:boolean}}):Promise<unknown>}};

/** Member-owned delivery consent. This is deliberately separate from the
 * visible self-assigned “DM Status” role in /roles. */
export class DiscordDmsCoordinator {
 constructor(private readonly db:MemberStore,private readonly audit:AuditService){}
 async handle(interaction:ChatInputCommandInteraction){
  if(!interaction.guildId){await interaction.reply({ephemeral:true,content:'Use /dms in the server so your member preference can be saved.'});return;}
  const state=interaction.options.getString('state',true);
  if(state!=='on'&&state!=='off'){await interaction.reply({ephemeral:true,content:'Choose either on or off for bot direct messages.'});return;}
  const dmsEnabled=state==='on';
  await interaction.deferReply({ephemeral:true});
  try{
   await this.db.member.upsert({where:{guildId_userId:{guildId:interaction.guildId,userId:interaction.user.id}},create:{guildId:interaction.guildId,userId:interaction.user.id,dmsEnabled},update:{dmsEnabled}});
   await this.audit.record({guildId:interaction.guildId,actorUserId:interaction.user.id,source:'discord',action:'member.dms_preference_changed',targetType:'member',targetId:interaction.user.id,before:undefined,after:{dmsEnabled},requestId:interaction.id,createdAt:new Date()});
   await interaction.editReply({content:dmsEnabled?'Angrier Jordan may send you direct messages.':'Angrier Jordan will not send you direct messages.',allowedMentions:{parse:[]}});
  }catch(error){const text=error instanceof DomainError?error.message:'Your direct-message preference could not be saved.';await interaction.editReply({content:text,allowedMentions:{parse:[]}});}
 }
}
