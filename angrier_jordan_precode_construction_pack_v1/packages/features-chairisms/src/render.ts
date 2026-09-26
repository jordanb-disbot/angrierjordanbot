import {shell,panel,esc,ink} from '../../features-events/src/visual.js';
import {centeredHeading,centeredBlock,portrait} from '../../features-events/src/gate-b-visual.js';
import {validateSnapshot} from './domain.js';
import type {ChairismQuote,ChairismSnapshot} from './interfaces.js';
export interface ChairismRenderOptions {number?:number;showSourceChannel?:boolean;}
function quoteBlock(q:ChairismQuote,top:number,label?:string){let y=top+16,body=portrait('chairism-'+q.userId+'-'+top,q.displayName,q.avatarDataUri,220,y,76);y+=103;
 const add=(value:string,size:number,color:string)=>{const b=centeredBlock(value,y,{size,color,width:364});body+=b.svg;y+=b.height;};
 add(q.displayName,20,ink.warm);add((label?label+' · ':'')+new Date(q.timestamp).toISOString().slice(0,16).replace('T',' ')+' UTC',11,ink.muted);y+=6;add(q.text,16,ink.white);y+=12;return{body:panel(18,top,404,y-top,ink.gold)+body,height:y-top};}
export function renderChairism(snapshot:ChairismSnapshot,options:ChairismRenderOptions={}){validateSnapshot(snapshot);const h=centeredHeading('ANGRIER JORDAN · CHAIRS','Chairisms','A moment worth keeping.');let body=h.svg,y=h.height;
 const main=quoteBlock(snapshot.quote,y);body+=main.body;y+=main.height+14;if(snapshot.reply){const reply=quoteBlock(snapshot.reply,y,'Replied message');body+=reply.body;y+=reply.height+14;}
 if(snapshot.imageDataUri){body+=panel(18,y,404,268)+`<image href="${esc(snapshot.imageDataUri)}" x="30" y="${y+12}" width="380" height="244" preserveAspectRatio="xMidYMid meet"/>`;y+=282;}
 const labels=[options.number===undefined?'':`Chairism #${options.number}`,options.showSourceChannel&&snapshot.sourceChannelLabel?'#'+snapshot.sourceChannelLabel:''].filter(Boolean),footer=centeredBlock(labels.join(' · ')||'Kept in the Chairs lounge',y+14,{size:12,color:ink.muted});body+=footer.svg;return shell(y+footer.height+30,body);
}
