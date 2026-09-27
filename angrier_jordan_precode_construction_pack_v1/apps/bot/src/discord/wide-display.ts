import {AttachmentBuilder,MediaGalleryBuilder,MediaGalleryItemBuilder,MessageFlags,TextDisplayBuilder,type ActionRowBuilder,type ButtonBuilder,type StringSelectMenuBuilder} from 'discord.js';
import sharp from 'sharp';
import {rasterizeSvg} from '../../../../packages/renderer/src/raster.js';
export interface DisplayFrame {name:string;data:Buffer;width:number;height:number;description:string}
export type DisplayControl=ActionRowBuilder<ButtonBuilder>|ActionRowBuilder<StringSelectMenuBuilder>|TextDisplayBuilder;
/** A wide source can still display narrowly when its portrait aspect is height-limited.
 * Keep the original pixels and split only between text baselines; each gallery has one
 * landscape item so Discord never builds a thumbnail mosaic. No content is discarded. */
export async function displayFrames(svg:string,stem:string,description:string,maxFrames=10):Promise<DisplayFrame[]>{
 const data=await rasterizeSvg(svg),metadata=await sharp(data).metadata(),width=metadata.width!,height=metadata.height!;
 const forbidden=[...svg.matchAll(/<text\b[^>]*\by="([\d.]+)"[^>]*\bfont-size="([\d.]+)"/g)].map(m=>({start:Number(m[1])-Number(m[2])*1.05,end:Number(m[1])+Number(m[2])*.22}));
 const maxHeight=Math.floor(width*.6),bounds=[0];
 while(height-bounds.at(-1)!>maxHeight){const start=bounds.at(-1)!,slots=maxFrames-bounds.length+1;if(slots<=1)break;const target=start+(height-start<=slots*maxHeight?Math.min(maxHeight,Math.ceil((height-start)/Math.ceil((height-start)/maxHeight))):Math.ceil((height-start)/slots)+80);if(target>=height)break;let cut=target;while(cut>start+(target-start)*.65&&forbidden.some(r=>cut>=r.start&&cut<=r.end))cut--;if(cut<=start+(target-start)*.65)throw new Error('No safe display boundary between text lines.');bounds.push(cut);}
 bounds.push(height);
 return Promise.all(bounds.slice(0,-1).map(async(top,n)=>({name:stem+'-'+(n+1)+'.png',data:bounds.length===2?data:await sharp(data).extract({left:0,top,width,height:bounds[n+1]!-top}).png().toBuffer(),width,height:bounds[n+1]!-top,description:(description+(bounds.length>2?` · image ${n+1} of ${bounds.length-1}`:'')).slice(0,1024)})));
}
export function frameGallery(name:string,description:string){return new MediaGalleryBuilder().addItems(new MediaGalleryItemBuilder().setURL('attachment://'+name).setDescription(description.slice(0,1024)));}
/** No legacy embed column or Container padding; controls remain native below artwork. */
export function wideDisplay(frames:readonly DisplayFrame[],controls:readonly DisplayControl[]=[],notice?:string,existing?:Iterable<{id:string;name:string}>){
 if(frames.length>10)throw new Error('Display exceeds Discord attachment limit.');
 const retained=new Map([...existing??[]].map(a=>[a.name,a]));
 return{flags:MessageFlags.IsComponentsV2 as const,content:null,embeds:[],components:[...frames.map(frame=>frameGallery(frame.name,frame.description)),...(notice?[new TextDisplayBuilder().setContent(notice)]:[]),...controls],attachments:frames.flatMap(frame=>retained.has(frame.name)?[{id:retained.get(frame.name)!.id}]:[]),files:frames.filter(frame=>!retained.has(frame.name)).map(frame=>new AttachmentBuilder(frame.data,{name:frame.name,description:frame.description})),allowedMentions:{parse:[] as never[]}};
}
export function displayNotice(message:string,controls:readonly DisplayControl[]=[]){return wideDisplay([],controls,message);}

export function createDisplay(payload:ReturnType<typeof wideDisplay>){const {content,attachments,...message}=payload;return message;}

/** Allocate Discord’s ten attachments across existing logical pages without rejecting long valid content. */
export function displayFrameBudgets(svgs:readonly string[],limit=10){if(svgs.length>limit)throw new Error('Too many logical image pages.');const heights=svgs.map(svg=>Number(/<svg[^>]*height="([\d.]+)"/.exec(svg)?.[1]??0)),budgets=svgs.map(()=>1);while(budgets.reduce((a,b)=>a+b,0)<limit){let largest=-1;for(let i=0;i<heights.length;i++)if(heights[i]!/budgets[i]!>720&&(largest<0||heights[i]!/budgets[i]!>heights[largest]!/budgets[largest]!))largest=i;if(largest<0)break;budgets[largest]=budgets[largest]!+1;}return budgets;}
