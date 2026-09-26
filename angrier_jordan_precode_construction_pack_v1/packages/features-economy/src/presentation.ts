import {readFileSync} from 'node:fs';

export interface EconomyPresentationSection {name:string;value:string;state?:string;accent?:number}
export interface EconomyPresentationInput {
 title:string;description?:string;fields?:{name:string;value:string;inline?:boolean}[];
 footer?:string;accent?:number;sections?:EconomyPresentationSection[];
}
const brand=JSON.parse(readFileSync(new URL('../../../production/theme/brand.json',import.meta.url),'utf8')) as {typography:{heading:string;body:string}};
let lounge:string|undefined;
const art=()=>lounge??= 'data:image/png;base64,'+readFileSync(new URL('../../../production/event_art/v5/lounge-stage-runtime.png',import.meta.url)).toString('base64');
const escape=(s:string)=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const plain=(s:string)=>s.replace(/<t:\d+(?::[A-Za-z])?>/g,'See reset time below').replace(/<@!?\d+>/g,'Member').replace(/[*_`#]/g,'').replace(/\s+/g,' ').trim();
const color=(n:number)=>'#'+(n&0xffffff).toString(16).padStart(6,'0');
/** Bounded text summaries only. Exact identifiers, timestamps and values stay in native Discord text. */
export function economyWrap(input:string,limit:number,maxLines:number):string[]{
 const words=plain(input).split(/\s+/),lines:string[]=[];let current='';
 for(const word of words){const pieces=word.length>limit?word.match(new RegExp('.{1,'+limit+'}','gu'))??[]:[word];for(const piece of pieces){if(current&&current.length+piece.length+1>limit){lines.push(current);current='';}current+=(current?' ':'')+piece;}}
 if(current)lines.push(current);if(lines.length>maxLines){lines.length=maxLines;lines[maxLines-1]=lines[maxLines-1]!.slice(0,limit-1).trimEnd()+'…';}return lines;
}
const text=(x:number,y:number,s:string,size:number,fill='#E6EAF0',heading=false)=>`<text x="${x}" y="${y}" text-anchor="middle" font-family="${escape(heading?brand.typography.heading:brand.typography.body)}" font-size="${size}" font-weight="${heading?700:500}" fill="${fill}">${escape(s)}</text>`;
const chair=(x:number,y:number,scale=1)=>`<g transform="translate(${x} ${y}) scale(${scale})"><path d="M-19 5V-18Q-19-29-9-29H9Q19-29 19-18V5M-25 0Q-34-10-35 2V24H35V2Q34-10 25 0M-29 24V34M29 24V34" fill="#123E40" stroke="url(#brass)" stroke-width="4"/><path d="M-24 5H24V19H-24Z" fill="#0B232C" stroke="#D1AC65"/><path d="M-10-19 0-10 10-19M0-10V0" fill="none" stroke="#60B4AA" stroke-opacity=".65"/></g>`;

export function renderEconomyPresentation(input:EconomyPresentationInput):string {
 const accent=color(input.accent??0x0ea5a6),palette=[0x10b981,0xf4c542,0xa469e2,0x38bdf8,0xf59e0b,0x0ea5a6];
 const supplied=input.sections?.length?input.sections:input.fields?.length?input.fields:undefined;
 const sections:EconomyPresentationSection[]=supplied?.slice(0,6)??[{name:'The lounge ledger',value:input.description??'Your next move starts here.'}];
 const columns=Math.min(3,sections.length),rows=Math.ceil(sections.length/columns),gap=18,w=(1000-gap*(columns-1))/columns,h=rows===1?304:143;
 let body=text(550,60,'ANGRIER JORDAN · THE OTTOMAN EXCHANGE',17,'#F4D17B',true);
 const title=economyWrap(input.title,39,2);title.forEach((line,i)=>body+=text(550,107+i*39,line,title.length>1?33:43,'#E6EAF0',true));
 if(title.length===1&&supplied)body+=text(550,143,economyWrap(input.description??'A seat for every ambition.',87,1)[0]??'',18,'#CEDDDA');
 body+='<path d="M170 164H495L510 160H590L605 164H930" fill="none" stroke="url(#brass)" stroke-width="2"/>';
 for(const [i,section] of sections.entries()){
  const x=50+(i%columns)*(w+gap),y=188+Math.floor(i/columns)*(h+18),c=color(section.accent??palette[i%palette.length]!);
  body+=`<g data-economy-section="${i}"><rect x="${x}" y="${y+5}" width="${w}" height="${h}" rx="16" fill="#000" opacity=".45"/><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="16" fill="url(#glass)" stroke="${c}" stroke-opacity=".85"/><path d="M${x+25} ${y+8}H${x+w-25}M${x+10} ${y+30}V${y+12}H${x+29}M${x+w-29} ${y+h-12}H${x+w-10}V${y+h-30}" stroke="#DDBD79" fill="none" stroke-opacity=".65"/>`;
  if(rows===1){body+=`<circle cx="${x+w/2}" cy="${y+56}" r="39" fill="#081A25" stroke="${c}" stroke-opacity=".65"/>`+chair(x+w/2,y+54,.74);}
  const headerY=y+(rows===1?126:34),limit=Math.max(12,Math.floor((w-42)/13));
  economyWrap(section.name,limit,1).forEach(line=>body+=text(x+w/2,headerY,line,24,c,true));
  body+=`<path d="M${x+24} ${headerY+16}H${x+w-24}" stroke="${c}" stroke-opacity=".3"/>`;
  const bodySize=columns===1?29:21,lineHeight=columns===1?33:27;
  const lines=economyWrap(section.value,Math.max(15,Math.floor((w-60)/(bodySize*.56))),rows===1?(section.state?3:columns===1?4:5):section.state?1:2);
  lines.forEach((line,j)=>body+=text(x+w/2,headerY+49+j*lineHeight,line,bodySize));
  if(section.state){body+=`<rect x="${x+28}" y="${y+h-46}" width="${w-56}" height="31" rx="15" fill="${c}" fill-opacity=".14" stroke="${c}" stroke-opacity=".4"/>`+text(x+w/2,y+h-24,economyWrap(section.state,limit+2,1)[0]??'',16,c,true);}
  body+='</g>';
 }
 body+='<rect x="50" y="524" width="1000" height="56" rx="12" fill="#081B25" fill-opacity=".9" stroke="#B9985A" stroke-opacity=".65"/>'+text(550,548,economyWrap(input.footer??'Use the controls below · Exact details in the ledger',101,1)[0]??'',16,'#DBD3BA')+text(550,569,'SIT. PLAY. BELONG.',13,'#72D5C6',true);
 return `<svg xmlns="http://www.w3.org/2000/svg" width="1100" height="620" viewBox="0 0 1100 620"><defs><clipPath id="outer"><rect width="1100" height="620" rx="20"/></clipPath><linearGradient id="glass" x2="0" y2="1"><stop stop-color="#153D43" stop-opacity=".96"/><stop offset=".55" stop-color="#0B202A" stop-opacity=".9"/><stop offset="1" stop-color="#07121D" stop-opacity=".98"/></linearGradient><linearGradient id="shade" x2="0" y2="1"><stop stop-color="#06151D" stop-opacity=".82"/><stop offset=".3" stop-color="#06151D" stop-opacity=".12"/><stop offset="1" stop-color="#06151D" stop-opacity=".7"/></linearGradient><linearGradient id="brass"><stop stop-color="#77521F"/><stop offset=".48" stop-color="#FFE29A"/><stop offset="1" stop-color="#997132"/></linearGradient></defs><g clip-path="url(#outer)"><image href="${art()}" width="1100" height="620" preserveAspectRatio="xMidYMid slice"/><rect width="1100" height="620" fill="url(#shade)"/>${body}</g><rect x="3" y="3" width="1094" height="614" rx="20" fill="none" stroke="${accent}" stroke-width="3"/><rect x="13" y="13" width="1074" height="594" rx="15" fill="none" stroke="url(#brass)" stroke-width="2"/><path d="M25 62V26H67M1033 26H1075V62M25 558V594H67M1033 594H1075V558" fill="none" stroke="#F4C542" stroke-width="3"/></svg>`;
}
