import {shell,panel,ink,text} from '../../features-events/src/visual.js';
import {centeredBlock,portrait} from '../../features-events/src/gate-b-visual.js';
import type {SpotlightRenderInput} from './render.js';
export function renderSpotlight(data:SpotlightRenderInput){
 let body=text(600,48,'ANGRIER JORDAN · THE WEEKLY HONORS',22,ink.warm,'text-anchor="middle" letter-spacing="3"')+text(600,105,'Weekly Spotlight',46,ink.white,'text-anchor="middle" font-family="Space Grotesk" font-weight="700"')+text(600,145,data.weekStart+' — '+data.weekEnd+' · Mountain',24,ink.muted,'text-anchor="middle"');
 let bottom=210;
 for(const [index,category]of data.categories.entries()){
 const x=28+(index%3)*390,top=190+Math.floor(index/3)*650,cx=x+182;let y=top+44,content='';
 const add=(value:string,size:number,color:string)=>{const block=centeredBlock(value,y,{cx,width:320,size,color,weight:600,lineHeight:Math.ceil(size*1.4)});content+=block.svg;y+=block.height+10;};
 add(category.title,28,ink.warm);
 if(!category.winners.length)add('No qualifying winner',26,ink.muted);
 for(const [n,winner]of category.winners.entries()){content+=portrait('honors-'+index+'-'+n,winner.name,winner.avatarData,cx,y,120);y+=155;add(winner.name,30,ink.white);add(winner.total,42,ink.gold);add(winner.status.replaceAll('_',' '),22,ink.warm);add(winner.lifetimeWins+' lifetime wins',23,ink.muted);if(winner.tripleThreat)add('TRIPLE THREAT · PERMANENT',22,ink.gold);}
 const height=Math.max(475,y-top+10);body+=panel(x,top,364,height,'#F59E0B')+'<path d="M'+(x+14)+' '+(top+45)+'V'+(top+14)+'H'+(x+48)+'" stroke="#F4C542" stroke-width="3" fill="none"/>'+content;bottom=Math.max(bottom,top+height+24);
 }
 const footer=centeredBlock(data.activeMembers+' active members · '+data.messages+' messages · '+data.words+' words · '+data.voiceSeconds+' voice seconds',bottom+42,{cx:600,width:1090,size:25,weight:600});body+=panel(28,bottom,1144,footer.height+54,ink.gold)+footer.svg;
 return shell(bottom+footer.height+78,body,0,1200).replaceAll('#173239','#3A2D22').replaceAll('#102630','#25211F').replace('stroke="#00D7CF"','stroke="#F59E0B"');
}
