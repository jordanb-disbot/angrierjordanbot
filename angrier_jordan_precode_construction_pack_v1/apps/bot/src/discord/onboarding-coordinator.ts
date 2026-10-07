import {
  ActionRowBuilder,ButtonBuilder,ButtonStyle,MessageFlags,PermissionFlagsBits,StringSelectMenuBuilder,TextDisplayBuilder,
  type ButtonInteraction,type ChatInputCommandInteraction,type GuildMember,type PartialGuildMember,type StringSelectMenuInteraction,
} from 'discord.js';
import type { ConfigService } from '../../../../packages/core/src/index.js';
import { DomainError } from '../../../../packages/core/src/index.js';
import type { OnboardingService, RestorePlan, RoleSnapshot, SelfRolePanelDefinition } from '../../../../packages/features-onboarding/src/index.js';
import {readFileSync} from 'node:fs';
import {renderOnboarding,renderRoleSelectionCard,renderRoleSelectionPanel,type GuidanceSection} from '../../../../packages/features-onboarding/src/render.js';
import {displayFrames,wideDisplay,frameGallery,type DisplayFrame} from './wide-display.js';

const rules=JSON.parse(readFileSync(new URL('../../../../packages/content/onboarding/rules.json',import.meta.url),'utf8')) as {title:string;sections:GuidanceSection[]};
let rolesArt:Promise<DisplayFrame[]>|undefined;
let rolesPanelArt:Promise<DisplayFrame[]>|undefined;
const completeRules=rules.sections.map(section=>'### '+section.title+'\n'+section.body).join('\n\n');

const roleId=async(config:ConfigService,guildId:string,key:string):Promise<string|null>=>{
  const value=await config.get(guildId,key);return typeof value==='string'&&value?value:null;
};
const safeError=(error:unknown)=>error instanceof Error?error.message:String(error);
const STAFF_PERMISSION_MASK=PermissionFlagsBits.Administrator|PermissionFlagsBits.ManageGuild|PermissionFlagsBits.ManageRoles|PermissionFlagsBits.ManageChannels|PermissionFlagsBits.KickMembers|PermissionFlagsBits.BanMembers|PermissionFlagsBits.ModerateMembers|PermissionFlagsBits.ManageMessages;
// The database panel is owner-editable, but it is not the authorization boundary. This
// fixed catalogue makes a stale or incorrectly edited panel unable to expose any other
// Discord role, including zero-permission prestige roles.
const SELF_ROLE_CATALOG:Readonly<Record<string,readonly string[]>>={
 dm_status:['DMs Open','DMs Closed'],gender:['Male','Female'],age:['18-24','25-34','35+'],
 regions:['North America','South America','Europe','Africa','Asia','Oceania'],
 vices:['Stimulants','Disassociatives','Hallucinogens','Depressants','Cannabinoids'],
 personalities:['Morning Perch','Night Recliner','BeanBag','Swivel Chair','Wobbly Stool','Ghost Chair'],
 pings:['Line Ping','Race Ping','VC Ping','Chess Ping'],
};
const ROLE_ASSIGNMENTS_CHANNEL_ID='1537333197438980116';
const approvedRolePanel=(panel:SelfRolePanelDefinition):SelfRolePanelDefinition=>({
 ...panel,categories:panel.categories.flatMap(category=>{
  const labels=SELF_ROLE_CATALOG[category.key];if(!labels)return[];
  const options=category.options.filter(option=>labels.includes(option.label));
  return options.length?[{...category,options}]:[];
 }),
});
export interface OnboardingLearningOptions {
  /** Reuses current shared capability, runtime activation and restriction checks. */
  eligible?:(guildId:string,userId:string)=>Promise<boolean>;
  /** True only when all authored lore chapters are published and readable. */
  loreAvailable?:(guildId:string)=>Promise<boolean>;
}

