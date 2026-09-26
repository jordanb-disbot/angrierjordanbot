import {readFileSync} from 'node:fs';

export interface EconomyPresentationSection {name:string;value:string;state?:string;accent?:number}
export interface EconomyPresentationCard {name:string;detail:string;badge?:string;motif?:string;accent?:number}
export interface EconomyPresentationInput {
 cards?:EconomyPresentationCard[];mode?:'shop'|'inventory'|'collection'|'craft';summary?:string;
 title:string;description?:string;fields?:{name:string;value:string;inline?:boolean}[];
 footer?:string;accent?:number;sections?:EconomyPresentationSection[];
}

/** Stable category illustrations using only packaged style primitives. */
function itemMotif(motif:string|undefined,x:number,y:number,accent:string):string {
 const key=(motif??'item').toLowerCase();let shape='';
 if(/unknown|hidden|locked/.test(key))shape='<path d="M-24 0V-20a24 24 0 0 1 48 0V0M-33 0H33V46H-33Z" fill="#13363C" stroke="url(#brass)" stroke-width="5"/><circle cy="19" r="6" fill="#F4D17B"/><path d="M0 24V33" stroke="#F4D17B" stroke-width="5"/>';
 else if(/chair|seat|throne|stool|recliner|chaise/.test(key)){
  shape='<ellipse cy="64" rx="69" ry="13" fill="#000" opacity=".4"/>';
  if(/stool/.test(key))shape+='<ellipse cy="-6" rx="40" ry="15" fill="url(#upholstery)" stroke="url(#brass)" stroke-width="4"/><path d="M-29 3-34 60M29 3 34 60M-31 30H31" stroke="#DBB467" stroke-width="5"/>';
  else if(/fold/.test(key))shape+='<path d="M-35-37H35V-2H-35ZM-36 15H36V29H-36Z" fill="url(#upholstery)" stroke="url(#brass)" stroke-width="4"/><path d="M-32-2 31 61M32-2-31 61" stroke="#B9985A" stroke-width="5"/>';
  else shape+=`<g transform="scale(${/chaise/.test(key)?1.35:1} 1)">${chair(0,5,1.6)}</g>`;
  if(/throne/.test(key))shape+='<g transform="translate(0 0) scale(.8)"><path d="M-30-56-38-78-13-66 0-88 13-66 38-78 30-56Z" fill="url(#brass)" stroke="#FFE6A2" stroke-width="2"/></g>';
 }else if(/rod|fish/.test(key))shape='<path d="M-43 58 24-66Q38-75 48-66L48 38Q48 53 36 48" fill="none" stroke="url(#brass)" stroke-width="5"/><path d="M-43 58-28 31" stroke="#2A6061" stroke-width="13"/><circle cx="-19" cy="20" r="13" fill="#0B202A" stroke="#D9B56B" stroke-width="4"/>';
 else if(/tool|repair|workshop|shovel|dig|pick/.test(key))shape='<path d="M-43 50 28-40M-40-43 37 46" stroke="#163F43" stroke-width="17"/><path d="M-43 50 28-40M-40-43 37 46" stroke="url(#brass)" stroke-width="7"/><path d="M-56-43Q-35-77-12-43L-23-26ZM20-61Q62-63 58-24L43-37 28-24 13-39Z" fill="#A6BBC0" stroke="#E6EAF0" stroke-width="3"/>';
 else if(/material|wood|brass|oak|cloth/.test(key))shape='<path d="M-57 24-22 5 51 22 16 44ZM-57 8-22-11 51 6 16 28ZM-57-8-22-27 51-10 16 12Z" fill="#664D2B" stroke="url(#brass)" stroke-width="3"/><path d="M-40-6 20 8M-25-12 36 2M-39 26 10 38" stroke="#CBAB6D" stroke-width="2"/>';
 else if(/recipe|plan/.test(key))shape='<path d="M-45-60H38V59H-45Z" fill="#173A40" stroke="url(#brass)" stroke-width="4"/><path d="M-28-37H22M-28-22H13M-24 0H20V24H-24ZM-26 31H23M-21 38V49M18 38V49" fill="none" stroke="#DCC489" stroke-width="3"/>';
 else shape=`<path d="M-51-18 0-38 51-18 0 4ZM-51-18V40L0 63 51 40V-18M0 4V63" fill="#12343D" stroke="url(#brass)" stroke-width="4"/><path d="M-22-29 29-9V49M22-29-29-9V49" fill="none" stroke="${accent}" stroke-width="10"/><path d="M-7-36Q-43-70-38-38L0-31Q34-72 39-43L9-32" fill="none" stroke="${accent}" stroke-width="5"/>`;
 return `<g data-item-motif="${escape(key)}" transform="translate(${x} ${y})">${shape}</g>`;
}
function renderItemGallery(input:EconomyPresentationInput):string {
 const palette=[0xf4c542,0x38bdf8,0xa469e2,0x10b981,0xf59e0b,0x0ea5a6],cards=input.cards?.slice(0,6)??[];
 const rows=Math.max(1,Math.ceil(cards.length/3)),height=rows===2?1080:710,top=190,footerY=height-100;
 const titles={shop:'THE LOUNGE STOREFRONT',inventory:'YOUR PERSONAL COLLECTION',collection:'THE CHAIR GALLERY',craft:'THE CHAIR WORKSHOP'};
 let body=text(550,63,'ANGRIER JORDAN · '+titles[input.mode!],20,'#F4D17B',true);
 economyWrap(input.title,36,1).forEach(t=>body+=text(550,117,t,46,'#E6EAF0',true));
 economyWrap(input.summary??input.description??'',70,1).forEach(t=>body+=text(550,156,t,24,'#D3E9E5'));
 if(!cards.length){body+='<rect x="50" y="190" width="1000" height="385" rx="18" fill="url(#glass)" stroke="#D4B06C"/>'+itemMotif(input.mode==='craft'?'workshop':input.mode==='collection'?'chair':'box',550,288,'#10B981');economyWrap(input.description??'Your next discovery starts here.',52,3).forEach((t,j)=>body+=text(550,422+j*38,t,30));}
 for(const [i,card]of cards.entries()){
  const rowCount=Math.min(3,cards.length-Math.floor(i/3)*3),startX=(1100-(rowCount*320+(rowCount-1)*20))/2;
  const x=startX+i%3*340,y=top+Math.floor(i/3)*385,c=color(card.accent??palette[i]!);
  body+=`<g data-item-card="${i}"><rect x="${x}" y="${y}" width="320" height="365" rx="16" fill="url(#glass)" stroke="${c}" stroke-width="2"/><path d="M${x+15} ${y+42}V${y+15}H${x+46}M${x+274} ${y+350}H${x+305}V${y+323}" stroke="#E0C27E" fill="none" stroke-width="2"/><ellipse cx="${x+160}" cy="${y+120}" rx="113" ry="95" fill="${c}" opacity=".07"/><path d="M${x+27} ${y+195}H${x+293}" stroke="${c}" opacity=".45"/>`;
  body+=text(x+160,y+33,economyWrap(card.badge??'LOUNGE ESSENTIAL',22,1)[0]??'',20,c,true)+itemMotif(card.motif,x+160,y+115,c);
  economyWrap(card.name,20,2).forEach((t,j)=>body+=text(x+160,y+230+j*30,t,28,'#F1F4F7',true));
  economyWrap(card.detail,23,3).forEach((t,j)=>body+=text(x+160,y+292+j*27,t,24,'#D7E5E3'));
  body+='</g>';
 }
 body+=`<rect x="50" y="${footerY}" width="1000" height="65" rx="12" fill="#081B25" stroke="#B9985A"/>`;
 economyWrap(input.footer??'Use the matching controls below',76,1).forEach(t=>body+=text(550,footerY+29,t,22,'#ECE2CB',true));body+=text(550,footerY+52,'SIT. PLAY. BELONG.',17,'#72D5C6',true);
 return `<svg xmlns="http://www.w3.org/2000/svg" width="1100" height="${height}" viewBox="0 0 1100 ${height}"><defs><linearGradient id="glass" x2="0" y2="1"><stop stop-color="#153D43" stop-opacity=".96"/><stop offset="1" stop-color="#07121D" stop-opacity=".96"/></linearGradient><linearGradient id="brass"><stop stop-color="#77521F"/><stop offset=".48" stop-color="#FFE29A"/><stop offset="1" stop-color="#997132"/></linearGradient><linearGradient id="upholstery" x2="0" y2="1"><stop stop-color="#1B7775"/><stop offset="1" stop-color="#09242C"/></linearGradient></defs><image href="${art()}" width="1100" height="${height}" preserveAspectRatio="xMidYMid slice"/><rect width="1100" height="${height}" fill="#06151D" opacity=".57"/>${body}<rect x="4" y="4" width="1092" height="${height-8}" rx="19" fill="none" stroke="#0EA5A6" stroke-width="3"/><rect x="14" y="14" width="1072" height="${height-28}" rx="14" fill="none" stroke="url(#brass)" stroke-width="2"/></svg>`;
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
const text=(x:number,y:number,s:string,size:number,fill='#E6EAF0',heading=false)=>`<text x="${x}" y="${y}" text-anchor="middle" font-family="${escape(heading?brand.typography.heading:brand.typography.body)}" font-size="${size}" font-weight="${heading?700:600}" fill="${fill}">${escape(s)}</text>`;
const chair=(x:number,y:number,scale=1)=>`<g transform="translate(${x} ${y}) scale(${scale})"><path d="M-19 5V-18Q-19-29-9-29H9Q19-29 19-18V5M-25 0Q-34-10-35 2V24H35V2Q34-10 25 0M-29 24V34M29 24V34" fill="#123E40" stroke="url(#brass)" stroke-width="4"/><path d="M-24 5H24V19H-24Z" fill="#0B232C" stroke="#D1AC65"/><path d="M-10-19 0-10 10-19M0-10V0" fill="none" stroke="#60B4AA" stroke-opacity=".65"/></g>`;

export function renderEconomyPresentation(input:EconomyPresentationInput):string {
 if(input.mode)return renderItemGallery(input);
 const accent=color(input.accent??0x0ea5a6),palette=[0x10b981,0xf4c542,0xa469e2,0x38bdf8,0xf59e0b,0x0ea5a6];
 const supplied=input.sections?.length?input.sections:input.fields?.length?input.fields:undefined;
 const sections:EconomyPresentationSection[]=supplied?.slice(0,6)??[{name:'The lounge ledger',value:input.description??'Your next move starts here.'}];
 const columns=Math.min(3,sections.length),rows=Math.ceil(sections.length/columns),gap=18,w=(1000-gap*(columns-1))/columns,h=rows===1?304:143;
 let body=text(550,60,'ANGRIER JORDAN · THE OTTOMAN EXCHANGE',17,'#F4D17B',true);
 const title=economyWrap(input.title,39,2);title.forEach((line,i)=>body+=text(550,107+i*39,line,title.length>1?33:43,'#E6EAF0',true));
 if(title.length===1&&supplied)body+=text(550,143,economyWrap(input.description??'A seat for every ambition.',70,1)[0]??'',22,'#CEDDDA');
 body+='<path d="M170 164H495L510 160H590L605 164H930" fill="none" stroke="url(#brass)" stroke-width="2"/>';
 for(const [i,section] of sections.entries()){
  const x=50+(i%columns)*(w+gap),y=188+Math.floor(i/columns)*(h+18),c=color(section.accent??palette[i%palette.length]!);
  body+=`<g data-economy-section="${i}"><rect x="${x}" y="${y+5}" width="${w}" height="${h}" rx="16" fill="#000" opacity=".45"/><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="16" fill="url(#glass)" stroke="${c}" stroke-opacity=".85"/><path d="M${x+25} ${y+8}H${x+w-25}M${x+10} ${y+30}V${y+12}H${x+29}M${x+w-29} ${y+h-12}H${x+w-10}V${y+h-30}" stroke="#DDBD79" fill="none" stroke-opacity=".65"/>`;
  if(rows===1){body+=`<circle cx="${x+w/2}" cy="${y+56}" r="39" fill="#081A25" stroke="${c}" stroke-opacity=".65"/>`+chair(x+w/2,y+54,.74);}
  const headerY=y+(rows===1?126:34),limit=Math.max(12,Math.floor((w-42)/16));
  economyWrap(section.name,limit,1).forEach(line=>body+=text(x+w/2,headerY,line,27,c,true));
  body+=`<path d="M${x+24} ${headerY+16}H${x+w-24}" stroke="${c}" stroke-opacity=".3"/>`;
  const bodySize=columns===1?31:24,lineHeight=columns===1?36:29;
  const lines=economyWrap(section.value,Math.max(15,Math.floor((w-60)/(bodySize*.56))),rows===1?(section.state?3:columns===1?4:5):section.state?1:2);
  lines.forEach((line,j)=>body+=text(x+w/2,headerY+49+j*lineHeight,line,bodySize));
  if(section.state){body+=`<rect x="${x+28}" y="${y+h-46}" width="${w-56}" height="31" rx="15" fill="${c}" fill-opacity=".14" stroke="${c}" stroke-opacity=".4"/>`+text(x+w/2,y+h-24,economyWrap(section.state,limit+2,1)[0]??'',19,c,true);}
  body+='</g>';
 }
 body+='<rect x="50" y="524" width="1000" height="56" rx="12" fill="#081B25" fill-opacity=".9" stroke="#B9985A" stroke-opacity=".65"/>'+text(550,548,economyWrap(input.footer??'Use the controls below · Exact details in the ledger',101,1)[0]??'',16,'#DBD3BA')+text(550,569,'SIT. PLAY. BELONG.',13,'#72D5C6',true);
 return `<svg xmlns="http://www.w3.org/2000/svg" width="1100" height="620" viewBox="0 0 1100 620"><defs><clipPath id="outer"><rect width="1100" height="620" rx="20"/></clipPath><linearGradient id="glass" x2="0" y2="1"><stop stop-color="#153D43" stop-opacity=".96"/><stop offset=".55" stop-color="#0B202A" stop-opacity=".9"/><stop offset="1" stop-color="#07121D" stop-opacity=".98"/></linearGradient><linearGradient id="shade" x2="0" y2="1"><stop stop-color="#06151D" stop-opacity=".82"/><stop offset=".3" stop-color="#06151D" stop-opacity=".12"/><stop offset="1" stop-color="#06151D" stop-opacity=".7"/></linearGradient><linearGradient id="brass"><stop stop-color="#77521F"/><stop offset=".48" stop-color="#FFE29A"/><stop offset="1" stop-color="#997132"/></linearGradient></defs><g clip-path="url(#outer)"><image href="${art()}" width="1100" height="620" preserveAspectRatio="xMidYMid slice"/><rect width="1100" height="620" fill="url(#shade)"/>${body}</g><rect x="3" y="3" width="1094" height="614" rx="20" fill="none" stroke="${accent}" stroke-width="3"/><rect x="13" y="13" width="1074" height="594" rx="15" fill="none" stroke="url(#brass)" stroke-width="2"/><path d="M25 62V26H67M1033 26H1075V62M25 558V594H67M1033 594H1075V558" fill="none" stroke="#F4C542" stroke-width="3"/></svg>`;
}
