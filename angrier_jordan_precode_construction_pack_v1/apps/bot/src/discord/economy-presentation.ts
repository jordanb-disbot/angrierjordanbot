import {AttachmentBuilder,EmbedBuilder} from 'discord.js';
import {renderEconomyPresentation,type EconomyPresentationInput} from '../../../../packages/features-economy/src/presentation.js';
import {rasterizeSvg} from '../../../../packages/renderer/src/raster.js';
export type {EconomyPresentationInput} from '../../../../packages/features-economy/src/presentation.js';

/** Shared legacy payload: existing private reply/update flows and native controls remain compatible. */
export async function economyPresentation(input:EconomyPresentationInput){
 const embed=new EmbedBuilder().setColor(input.accent??0x0ea5a6).setTitle(input.title).setImage('attachment://economy-window.png');
 if(input.description)embed.setDescription(input.description);
 if(input.fields?.length)embed.addFields(input.fields);
 if(input.footer)embed.setFooter({text:input.footer});
 const image=await rasterizeSvg(renderEconomyPresentation(input));
 return {embeds:[embed],files:[new AttachmentBuilder(image,{name:'economy-window.png'})],attachments:[]};
}