export class DiscordOnboardingCoordinator {
  constructor(private readonly service:OnboardingService,private readonly config:ConfigService,private readonly learning:OnboardingLearningOptions={}){}

  async handleMemberAdd(member:GuildMember):Promise<void>{
    const {returning}=await this.service.memberJoined(member.guild.id,member.id);
    const access=await roleId(this.config,member.guild.id,'roles.member_access');
    if(access&&member.roles.cache.has(access))await member.roles.remove(access,'Rules acknowledgment required on join/rejoin.').catch(()=>undefined);
    await member.send({content:(returning?'Welcome back to Chairs.':'Welcome to Chairs. Your seat is waiting.')+' Please review `/rules` and acknowledge them to complete your arrival.'}).catch(()=>undefined);
  }
  async sweepRolePanel(client:any,guildId:string):Promise<void>{
    const channel=await client.channels.fetch(ROLE_ASSIGNMENTS_CHANNEL_ID).catch(()=>null);
    if(!channel?.isTextBased?.()||!channel.isSendable?.()||!('messages'in channel))return;
    const payload=await this.sharedRolePanelMessage();
    const saved=await this.service.roleSelectionPanel(guildId);
    let panel:any=null;
    if(saved?.channelId===ROLE_ASSIGNMENTS_CHANNEL_ID)panel=await channel.messages.fetch(saved.messageId).catch(()=>null);
    const recent=await channel.messages.fetch({limit:100}).catch(()=>new Map());
    const managed=[...recent.values()].filter((message:any)=>this.isSharedRolePanel(message,client.user?.id));
    if(!this.isSharedRolePanel(panel,client.user?.id))panel=managed.shift()??null;
    for(const duplicate of managed){
      if(duplicate.id!==panel?.id)await duplicate.delete().catch(()=>undefined);
    }
    if(panel)await panel.edit(payload);
    else panel=await channel.send(payload);
    await this.service.saveRoleSelectionPanel({guildId,channelId:ROLE_ASSIGNMENTS_CHANNEL_ID,messageId:panel.id});
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
    await interaction.deferReply({ephemeral:true});
    await interaction.editReply(this.rulesMessage());
  }

  private rulesMessage(){
    const ack=new ActionRowBuilder<ButtonBuilder>().addComponents(new ButtonBuilder().setCustomId('onboard:ack_rules').setLabel('Acknowledge Rules').setStyle(ButtonStyle.Success));
    return {content:'## '+rules.title+'\n\n'+completeRules,components:[ack],allowedMentions:{parse:[] as never[]}};
  }

  async handleRulesAck(interaction:ButtonInteraction):Promise<void>{
    if(!interaction.guildId||!interaction.guild||!interaction.member){await interaction.reply({ephemeral:true,content:'This action is only available in the server.'});return;}
    await interaction.deferReply({ephemeral:true});
    const member=await interaction.guild.members.fetch(interaction.user.id);
    const plan=await this.service.acknowledgeRules(interaction.guildId,interaction.user.id);
    const result=await this.applyRestorePlan(member,plan);
    const accessText=plan.applyJailedRole?'Your rules acknowledgment is complete. Your moderation Hotseat has resumed; normal access returns when it ends.':'Rules acknowledged. Your normal server access has been restored.';
    const components=await this.optionalLearningButtons(member,plan,result.failed);
    const optional=plan.crimeCommandRestricted?(plan.applyJailedRole?'Crime jail also remains active. Another eligible member may pay your crime bail; moderation Hotseat remains separate.':'Crime jail still blocks ordinary bot commands. Use `/crime bail`, or another member may pay it for you.'):plan.applyJailedRole?'Optional next steps are available after your moderation Hotseat ends.':'Optional next steps: `/roles`, `/introduce`.'+(components.length?' The learning buttons are optional, too.':'');
    const failed=result.failed.length?`\n${result.failed.length} prior role(s) could not be restored and were logged.`:'';
    await interaction.editReply({content:`${accessText}\n${optional}${failed}`,components,allowedMentions:{parse:[]}});
  }

