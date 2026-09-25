import {
  ActionRowBuilder,ButtonBuilder,ButtonStyle,ContainerBuilder,MessageFlags,PermissionFlagsBits,StringSelectMenuBuilder,TextDisplayBuilder,
  type ButtonInteraction,type ChatInputCommandInteraction,type GuildMember,type PartialGuildMember,type StringSelectMenuInteraction,
} from 'discord.js';
import type { ConfigService } from '../../../../packages/core/src/index.js';
import { DomainError } from '../../../../packages/core/src/index.js';
import type { OnboardingService, RestorePlan, RoleSnapshot, SelfRolePanelDefinition } from '../../../../packages/features-onboarding/src/index.js';

const roleId=async(config:ConfigService,guildId:string,key:string):Promise<string|null>=>{
  const value=await config.get(guildId,key);return typeof value==='string'&&value?value:null;
};
const safeError=(error:unknown)=>error instanceof Error?error.message:String(error);
const STAFF_PERMISSION_MASK=PermissionFlagsBits.Administrator|PermissionFlagsBits.ManageGuild|PermissionFlagsBits.ManageRoles|PermissionFlagsBits.ManageChannels|PermissionFlagsBits.KickMembers|PermissionFlagsBits.BanMembers|PermissionFlagsBits.ModerateMembers|PermissionFlagsBits.ManageMessages;

export class DiscordOnboardingCoordinator {
  constructor(private readonly service:OnboardingService,private readonly config:ConfigService){}

  async handleMemberAdd(member:GuildMember):Promise<void>{
    await this.service.memberJoined(member.guild.id,member.id);
    const access=await roleId(this.config,member.guild.id,'roles.member_access');
    if(access&&member.roles.cache.has(access))await member.roles.remove(access,'Rules acknowledgment required on join/rejoin.').catch(()=>undefined);
    await member.send({content:'Welcome back to Chairs. Please review `/rules` and acknowledge them before normal server access is restored.'}).catch(()=>undefined);
  }

  async handleMemberRemove(member:GuildMember|PartialGuildMember):Promise<void>{
    const guildId=member.guild.id;
    const [throne,chaise,recliner,access,jailed]=await Promise.all(['roles.throne','roles.chaise_lounge','roles.recliner','roles.member_access','roles.jailed'].map(k=>roleId(this.config,guildId,k)));
    const staff=new Set([throne,chaise,recliner].filter((x):x is string=>Boolean(x)));
    const selfRoleIds=new Set<string>();
    try{const {panel}=await this.service.rolePanel(guildId,member.id);for(const category of panel.categories)for(const option of category.options)selfRoleIds.add(option.roleId);}catch{}
    const prior=new Map((await this.service.currentRoleSnapshots(guildId,member.id)).map(r=>[r.roleId,r]));
    const roles:RoleSnapshot[]=[];
    for(const role of member.roles.cache.values()){
      if(role.id===guildId||role.id===access||role.id===jailed||role.managed)continue;
      const previous=prior.get(role.id);
      const kind=staff.has(role.id)||(role.permissions.bitfield&STAFF_PERMISSION_MASK)!==0n?'STAFF':selfRoleIds.has(role.id)?'SELF':previous?.kind==='TEMPORARY'?'TEMPORARY':'MANUAL';
      roles.push({roleId:role.id,kind,...(kind==='TEMPORARY'&&previous?.expiresAt?{expiresAt:previous.expiresAt}:{})});
    }
    await this.service.memberLeft({guildId,userId:member.id,...(member.nickname?{nickname:member.nickname}:{}),roles});
  }

  async handleRulesCommand(interaction:ChatInputCommandInteraction):Promise<void>{
    if(!interaction.guildId){await interaction.reply({ephemeral:true,content:'This command is only available in the server.'});return;}
    const ack=new ButtonBuilder().setCustomId('onboard:ack_rules').setLabel('Acknowledge Rules').setStyle(ButtonStyle.Success);
    const container=new ContainerBuilder().setAccentColor(0x14B8A6)
      .addTextDisplayComponents(new TextDisplayBuilder().setContent('# Server Rules\nReview the server rules. When you are ready, acknowledge them below to unlock normal server access.'))
      .addActionRowComponents(new ActionRowBuilder<ButtonBuilder>().addComponents(ack));
    await interaction.reply({flags:MessageFlags.Ephemeral|MessageFlags.IsComponentsV2,components:[container]});
  }

