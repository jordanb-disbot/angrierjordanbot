import {esc,ink,panel,shell,text} from './visual.js';
import {wrapText} from '../../renderer/src/text-layout.js';

/** Gate B composition helpers. The approved event shell and Gate A renderers are unchanged. */
export function centeredBlock(value:string,y:number,options:{size?:number;color?:string;width?:number;gap?:number;weight?:number;lineHeight?:number;cx?:number}={}){
 const {size=17,color=ink.white,width=376,gap=8,weight,lineHeight=Math.ceil(size*1.35),cx=220}=options;
 const rows=wrapText(value,width,size);
 return{svg:rows.map((row,n)=>text(cx,y+n*lineHeight,row,size,color,`text-anchor="middle"${weight?` font-weight="${weight}"`:''}`)).join(''),height:rows.length*lineHeight+gap};
}
export function centeredHeading(kicker:string,title:string,subtitle:string){
 let y=34,svg='';
 for(const [value,size,color,weight]of [[kicker,11,ink.teal,600],[title,30,ink.white,700],[subtitle,14,ink.muted,400]] as const){
  if(!value)continue;
  const block=centeredBlock(value,y,{size,color,weight,width:384,gap:12});
  svg+=size!==14?`<g font-family="Space Grotesk">${block.svg}</g>`:block.svg;
  y+=block.height+(size===11?9:0);
 }
 return{svg,height:y+2};
}
/** Only embedded raster media enters SVG. Unavailable portraits use a deterministic monogram. */
export function portrait(id:string,name:string,avatarData:string|undefined,cx:number,top:number,size=80){
 const key='portrait-'+id.replace(/[^a-zA-Z0-9_-]/g,'_'),x=cx-size/2,r=Math.round(size*.18);
 const image=avatarData&&/^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(avatarData)&&avatarData.length<=1_400_000;
 const initials=[...new Intl.Segmenter('en',{granularity:'grapheme'}).segment(name.trim()||'AJ')].slice(0,2).map(s=>s.segment).join('').toUpperCase();
 return`<defs><clipPath id="${key}"><rect x="${x+5}" y="${top+5}" width="${size-10}" height="${size-10}" rx="${Math.max(2,r-4)}"/></clipPath></defs><rect x="${x-3}" y="${top+3}" width="${size+6}" height="${size}" rx="${r}" fill="#000" opacity=".55"/><rect x="${x}" y="${top}" width="${size}" height="${size}" rx="${r}" fill="url(#glass)" stroke="url(#gold)" stroke-width="2"/><rect x="${x+3}" y="${top+3}" width="${size-6}" height="${size-6}" rx="${r-2}" fill="#08282D" stroke="${ink.teal}" stroke-opacity=".6"/>`+(image?`<image href="${esc(avatarData!)}" x="${x+5}" y="${top+5}" width="${size-10}" height="${size-10}" preserveAspectRatio="xMidYMid slice" clip-path="url(#${key})"/>`:text(cx,top+size*.62,initials,size*.31,ink.warm,'text-anchor="middle" font-family="Space Grotesk" font-weight="600"'))+`<path d="M${x+10} ${top+2}H${x+size-10}" stroke="#FFF1C4" stroke-opacity=".6"/>`;
}
export function brandedNotice(title:string,message:string,kicker='ANGRIER JORDAN',tone:string=ink.gold){
 const head=centeredHeading(kicker,title,''),block=centeredBlock(message,head.height+33,{width:364,size:17,gap:0});
 const height=block.height+42;
 return shell(head.height+height+20,head.svg+panel(18,head.height,404,height,tone)+block.svg);
}