  private async optionalLearningButtons(member:GuildMember,plan:RestorePlan,failed:readonly {roleId:string}[]){
    // Optional discovery must never hold up a completed rules acknowledgment or bypass a
    // restored punishment, unsuccessful access restoration, timeout or current security gate.
    if(!plan.grantMemberAccess||plan.applyJailedRole||plan.crimeCommandRestricted||plan.deferredBecausePunished||member.isCommunicationDisabled?.())return[];
    try{
      const access=await roleId(this.config,member.guild.id,'roles.member_access');
      if(access&&failed.some(row=>row.roleId===access)||await this.learning.eligible?.(member.guild.id,member.id)!==true)return[];
      const [lore,learn]=await Promise.all(['features.lore','features.learning'].map(key=>this.config.get(member.guild.id,key))),buttons:ButtonBuilder[]=[];
      if(lore===true&&await this.learning.loreAvailable?.(member.guild.id)===true)buttons.push(new ButtonBuilder().setCustomId(`learn:lore:${member.id}:toc`).setLabel('Read the Lore').setStyle(ButtonStyle.Secondary));
      if(learn===true)buttons.push(new ButtonBuilder().setCustomId(`learn:tutorial:${member.id}:home`).setLabel('Show Me Around').setStyle(ButtonStyle.Secondary));
      return buttons.length?[new ActionRowBuilder<ButtonBuilder>().addComponents(buttons)]:[];
    }catch{return[];}
  }

  async handleRolesCommand(interaction:ChatInputCommandInteraction):Promise<void>{
    if(!interaction.guildId){await interaction.reply({ephemeral:true,content:'This command is only available in the server.'});return;}
    if(interaction.channelId&&interaction.channelId!==ROLE_ASSIGNMENTS_CHANNEL_ID){await interaction.reply({ephemeral:true,content:`Role selection lives in <#${ROLE_ASSIGNMENTS_CHANNEL_ID}>. Open that channel to manage and publish your roles.`,allowedMentions:{parse:[]}});return;}
    await interaction.deferReply({ephemeral:true});
    try{
      const state=await this.service.rolePanel(interaction.guildId,interaction.user.id);await interaction.editReply(await this.rolePanelMessage(approvedRolePanel(state.panel),state.selections.filter(x=>x.active).map(x=>x.roleId)));this.expirePrivateRoleReply(interaction);
    }
    catch(error){await interaction.editReply({content:error instanceof DomainError?error.message:'The role panel could not be loaded.'});}
  }
  async handleRolePanelOpen(interaction:ButtonInteraction):Promise<void>{
    if(!interaction.guildId){await interaction.reply({ephemeral:true,content:'This action is only available in the server.'});return;}
    await interaction.deferReply({ephemeral:true});const state=await this.service.rolePanel(interaction.guildId,interaction.user.id);await interaction.editReply(await this.rolePanelMessage(approvedRolePanel(state.panel),state.selections.filter(x=>x.active).map(x=>x.roleId)));this.expirePrivateRoleReply(interaction);
  }
  async handleRoleCardEdit(interaction:ButtonInteraction):Promise<void>{
    const ownerId=interaction.customId.split(':').at(-1);
    if(ownerId!==interaction.user.id){await interaction.reply({ephemeral:true,content:'Only the member who published this role card can edit these selections.'});return;}
    await this.handleRolePanelOpen(interaction);
  }

  private expirePrivateRoleReply(interaction:any){
    const timer=setTimeout(()=>void interaction.deleteReply?.().catch(()=>undefined),10*60*1000);
    timer.unref?.();
  }

  private async sharedRolePanelMessage(){
    const art=await(rolesPanelArt??=displayFrames(renderRoleSelectionPanel(),'seating-assignment-panel','Choose Your Seats · private role selection.').catch(error=>{rolesPanelArt=undefined;throw error;}));
    return wideDisplay(art,[new ActionRowBuilder<ButtonBuilder>().addComponents(new ButtonBuilder().setCustomId('roles:panel:open').setLabel('Choose My Roles').setStyle(ButtonStyle.Primary))]);
  }

