import {chairismFrame as shell,chairismPlate,chairismHeading} from './presentation.js';
import {esc,ink} from '../../features-events/src/visual.js';
import {centeredBlock,portrait} from '../../features-events/src/gate-b-visual.js';
import {validateSnapshot} from './domain.js';
import type {ChairismQuote,ChairismSnapshot} from './interfaces.js';
export interface ChairismRenderOptions {number?:number;showSourceChannel?:boolean;}
function quoteBlock(q:ChairismQuote,top:number,label?:string){let y=top+24,body=portrait('chairism-'+q.userId+'-'+top,q.displayName,q.avatarDataUri,600,y,120);y+=154;
 const add=(value:string,size:number,color:string)=>{const b=centeredBlock(value,y,{size,color,width:1010,cx:600,weight:600});body+=b.svg;y+=b.height;};
 add(q.displayName,30,ink.warm);add((label?label+' · ':'')+new Date(q.timestamp).toISOString().slice(0,16).replace('T',' ')+' UTC',22,ink.muted);y+=24;add(q.text,38,ink.white);y+=12;return{body:chairismPlate(top,y-top)+body,height:y-top};}
export function renderChairism(snapshot:ChairismSnapshot,options:ChairismRenderOptions={}){validateSnapshot(snapshot);let body=chairismHeading('Chairisms'),y=194;
 const main=quoteBlock(snapshot.quote,y);body+=main.body;y+=main.height+14;if(snapshot.reply){const reply=quoteBlock(snapshot.reply,y,'Replied message');body+=reply.body;y+=reply.height+14;}
 if(snapshot.imageDataUri){body+=chairismPlate(y,600)+`<image href="${esc(snapshot.imageDataUri)}" x="56" y="${y+24}" width="1088" height="552" preserveAspectRatio="xMidYMid meet"/>`;y+=620;}
 const labels=[options.number===undefined?'':`Chairism #${options.number}`,options.showSourceChannel&&snapshot.sourceChannelLabel?'#'+snapshot.sourceChannelLabel:''].filter(Boolean),footer=centeredBlock(labels.join(' · ')||'Kept in the Chairs lounge',y+14,{size:23,color:ink.warm,cx:600,width:1080});body+=footer.svg;return shell(y+footer.height+30,body);
}
