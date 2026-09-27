import {AttachmentBuilder,ContainerBuilder,MediaGalleryBuilder,MediaGalleryItemBuilder,MessageFlags,TextDisplayBuilder,type ActionRowBuilder,type ButtonBuilder} from 'discord.js';

/** Gallery layout avoids the legacy embed image column. Existing media is retained on live text edits. */
export function waitingCountdown(expiresAt:Date|null|undefined,nowMs=Date.now()){
 const remaining=Math.max(0,Math.ceil(((expiresAt?.getTime()??nowMs)-nowMs)/1000));
 return `${String(Math.floor(remaining/60)).padStart(2,'0')}:${String(remaining%60).padStart(2,'0')}`;
}
export function eventWindow(input:{title:string;description:string;filename:string;image?:Buffer;rows:ActionRowBuilder<ButtonBuilder>[];accent?:number;callout?:string;imageUrl?:string;countdown?:string}){
 const window=new ContainerBuilder().setAccentColor(input.accent??0x10b981);
 const roles=input.callout?.match(/<@&\d+>/g);if(roles?.length)window.addTextDisplayComponents(new TextDisplayBuilder().setContent(roles.join(' ')));
 if(input.countdown)window.addTextDisplayComponents(new TextDisplayBuilder().setContent(input.countdown));
 window  .addMediaGalleryComponents(new MediaGalleryBuilder().addItems(new MediaGalleryItemBuilder().setURL(input.imageUrl??'attachment://'+input.filename).setDescription('Angrier Jordan · '+input.title)));
 for(const row of input.rows)window.addActionRowComponents(row);
 return{flags:MessageFlags.IsComponentsV2 as const,content:null,embeds:[],components:[window],...(input.image?{files:[new AttachmentBuilder(input.image,{name:input.filename})],attachments:[]}:{}),allowedMentions:{parse:[] as never[]}};
}

/** Includes nested V2 action rows and legacy messages for restart-safe delivery recovery. */
export function hasLineIdentity(components:readonly unknown[],id:string):boolean{
 return components.some(value=>{const c=value as {customId?:string;custom_id?:string;components?:unknown[]};const custom=c.customId??c.custom_id;return Boolean(custom?.startsWith('line:')&&custom.split(':')[2]===id)||Boolean(c.components&&hasLineIdentity(c.components,id));});
}