  private isSharedRolePanel(message:any,botId?:string):boolean{
    return Boolean(message&&message.author?.id===botId&&message.components?.some((row:any)=>row.components?.some((component:any)=>component.customId==='roles:panel:open')));
  }

  async handleRoleSelect(interaction:StringSelectMenuInteraction):Promise<void>{
    try{
      if(!interaction.guildId||!interaction.guild){await interaction.reply({ephemeral:true,content:'This action is only available in the server.'});return;}
      const member=await interaction.guild.members.fetch(interaction.user.id);
      const parts=interaction.customId.split(':');
      const categoryKey=parts[2]??'';const segmentIndex=Number(parts[3]??'0');
      await interaction.deferUpdate();
      if(categoryKey==='_category'){
        const state=await this.service.rolePanel(interaction.guildId,interaction.user.id),key=interaction.values[0];
        const panel=approvedRolePanel(state.panel);
        if(!panel.categories.some(c=>c.key===key))throw new DomainError('ROLE_CATEGORY_NOT_FOUND','This category is no longer available. Reopen /roles.');
        await interaction.editReply(await this.rolePanelMessage(panel,state.selections.filter(x=>x.active).map(x=>x.roleId),![...interaction.message?.attachments?.values()??[]].some(a=>a.name==='your-roles-1.png'),key));this.expirePrivateRoleReply(interaction);return;
      }
      const stateBefore=await this.service.rolePanel(interaction.guildId,interaction.user.id);
      const category=approvedRolePanel(stateBefore.panel).categories.find(c=>c.key===categoryKey);
      if(!category)throw new DomainError('ROLE_CATEGORY_NOT_FOUND','This category is no longer available. Reopen /roles.');
      if(!Number.isInteger(segmentIndex)||segmentIndex<0||segmentIndex>=Math.ceil(category.options.filter(o=>o.enabled&&!o.archived).length/25))throw new DomainError('ROLE_PAGE_STALE','These choices are no longer available. Reopen /roles.');
      const visibleOptions=category.options.filter(o=>o.enabled&&!o.archived);
      const segmentRoleIds=new Set(visibleOptions.slice(segmentIndex*25,segmentIndex*25+25).map(o=>o.roleId));
      const current=stateBefore.selections.filter(x=>x.active&&x.categoryKey===categoryKey).map(x=>x.roleId);
      const selectedRoleIds=category.mode==='single'?[...interaction.values]:[...current.filter(id=>!segmentRoleIds.has(id)),...interaction.values];
      if(selectedRoleIds.some(id=>!visibleOptions.some(option=>option.roleId===id)))throw new DomainError('ROLE_OPTION_NOT_AVAILABLE',`A selected role is no longer available in ${category.label}. Reopen /roles.`);
      const plan=await this.service.planRoleCategoryUpdate({guildId:interaction.guildId,userId:interaction.user.id,categoryKey,selectedRoleIds});
      const touched=[...new Set([...plan.addRoleIds,...plan.removeRoleIds])];
      // A stale or misconfigured panel must never turn an access, staff, custody or DJ role
      // into a self-assignable option merely because its base permission bits are zero.
      const protectedKeys=['roles.throne','roles.chaise_lounge','roles.recliner','roles.jailed','roles.member_access'];
      const protectedIds=new Set((await Promise.all(protectedKeys.map(key=>this.config.get(interaction.guildId!,key)))).filter((id):id is string=>typeof id==='string'&&Boolean(id)));
      if([...selectedRoleIds,...touched].some(id=>protectedIds.has(id)))throw new DomainError('ROLE_PROTECTED','A protected server role cannot be selected here. Ask staff to update this panel.');
      for(const id of touched){
        const role=interaction.guild.roles.cache.get(id);
        // A role deleted after a prior selection is safe to remove from bot state. It cannot
        // be removed from Discord, so let the replacement selection clean up the stale record.
        if(!role){if(plan.addRoleIds.includes(id))throw new DomainError('ROLE_MISSING','A configured role no longer exists. Ask staff to update this category.');continue;}
        if(role.managed||!role.editable)throw new DomainError('ROLE_UNMANAGEABLE',`Angrier Jordan cannot manage ${role.name}. Ask staff to move the role below Angrier Jordan.`);
        if(plan.addRoleIds.includes(id)&&role.permissions.bitfield!==0n)throw new DomainError('ROLE_HAS_PERMISSIONS',`${role.name} has Discord permissions and cannot be self-selected.`);
      }
      // Selection is intentionally private and durable, but it does not mutate
      // Discord membership.  The explicit publish action validates the current
      // hierarchy again and applies the complete selected set as one rollbackable
      // operation.
      await this.service.updateRoleCategory({guildId:interaction.guildId,userId:interaction.user.id,categoryKey,selectedRoleIds});
      const state=await this.service.rolePanel(interaction.guildId,interaction.user.id);
      await interaction.editReply(await this.rolePanelMessage(approvedRolePanel(state.panel),state.selections.filter(x=>x.active).map(x=>x.roleId),![...interaction.message?.attachments?.values()??[]].some(a=>a.name==='your-roles-1.png'),categoryKey));this.expirePrivateRoleReply(interaction);
    }catch(error){
      const content=error instanceof DomainError?error.message:'That role choice could not be completed. No role changes were saved.';
      if(interaction.deferred||interaction.replied)await interaction.followUp({ephemeral:true,content}).catch(()=>undefined);
      else await interaction.reply({ephemeral:true,content}).catch(()=>undefined);
    }
  }
  async handleRolePublish(interaction:ButtonInteraction):Promise<void>{
    if(!interaction.guildId||!interaction.guild){await interaction.reply({ephemeral:true,content:'This action is only available in the server.'});return;}
    await interaction.deferReply({ephemeral:true});
    try{
      const state=await this.service.rolePanel(interaction.guildId,interaction.user.id),selected=state.selections.filter(x=>x.active).map(x=>x.roleId),member=await interaction.guild.members.fetch(interaction.user.id);
      const rollback=await this.applyPublishedRoles(member,approvedRolePanel(state.panel),selected);
      try{await this.publishRoleSelectionCard(interaction.guild,interaction.user.id,approvedRolePanel(state.panel),selected,member);}
      catch(error){await rollback();throw error;}
      // The public card is the durable confirmation.  Remove the private selector
      // rather than leaving a stale confirmation alongside it.
      await interaction.deleteReply?.().catch(()=>undefined);
    }catch(error){await interaction.editReply({content:error instanceof DomainError?error.message:'Your roles could not be published. No role card was updated.'});}
  }

