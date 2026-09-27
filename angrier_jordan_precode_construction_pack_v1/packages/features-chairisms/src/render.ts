import {chairismFrame,chairismPlate,chairismTextBlock} from './presentation.js';
import {esc,ink,text} from '../../features-events/src/visual.js';
import {portrait} from '../../features-events/src/gate-b-visual.js';
import {validateSnapshot} from './domain.js';
import type {ChairismQuote,ChairismSnapshot} from './interfaces.js';
export interface ChairismRenderOptions {number?:number;showSourceChannel?:boolean;}
function quoteBlock(q:ChairismQuote,top:number,label='CHAIRISMS',layout:'short'|'long'='short'){
 const x=30,width=1140,quoteX=830,quoteWidth=580;
 const centered=(value:string,y:number,options:Parameters<typeof chairismTextBlock>[3])=>{const block=chairismTextBlock(value,quoteX,y,options);return {...block,svg:block.svg.replaceAll('text-anchor="start"','text-anchor="middle"')};};
 const authorMeasure=centered(q.displayName,0,{size:30,width:quoteWidth,lineHeight:39});
 const minimum=centered(q.text,0,{size:32,width:quoteWidth,lineHeight:42});
 const height=Math.max(560,minimum.height+authorMeasure.height+196);
 const areaTop=top+106,areaHeight=height-166,leading=layout==='long'?1.3:1.25;
 let size=layout==='long'?58:66;
 let measure=centered(q.text,0,{size,width:quoteWidth,lineHeight:Math.ceil(size*leading)});
 while(measure.height+authorMeasure.height+66>areaHeight&&size>32){size-=2;measure=centered(q.text,0,{size,width:quoteWidth,lineHeight:Math.ceil(size*leading)});}
 const blockHeight=measure.height+authorMeasure.height+66;
 const quoteTop=areaTop+(areaHeight-blockHeight)/2+size;
 const quote=centered(q.text,quoteTop,{size,width:quoteWidth,weight:500,lineHeight:Math.ceil(size*leading)});
 const authorY=quoteTop+quote.height-Math.ceil(size*leading)+52;
 const author=centered(q.displayName,authorY,{size:30,color:ink.warm,width:quoteWidth,weight:500,lineHeight:39});
 const stampY=authorY+author.height-39+34;
 const key=('chairism-'+q.userId+'-'+top).replace(/[^a-zA-Z0-9_-]/g,'_');
 const hasPhoto=q.avatarDataUri&&/^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(q.avatarDataUri)&&q.avatarDataUri.length<=1_400_000;
 const photo=hasPhoto?`<defs><clipPath id="portrait-${key}"><rect x="40" y="${top+10}" width="490" height="${height-20}" rx="16"/></clipPath><linearGradient id="fade-${key}"><stop offset="0" stop-color="white"/><stop offset=".68" stop-color="white"/><stop offset="1" stop-color="black"/></linearGradient><mask id="mask-${key}"><rect x="40" y="${top+10}" width="490" height="${height-20}" fill="url(#fade-${key})"/></mask><linearGradient id="shade-${key}" x2="0" y2="1"><stop stop-color="#051822" stop-opacity="0"/><stop offset=".72" stop-color="#051822" stop-opacity=".05"/><stop offset="1" stop-color="#051822" stop-opacity=".7"/></linearGradient></defs><g clip-path="url(#portrait-${key})" mask="url(#mask-${key})"><image href="${esc(q.avatarDataUri!)}" x="40" y="${top+10}" width="490" height="${height-20}" preserveAspectRatio="xMidYMid slice"/><rect x="40" y="${top+10}" width="490" height="${height-20}" fill="url(#shade-${key})"/></g>`:portrait(key,q.displayName,undefined,272,top+(height-180)/2,180);
 return {height,body:chairismPlate(top,height,x,width)+photo+text(quoteX,top+61,label,20,ink.warm,'text-anchor="middle" letter-spacing="3" font-family="Space Grotesk" font-weight="500"')+`<path d="M${quoteX-41} ${top+79}H${quoteX+41}" stroke="${ink.gold}" stroke-opacity=".6"/>`+quote.svg+author.svg+text(quoteX,stampY,new Date(q.timestamp).toISOString().slice(0,16).replace('T',' ')+' UTC',20,ink.muted,'text-anchor="middle"')};
}
export function renderChairism(snapshot:ChairismSnapshot,options:ChairismRenderOptions={}){
 validateSnapshot(snapshot);let body='',y=26;
 const main=quoteBlock(snapshot.quote,y,'CHAIRISMS',snapshot.layout??'short');body+=main.body;y+=main.height+16;
 if(snapshot.reply){const reply=quoteBlock(snapshot.reply,y,'IN REPLY TO');body+=reply.body;y+=reply.height+16;}
 if(snapshot.imageDataUri){const height=480;body+=chairismPlate(y,height)+`<image href="${esc(snapshot.imageDataUri)}" x="54" y="${y+24}" width="1092" height="${height-48}" preserveAspectRatio="xMidYMid meet"/>`;y+=height+16;}
 const labels=[options.number===undefined?'':`Chairism #${options.number}`,options.showSourceChannel&&snapshot.sourceChannelLabel?'#'+snapshot.sourceChannelLabel:''].filter(Boolean);body+=text(1122,y+18,labels.join(' · ')||'KEPT IN THE CHAIRS LOUNGE',20,ink.warm,'text-anchor="end"');return chairismFrame(y+40,body);
}
