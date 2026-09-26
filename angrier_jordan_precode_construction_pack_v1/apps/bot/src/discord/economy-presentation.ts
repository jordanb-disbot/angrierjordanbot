import {AttachmentBuilder,EmbedBuilder} from 'discord.js';
import {renderEconomyPresentation,type EconomyPresentationInput} from '../../../../packages/features-economy/src/presentation.js';
import {rasterizeSvg} from '../../../../packages/renderer/src/raster.js';
export type {EconomyPresentationInput} from '../../../../packages/features-economy/src/presentation.js';

/** Shared legacy payload: existing private reply/update flows and native controls remain compatible. */
export async function economyPresentation(input:EconomyPresentationInput & {imagePrimary?:boolean}){
 const embed=new EmbedBuilder().setColor(input.accent??0x0ea5a6).setTitle(input.title).setImage('attachment://economy-window.png');
 const accessible=[input.title,input.summary,input.description,...(input.fields??[]).map(f=>f.name+': '+f.value),input.footer].filter(Boolean).join('\n');
 const imagePrimary=input.imagePrimary===true&&accessible.length<=1024;
 if(!imagePrimary&&input.description)embed.setDescription(input.description);
 if(!imagePrimary&&input.fields?.length)embed.addFields(input.fields);
 if(!imagePrimary&&input.footer)embed.setFooter({text:input.footer});
 const image=await rasterizeSvg(renderEconomyPresentation(input));
 return {embeds:[embed],files:[new AttachmentBuilder(image,{name:'economy-window.png',description:accessible.slice(0,1024)})],attachments:[]};
}