  private async applyPublishedRoles(member:any,panel:SelfRolePanelDefinition,selectedRoleIds:readonly string[]):Promise<()=>Promise<void>>{
    const managed=new Set(panel.categories.flatMap(category=>category.options.filter(option=>option.enabled&&!option.archived).map(option=>option.roleId))),selected=[...new Set(selectedRoleIds)].filter(id=>managed.has(id)),current=[...managed].filter(id=>member.roles.cache.has(id)),add=selected.filter(id=>!current.includes(id)),remove=current.filter(id=>!selected.includes(id));
    const protectedKeys=['roles.throne','roles.chaise_lounge','roles.recliner','roles.jailed','roles.member_access'];
    const protectedIds=new Set((await Promise.all(protectedKeys.map(key=>this.config.get(member.guild.id,key)))).filter((id):id is string=>typeof id==='string'&&Boolean(id)));
    if([...add,...remove].some(id=>protectedIds.has(id)))throw new DomainError('ROLE_PROTECTED','A protected server role cannot be changed here. Ask staff to update this panel.');
    for(const id of [...add,...remove]){
      const role=member.guild.roles.cache.get(id);if(!role){if(add.includes(id))throw new DomainError('ROLE_MISSING','A configured role no longer exists. Ask staff to update this category.');continue;}
      if(role.managed||!role.editable)throw new DomainError('ROLE_UNMANAGEABLE',`Angrier Jordan cannot manage ${role.name}. Ask staff to move the role below Angrier Jordan.`);
      if(add.includes(id)&&role.permissions.bitfield!==0n)throw new DomainError('ROLE_HAS_PERMISSIONS',`${role.name} has Discord permissions and cannot be self-selected.`);
    }
    const removed:string[]=[],added:string[]=[];
    try{for(const id of remove){if(member.guild.roles.cache.has(id)){await member.roles.remove(id,'Published self-role selection changed.');removed.push(id);}}for(const id of add){await member.roles.add(id,'Published self-role selection changed.');added.push(id);}}
    catch(error){for(const id of added)await member.roles.remove(id,'Rolling back failed role publication.').catch(()=>undefined);for(const id of removed)await member.roles.add(id,'Rolling back failed role publication.').catch(()=>undefined);throw error;}
    return async()=>{for(const id of added)await member.roles.remove(id,'Rolling back failed role-card publication.').catch(()=>undefined);for(const id of removed)await member.roles.add(id,'Rolling back failed role-card publication.').catch(()=>undefined);};
  }