  async handleRulesAck(interaction:ButtonInteraction):Promise<void>{
    if(!interaction.guildId||!interaction.guild||!interaction.member){await interaction.reply({ephemeral:true,content:'This action is only available in the server.'});return;}
    await interaction.deferReply({ephemeral:true});
    const member=await interaction.guild.members.fetch(interaction.user.id);
    const plan=await this.service.acknowledgeRules(interaction.guildId,interaction.user.id);
    const result=await this.applyRestorePlan(member,plan);
    const accessText=plan.applyJailedRole?'Your rules acknowledgment is complete. Your moderation Hotseat has resumed; normal access returns when it ends.':'Rules acknowledged. Your normal server access has been restored.';
    const optional=plan.crimeCommandRestricted?(plan.applyJailedRole?'Crime jail also remains active. Another eligible member may pay your crime bail; moderation Hotseat remains separate.':'Crime jail still blocks ordinary bot commands. Use `/crime bail`, or another member may pay it for you.'):'Optional next steps: `/roles`, `/lore`, `/introduce`, `/tutorial`.';
    const failed=result.failed.length?`\n${result.failed.length} prior role(s) could not be restored and were logged.`:'';
    await interaction.editReply({content:`${accessText}\n${optional}${failed}`});
  }

  async handleRolesCommand(interaction:ChatInputCommandInteraction):Promise<void>{
    if(!interaction.guildId){await interaction.reply({ephemeral:true,content:'This command is only available in the server.'});return;}
    try{const state=await this.service.rolePanel(interaction.guildId,interaction.user.id);await interaction.reply(this.rolePanelMessage(state.panel,state.selections.filter(x=>x.active).map(x=>x.roleId)));}
    catch(error){await interaction.reply({ephemeral:true,content:error instanceof DomainError?error.message:'The role panel could not be loaded.'});}
  }

  async handleRoleSelect(interaction:StringSelectMenuInteraction):Promise<void>{
    if(!interaction.guildId||!interaction.guild){await interaction.reply({ephemeral:true,content:'This action is only available in the server.'});return;}
    const parts=interaction.customId.split(':');
    const categoryKey=parts[2]??'';const segmentIndex=Number(parts[3]??'0');
    await interaction.deferUpdate();
    const member=await interaction.guild.members.fetch(interaction.user.id);
    const stateBefore=await this.service.rolePanel(interaction.guildId,interaction.user.id);
    const category=stateBefore.panel.categories.find(c=>c.key===categoryKey);
    if(!category)throw new DomainError('ROLE_CATEGORY_NOT_FOUND',`Unknown role category ${categoryKey}.`);
    const visibleOptions=category.options.filter(o=>o.enabled&&!o.archived);
    const segmentRoleIds=new Set(visibleOptions.slice(segmentIndex*25,segmentIndex*25+25).map(o=>o.roleId));
    const current=stateBefore.selections.filter(x=>x.active&&x.categoryKey===categoryKey).map(x=>x.roleId);
    const selectedRoleIds=category.mode==='single'?[...interaction.values]:[...current.filter(id=>!segmentRoleIds.has(id)),...interaction.values];
    const plan=await this.service.planRoleCategoryUpdate({guildId:interaction.guildId,userId:interaction.user.id,categoryKey,selectedRoleIds});
    const touched=[...new Set([...plan.addRoleIds,...plan.removeRoleIds])];
    for(const id of touched){
      const role=interaction.guild.roles.cache.get(id);
      if(!role)throw new DomainError('ROLE_MISSING',`A configured role no longer exists: ${id}`);
      if(role.managed||!role.editable)throw new DomainError('ROLE_UNMANAGEABLE',`Angrier Jordan cannot manage ${role.name}.`);
      if(plan.addRoleIds.includes(id)&&role.permissions.bitfield!==0n)throw new DomainError('ROLE_HAS_PERMISSIONS',`${role.name} has Discord permissions and cannot be self-selected.`);
    }
    const removed:string[]=[];const added:string[]=[];
    try{
      for(const id of plan.removeRoleIds){await member.roles.remove(id,'Self-role selection changed.');removed.push(id);}
      for(const id of plan.addRoleIds){await member.roles.add(id,'Self-role selection changed.');added.push(id);}
      await this.service.updateRoleCategory({guildId:interaction.guildId,userId:interaction.user.id,categoryKey,selectedRoleIds});
    }catch(error){
      for(const id of added)await member.roles.remove(id,'Rolling back failed self-role update.').catch(()=>undefined);
      for(const id of removed)await member.roles.add(id,'Rolling back failed self-role update.').catch(()=>undefined);
      throw error;
    }
    const state=await this.service.rolePanel(interaction.guildId,interaction.user.id);
    await interaction.editReply(this.rolePanelMessage(state.panel,state.selections.filter(x=>x.active).map(x=>x.roleId)));
  }

