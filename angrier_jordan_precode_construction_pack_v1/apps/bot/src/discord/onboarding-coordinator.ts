import {
  ActionRowBuilder,AttachmentBuilder,EmbedBuilder,MediaGalleryBuilder,MediaGalleryItemBuilder,ButtonBuilder,ButtonStyle,ContainerBuilder,MessageFlags,PermissionFlagsBits,StringSelectMenuBuilder,TextDisplayBuilder,
  type ButtonInteraction,type ChatInputCommandInteraction,type GuildMember,type PartialGuildMember,type StringSelectMenuInteraction,
} from 'discord.js';
import type { ConfigService } from '../../../../packages/core/src/index.js';
import { DomainError } from '../../../../packages/core/src/index.js';
import type { OnboardingService, RestorePlan, RoleSnapshot, SelfRolePanelDefinition } from '../../../../packages/features-onboarding/src/index.js';
import {readFileSync} from 'node:fs';
import {renderOnboarding,rulesSections,type GuidanceSection} from '../../../../packages/features-onboarding/src/render.js';
import {rasterizeSvg} from '../../../../packages/renderer/src/raster.js';

const rules=JSON.parse(readFileSync(new URL('../../../../packages/content/onboarding/rules.json',import.meta.url),'utf8')) as {title:string;sections:GuidanceSection[]};
let rulesArt:Promise<Buffer[]>|undefined;
let rolesArt:Promise<Buffer>|undefined;
function rulesImages(){return rulesArt??=Promise.all(rules.sections.flatMap(section=>rulesSections(section.body).map((page,index,pages)=>rasterizeSvg(renderOnboarding(rules.title,'Our shared space · read before acknowledging',[{title:section.title+(pages.length>1?` · ${index+1}/${pages.length}`:''),body:page[0]!.body}]))))).catch(error=>{rulesArt=undefined;throw error;});}

const roleId=async(config:ConfigService,guildId:string,key:string):Promise<string|null>=>{
  const value=await config.get(guildId,key);return typeof value==='string'&&value?value:null;
};
const safeError=(error:unknown)=>error instanceof Error?error.message:String(error);
const STAFF_PERMISSION_MASK=PermissionFlagsBits.Administrator|PermissionFlagsBits.ManageGuild|PermissionFlagsBits.ManageRoles|PermissionFlagsBits.ManageChannels|PermissionFlagsBits.KickMembers|PermissionFlagsBits.BanMembers|PermissionFlagsBits.ModerateMembers|PermissionFlagsBits.ManageMessages;
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
    const images=await rulesImages();
    const files=images.map((buffer,i)=>new AttachmentBuilder(buffer,{name:`chairs-rules-${i+1}.png`,description:`${rules.title}, page ${i+1}.`}));
    const ack=new ButtonBuilder().setCustomId('onboard:ack_rules').setLabel('Acknowledge Rules').setStyle(ButtonStyle.Success);
    await interaction.editReply({embeds:files.map((_,i)=>new EmbedBuilder().setColor(0x773747).setImage(`attachment://chairs-rules-${i+1}.png`)),files,components:[new ActionRowBuilder<ButtonBuilder>().addComponents(ack)],allowedMentions:{parse:[]}});
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
    await interaction.deferReply({ephemeral:true});
    try{const state=await this.service.rolePanel(interaction.guildId,interaction.user.id);await interaction.editReply(await this.rolePanelMessage(state.panel,state.selections.filter(x=>x.active).map(x=>x.roleId)));}
    catch(error){await interaction.editReply({content:error instanceof DomainError?error.message:'The role panel could not be loaded.'});}
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
    await interaction.editReply(await this.rolePanelMessage(state.panel,state.selections.filter(x=>x.active).map(x=>x.roleId),false));
  }

  private async rolePanelMessage(panel:SelfRolePanelDefinition,selectedRoleIds:string[],includeArtwork=true){
    const selected=new Set(selectedRoleIds);
    const components:Array<TextDisplayBuilder|ActionRowBuilder<StringSelectMenuBuilder>>=[];
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
    const containers:ContainerBuilder[]=[new ContainerBuilder().setAccentColor(0x773747).addMediaGalleryComponents(new MediaGalleryBuilder().addItems(new MediaGalleryItemBuilder().setURL('attachment://your-roles.png').setDescription('Choose your roles. Saved selections appear in the menus. Clear a selection to remove it.')))];
    for(let i=0;i<components.length;i+=9){const container=new ContainerBuilder().setAccentColor(0x773747);for(const c of components.slice(i,i+9)){if(c instanceof TextDisplayBuilder)container.addTextDisplayComponents(c);else container.addActionRowComponents(c);}containers.push(container);}
    const art=includeArtwork?await(rolesArt??=rasterizeSvg(renderOnboarding('Your Place in Chairs','Choose the details that feel like you',[{title:'YOUR ROLES · YOUR CHOICE',body:'Select from the categories below. Clear a selection to remove it. Changes are saved immediately; reopen /roles to see your choices.'},{title:'APPROVED SELF-ASSIGNABLE ROLES',body:'Only configured member roles are available. Staff and protected roles cannot be self-assigned.'}])).catch(error=>{rolesArt=undefined;throw error;})):null;
    return {flags:MessageFlags.IsComponentsV2 as const,components:containers,...(art?{files:[new AttachmentBuilder(art,{name:'your-roles.png'})],attachments:[]}:{}),allowedMentions:{parse:[] as never[]}};
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