  private async publishRoleSelectionCard(guild:any,userId:string,panel:SelfRolePanelDefinition,selectedRoleIds:readonly string[],member:any){
    const channel=await guild.channels.fetch(ROLE_ASSIGNMENTS_CHANNEL_ID).catch(()=>null);if(!channel?.isTextBased?.()||!channel.isSendable?.())throw new DomainError('ROLE_ASSIGNMENTS_UNAVAILABLE','The role assignments channel is unavailable. No role changes were saved.');
    const selected=new Set(selectedRoleIds),groups=panel.categories.map(category=>({name:category.label,roles:category.options.filter(option=>selected.has(option.roleId)).map(option=>option.label)})).filter(group=>group.roles.length);
    const images=await displayFrames(renderRoleSelectionCard(member.displayName,groups.map(group=>({title:group.name.toUpperCase(),body:group.roles.join(' · ')}))),'seating-assignment-'+userId,'Seating Assignment · '+member.displayName);
    const payload=wideDisplay(images,[new ActionRowBuilder<ButtonBuilder>().addComponents(new ButtonBuilder().setCustomId(`roles:card:edit:${userId}`).setLabel('Edit My Roles').setStyle(ButtonStyle.Secondary))]);
    const saved=await this.service.roleSelectionCard(guild.id,userId);let old:any=null;
    if(saved?.channelId===ROLE_ASSIGNMENTS_CHANNEL_ID)old=await channel.messages.fetch(saved.messageId).catch(()=>null);
    // Post and persist the replacement before removing the old card, so an
    // attachment or Discord failure cannot leave the member without a card.
    const message=await channel.send(payload);
    try{
      await this.service.saveRoleSelectionCard({guildId:guild.id,userId,channelId:ROLE_ASSIGNMENTS_CHANNEL_ID,messageId:message.id});
      if(old)await old.delete();
    }catch(error){
      await message.delete().catch(()=>undefined);
      if(saved)await this.service.saveRoleSelectionCard({guildId:guild.id,userId,channelId:saved.channelId,messageId:saved.messageId}).catch(()=>undefined);
      throw error;
    }
    await this.placeRolePanel(channel,guild.id,guild.client?.user?.id);
  }