  private rolePanelMessage(panel:SelfRolePanelDefinition,selectedRoleIds:string[]){
    const selected=new Set(selectedRoleIds);
    const components:Array<TextDisplayBuilder|ActionRowBuilder<StringSelectMenuBuilder>>=[];
    components.push(new TextDisplayBuilder().setContent(`# Choose Your Roles\nChanges apply immediately. You can run \`/roles\` again anytime.`));
    for(const category of panel.categories){
      const options=category.options.filter(o=>o.enabled&&!o.archived);
      if(!options.length){components.push(new TextDisplayBuilder().setContent(`**${category.label}**\n_No options configured yet._`));continue;}
      for(let segment=0;segment<Math.ceil(options.length/25);segment++){
        const page=options.slice(segment*25,segment*25+25);
        const label=Math.ceil(options.length/25)>1?`${category.label} (${segment+1}/${Math.ceil(options.length/25)})`:category.label;
        const menu=new StringSelectMenuBuilder().setCustomId(`roles:select:${category.key}:${segment}`).setPlaceholder(label).setMinValues(0).setMaxValues(category.mode==='single'?1:page.length);
        menu.addOptions(page.map(option=>({label:option.label,value:option.roleId,default:selected.has(option.roleId),...(option.emoji?{emoji:option.emoji}:{})})));
        components.push(new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu));
      }
    }
    const containers:ContainerBuilder[]=[];
    for(let i=0;i<components.length;i+=9){const container=new ContainerBuilder().setAccentColor(0x14B8A6);for(const c of components.slice(i,i+9)){if(c instanceof TextDisplayBuilder)container.addTextDisplayComponents(c);else container.addActionRowComponents(c);}containers.push(container);}
    return {flags:MessageFlags.Ephemeral|MessageFlags.IsComponentsV2,components:containers};
  }

  async restoreAfterPunishment(member:GuildMember):Promise<void>{const plan=await this.service.buildPostPunishmentRestorePlan(member.guild.id,member.id);await this.applyRestorePlan(member,plan);}

  private async applyRestorePlan(member:GuildMember,plan:RestorePlan){
    const [access,jailed]=await Promise.all([roleId(this.config,member.guild.id,'roles.member_access'),roleId(this.config,member.guild.id,'roles.jailed')]);
    const restored:string[]=[];const failed:{roleId:string;reason:string}[]=[];
    if(plan.applyJailedRole){
      if(access&&member.roles.cache.has(access))await member.roles.remove(access,'Active moderation Hotseat restored after rejoin.').catch(()=>undefined);
      if(jailed){try{await member.roles.add(jailed,'Active moderation Hotseat restored after rejoin.');restored.push(jailed);}catch(error){failed.push({roleId:jailed,reason:safeError(error)});}}
    }else{
      if(jailed&&member.roles.cache.has(jailed))await member.roles.remove(jailed,'No active moderation Hotseat after rules acknowledgment.').catch(()=>undefined);
      if(access){try{await member.roles.add(access,'Rules acknowledged.');restored.push(access);}catch(error){failed.push({roleId:access,reason:safeError(error)});}}
      for(const snapshot of plan.rolesToRestore){
        const role=member.guild.roles.cache.get(snapshot.roleId);
        if(!role){failed.push({roleId:snapshot.roleId,reason:'Role no longer exists.'});continue;}
        if(role.managed||!role.editable){failed.push({roleId:snapshot.roleId,reason:'Role is managed or above Angrier Jordan.'});continue;}
        if(snapshot.kind==='SELF'&&role.permissions.bitfield!==0n){failed.push({roleId:snapshot.roleId,reason:'Self-select role now has Discord permissions.'});continue;}
        try{await member.roles.add(role,'Restoring eligible role after rejoin.');restored.push(role.id);}catch(error){failed.push({roleId:role.id,reason:safeError(error)});}
      }
    }
    let nicknameRestored=false;let nicknameFailure:string|undefined;
    if(plan.nickname){try{await member.setNickname(plan.nickname,'Restoring nickname after rejoin.');nicknameRestored=true;}catch(error){nicknameFailure=safeError(error);}}
    if(!plan.deferredBecausePunished)await this.service.completeRoleRestore(member.guild.id,member.id,{restoredRoleIds:restored,failed,nicknameRestored,...(nicknameFailure?{nicknameFailure}:{})});
    return {restored,failed,nicknameRestored,nicknameFailure};
  }
}
