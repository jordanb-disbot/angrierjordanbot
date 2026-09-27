import {chairismFrame,chairismPlate,chairismHeading} from './presentation.js';
import {esc,ink,text} from '../../features-events/src/visual.js';
import {centeredBlock,portrait} from '../../features-events/src/gate-b-visual.js';
import {validateSnapshot} from './domain.js';
import type {ChairismQuote,ChairismSnapshot} from './interfaces.js';
export interface ChairismRenderOptions {number?:number;showSourceChannel?:boolean;}
function quoteBlock(q:ChairismQuote,top:number,label='THE MOMENT',width=1140,x=30,minHeight=320,layout:'short'|'long'='short'){
 const cx=x+width/2,name=centeredBlock(q.displayName,top+86,{size:30,color:ink.warm,width:width-280,cx:cx+66,weight:700}),stampY=top+86+Math.max(48,name.height),quoteY=stampY+78;
 const baseline=centeredBlock(q.text,quoteY,{size:width<1000?34:44,color:ink.white,width:width-104,cx,weight:600,lineHeight:width<1000?48:59}),h=Math.max(minHeight,quoteY-top+baseline.height+38);
 const areaTop=quoteY-18,areaHeight=h-(areaTop-top)-30;let size=layout==='long'?40:50;let quote=centeredBlock(q.text,areaTop,{size,color:ink.white,width:width-112,cx,weight:700,lineHeight:size*1.3});while(quote.height>areaHeight&&size>24){size-=2;quote=centeredBlock(q.text,areaTop,{size,color:ink.white,width:width-112,cx,weight:700,lineHeight:size*1.3});}
 return {height:h,body:chairismPlate(top,h,x,width)+portrait('chairism-'+q.userId+'-'+top+'-'+x,q.displayName,q.avatarDataUri,x+105,top+34,116)+text(cx+66,top+41,label,20,ink.warm,'text-anchor="middle" letter-spacing="3" font-weight="700"')+`<path d="M ${x+48} ${stampY+24} H ${x+width-48}" stroke="${ink.gold}" opacity=".32"/>`+name.svg+text(cx+66,stampY,new Date(q.timestamp).toISOString().slice(0,16).replace('T',' ')+' UTC',22,ink.white,'text-anchor="middle"')+text(x+53,areaTop+46,'“',60,ink.gold,'text-anchor="middle" font-family="Cinzel" opacity=".7"')+`<g transform="translate(0 ${Math.max(16,(areaHeight-quote.height)/2)})">${quote.svg}</g>`};
}
export function renderChairism(snapshot:ChairismSnapshot,options:ChairismRenderOptions={}){
 validateSnapshot(snapshot);let body=chairismHeading('Chairisms'),y=174;
 const image=(top:number,h:number)=>chairismPlate(top,h,610,560)+`<image href="${esc(snapshot.imageDataUri!)}" x="634" y="${top+24}" width="512" height="${h-48}" preserveAspectRatio="xMidYMid meet"/>`;
 if(snapshot.reply&&snapshot.imageDataUri){const main=quoteBlock(snapshot.quote,y);body+=main.body;y+=main.height+16;const reply=quoteBlock(snapshot.reply,y,'IN REPLY TO',560,30,380);body+=reply.body+image(y,reply.height);y+=reply.height+16;}
 else if(snapshot.reply){const left=quoteBlock(snapshot.quote,y,'THE MOMENT',560),right=quoteBlock(snapshot.reply,y,'IN REPLY TO',560,610),h=Math.max(left.height,right.height);body+=quoteBlock(snapshot.quote,y,'THE MOMENT',560,30,h).body+quoteBlock(snapshot.reply,y,'IN REPLY TO',560,610,h).body;y+=h+16;}
 else if(snapshot.imageDataUri){const main=quoteBlock(snapshot.quote,y,'THE MOMENT',560,30,380);body+=main.body+image(y,main.height);y+=main.height+16;}
 else{const main=quoteBlock(snapshot.quote,y,'THE MOMENT',1140,30,320,snapshot.layout??'short');body+=main.body;y+=main.height+16;}
 const labels=[options.number===undefined?'':`Chairism #${options.number}`,options.showSourceChannel&&snapshot.sourceChannelLabel?'#'+snapshot.sourceChannelLabel:''].filter(Boolean);body+=text(600,y+24,labels.join(' · ')||'A SERVER MOMENT · KEPT IN THE CHAIRS LOUNGE',23,ink.warm,'text-anchor="middle" font-weight="600"');return chairismFrame(y+52,body);
}