  private async placeRolePanel(channel:any,guildId:string,botId?:string):Promise<void>{
    const saved=await this.service.roleSelectionPanel(guildId);if(saved?.channelId===ROLE_ASSIGNMENTS_CHANNEL_ID){const previous=await channel.messages.fetch(saved.messageId).catch(()=>null);if(previous)await previous.delete().catch(()=>undefined);}
    const recent=await channel.messages.fetch({limit:100}).catch(()=>new Map());for(const duplicate of recent.values()){if(this.isSharedRolePanel(duplicate,botId))await duplicate.delete().catch(()=>undefined);}
    const panel=await channel.send(await this.sharedRolePanelMessage());await this.service.saveRoleSelectionPanel({guildId,channelId:ROLE_ASSIGNMENTS_CHANNEL_ID,messageId:panel.id});
  }

  private async rolePanelMessage(panel:SelfRolePanelDefinition,selectedRoleIds:string[],includeArtwork=true,categoryKey?:string){
    const selected=new Set(selectedRoleIds);
    const components:Array<TextDisplayBuilder|ActionRowBuilder<StringSelectMenuBuilder>|ActionRowBuilder<ButtonBuilder>>=[];
    if(panel.categories.length)components.push(new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(new StringSelectMenuBuilder().setCustomId('roles:select:_category').setPlaceholder('Choose a role category').addOptions(panel.categories.slice(0,25).map(c=>({label:c.label,value:c.key,default:c.key===categoryKey,description:c.mode==='single'?'Choose one, or clear your selection':'Choose several, or clear your selections'})))));
    else components.push(new TextDisplayBuilder().setContent('Role categories have not been configured yet. Please check back after staff completes setup.'));
    for(const category of panel.categories.filter(c=>c.key===categoryKey)){
      const options=category.options.filter(o=>o.enabled&&!o.archived);
      if(!options.length){components.push(new TextDisplayBuilder().setContent(`**${category.label}**\n_No options configured yet._`));continue;}
      const current=options.filter(o=>selected.has(o.roleId)).map(o=>o.label);
      components.push(new TextDisplayBuilder().setContent(`**${category.label} · ${category.mode==='single'?'Choose one':'Choose several'}**\nCurrent: ${current.join(', ')||'No selections'}. Clear the menu to remove selections.`));
      for(let segment=0;segment<Math.ceil(options.length/25);segment++){
        const page=options.slice(segment*25,segment*25+25);
        const label=Math.ceil(options.length/25)>1?`${category.label} (${segment+1}/${Math.ceil(options.length/25)})`:category.label;
        const menu=new StringSelectMenuBuilder().setCustomId(`roles:select:${category.key}:${segment}`).setPlaceholder(label).setMinValues(0).setMaxValues(category.mode==='single'?1:page.length);
        menu.addOptions(page.map(option=>({label:option.label,value:option.roleId,default:selected.has(option.roleId),...(option.emoji?{emoji:option.emoji}:{})})));
        components.push(new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu));
      }
    }
    components.push(new ActionRowBuilder<ButtonBuilder>().addComponents(new ButtonBuilder().setCustomId('roles:publish').setLabel('Publish My Selections').setStyle(ButtonStyle.Primary)));
    const art=await(rolesArt??=displayFrames(renderOnboarding('Your Place in Chairs','Choose the details that feel like you',[{title:'YOUR ROLES · YOUR CHOICE',body:'Select from the categories below. Clear a selection to remove it. Changes are saved immediately; reopen /roles to see your choices.'},{title:'APPROVED SELF-ASSIGNABLE ROLES',body:'Only configured member roles are available. Staff and protected roles cannot be self-assigned.'}]),'your-roles','Choose your roles. Saved selections appear in the menus.').catch(error=>{rolesArt=undefined;throw error;}));
    if(includeArtwork)return wideDisplay(art,components);
    // Existing gallery attachments remain while native selections update.
    return {flags:MessageFlags.IsComponentsV2 as const,content:null,embeds:[],components:[...art.map(frame=>frameGallery(frame.name,frame.description)),...components],allowedMentions:{parse:[] as never[]}};
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
