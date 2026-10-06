import {portrait} from '../../features-events/src/gate-b-visual.js';
import {shell,text} from '../../features-events/src/visual.js';
import {wrapText} from '../../renderer/src/text-layout.js';
const brass='#BCA276',warm='#F7EFE8',muted='#D2BFC3';
function frame(height:number,body:string){return shell(height,`<rect width="1200" height="${height}" fill="#29121F" fill-opacity=".62"/><rect x="16" y="16" width="1168" height="${height-32}" rx="16" fill="#17131F" fill-opacity=".45" stroke="${brass}"/><rect x="25" y="25" width="1150" height="${height-50}" rx="12" fill="none" stroke="${brass}" stroke-opacity=".3"/><path d="M40 84V40H94M1106 40H1160V84M40 ${height-84}V${height-40}H94M1106 ${height-40}H1160V${height-84}" fill="none" stroke="${brass}" stroke-width="2"/><g font-family="Inter">${body}</g>`,0,1200).replaceAll('#00D7CF',brass).replaceAll('#0EA5A6',brass).replaceAll('#FFE29A',warm).replaceAll('#00C8C6',brass).replaceAll('#08282D','#3F202D').replace(/<linearGradient id="glass"[\s\S]*?<\/linearGradient>/,'<linearGradient id="glass" x2="0" y2="1"><stop stop-color="#582D40"/><stop offset="1" stop-color="#211723"/></linearGradient>');}
function copy(value:string,x:number,y:number,width:number,size=30,color=warm,weight=400){const lines=wrapText(value,width,size),leading=Math.ceil(size*1.4);return {svg:lines.map((line,n)=>text(x,y+n*leading,line,size,color,`font-family="${weight>=600?'Space Grotesk':'Inter'}" font-weight="${weight}"`)).join(''),height:lines.length*leading};}
function centeredCopy(value:string,cx:number,y:number,width:number,size=30,color=warm,weight=400){const lines=wrapText(value,width,size),leading=Math.ceil(size*1.4);return {svg:lines.map((line,n)=>text(cx,y+n*leading,line,size,color,`text-anchor="middle" font-family="${weight>=600?'Space Grotesk':'Inter'}" font-weight="${weight}"`)).join(''),height:lines.length*leading};}
function plate(x:number,y:number,w:number,h:number){return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="10" fill="#301C29" fill-opacity=".94" stroke="${brass}" stroke-opacity=".4"/><path d="M${x+16} ${y+2}H${x+w-16}" stroke="${brass}" stroke-opacity=".5"/>`;}
export interface IntroductionCardField {label:string;answer:string;}
export interface IntroductionCardOptions {headerText?:string;joinedAt?:string;page?:number;total?:number;}
/** Structured input keeps paragraphs, blank answers and punctuation inside their own field. */
export function renderIntroductionFields(fields:readonly IntroductionCardField[],name:string,avatarData:string|undefined,showAvatar:boolean,footer='Welcome to Chairs. Make yourself comfortable.',options:IntroductionCardOptions={}){
 const header=copy(options.headerText??'CHAIRS · PULL UP A CHAIR',60,78,1080,20,brass,600);
 let svg=header.svg,y=78+header.height+12;
 const avatarSize=176,avatarBottom=y+avatarSize;
 if(showAvatar)svg+=portrait('intro',name,avatarData,154,y,avatarSize);
 const identityX=showAvatar?278:60,identityWidth=showAvatar?862:1080;
 const identity=copy(name,identityX,y+71,identityWidth,52,warm,700);svg+=identity.svg;
 let identityHeight=name?identity.height+35:0;
 if(options.joinedAt){const joined=copy(`Joined ${options.joinedAt}`,identityX,y+71+identityHeight,identityWidth,22,muted);svg+=joined.svg;identityHeight+=joined.height+24;}
 y=Math.max(showAvatar?avatarBottom+24:y+20,y+71+identityHeight+12);
 if((options.total??1)>1){svg+=text(60,y,`Introduction · ${(options.page??0)+1} of ${options.total}`,22,muted);y+=36;}
 // A 2–1–2 composition centers the fifth field without stretching the card
 // into a portrait image that Discord would shrink in the channel feed.
 for(let n=0;n<fields.length;){
  const count=fields.length===5&&n===2?1:Math.min(2,fields.length-n);
  const row=fields.slice(n,n+count).map((field,col)=>{
   const wide=count===1,x=wide?60:60+col*550,w=wide?1080:530,cx=x+w/2;
   const title=centeredCopy(field.label,cx,y+35,w-48,23,brass,600);
   const answer=field.answer.trim(),body=centeredCopy(answer||'Not shared',cx,y+35+title.height+7,w-48,30,answer?warm:muted);
   return{x,w,title,body,height:title.height+body.height+57};
  }),height=Math.max(...row.map(r=>r.height));
  for(const r of row)svg+=plate(r.x,y,r.w,height)+r.title.svg+r.body.svg;
  y+=height+18;
  n+=count;
 }
 if(footer.trim()){const note=centeredCopy(footer,600,y+28,1080,23,muted);svg+=note.svg;y+=note.height+18;}
 return frame(y+36,svg);
}
/** Compatibility for stored transcript callers. New publishing passes structured fields. */
export function renderIntroduction(value:string,name:string,avatarData:string|undefined,showAvatar:boolean,page:number,total:number){
 const blocks=value.split('\n\n').filter(s=>s.trim()),fields=blocks.filter(b=>b.includes('\n')).map(block=>{const [label,...answer]=block.split('\n');return{label:label!,answer:answer.join('\n')};});
 return renderIntroductionFields(fields,name,avatarData,showAvatar,blocks.filter(b=>!b.includes('\n')).join(' · '),{page,total});
}
export function renderIntroductionHub(message:string,fields:string[]=[]){
 let svg=text(60,80,'ANGRIER JORDAN · CHAIRS',20,brass,'letter-spacing="2"')+text(60,140,'Pull Up a Chair',46,warm,'font-family="Space Grotesk" font-weight="700"');
 const intro=copy(message,60,192,1080,28,muted);svg+=intro.svg;let y=218+intro.height;
 if(fields.length){
  const heading=copy('YOUR INTRODUCTION · ONE FORM',86,y+38,1028,20,brass,600);
  let listY=y+38+heading.height+18,items='';
  for(const [index,field] of fields.entries()){
   const number=copy(String(index+1).padStart(2,'0'),86,listY,54,23,brass,700);
   const body=copy(field,150,listY,962,25,warm,500);
   items+=number.svg+body.svg;
   listY+=Math.max(number.height,body.height)+13;
  }
  // The question list deliberately stays on the parent frame surface.  A
  // divider gives it hierarchy without creating a detached second panel.
  svg+=`<path d="M60 ${y+14}H1140" stroke="${brass}" stroke-opacity=".46"/><path d="M60 ${listY+2}H1140" stroke="${brass}" stroke-opacity=".25"/>`+heading.svg+items;
  y=listY+34;
 }
 svg+=`<path d="M60 ${y}H1140" stroke="${brass}" stroke-opacity=".5"/>`+text(60,y+44,'Save privately → Preview → Publish when ready',25,muted);
 return frame(y+108,svg);
}
