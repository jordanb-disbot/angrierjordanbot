import {portrait} from '../../features-events/src/gate-b-visual.js';
import {shell,text} from '../../features-events/src/visual.js';
import {wrapText} from '../../renderer/src/text-layout.js';
const brass='#BCA276',warm='#F7EFE8',muted='#D2BFC3';
function frame(height:number,body:string){return shell(height,`<rect width="1200" height="${height}" fill="#29121F" fill-opacity=".62"/><rect x="16" y="16" width="1168" height="${height-32}" rx="16" fill="#17131F" fill-opacity=".45" stroke="${brass}"/><rect x="25" y="25" width="1150" height="${height-50}" rx="12" fill="none" stroke="${brass}" stroke-opacity=".3"/><path d="M40 84V40H94M1106 40H1160V84M40 ${height-84}V${height-40}H94M1106 ${height-40}H1160V${height-84}" fill="none" stroke="${brass}" stroke-width="2"/><g font-family="Inter">${body}</g>`,0,1200).replaceAll('#00D7CF',brass).replaceAll('#0EA5A6',brass).replaceAll('#FFE29A',warm).replaceAll('#00C8C6',brass).replaceAll('#08282D','#3F202D').replace(/<linearGradient id="glass"[\s\S]*?<\/linearGradient>/,'<linearGradient id="glass" x2="0" y2="1"><stop stop-color="#582D40"/><stop offset="1" stop-color="#211723"/></linearGradient>');}
function copy(value:string,x:number,y:number,width:number,size=30,color=warm,weight=400){const lines=wrapText(value,width,size),leading=Math.ceil(size*1.4);return {svg:lines.map((line,n)=>text(x,y+n*leading,line,size,color,`font-family="${weight>=600?'Space Grotesk':'Inter'}" font-weight="${weight}"`)).join(''),height:lines.length*leading};}
function plate(x:number,y:number,w:number,h:number){return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="10" fill="#301C29" fill-opacity=".94" stroke="${brass}" stroke-opacity=".4"/><path d="M${x+16} ${y+2}H${x+w-16}" stroke="${brass}" stroke-opacity=".5"/>`;}
export interface IntroductionCardField {label:string;answer:string;}
export interface IntroductionCardOptions {headerText?:string;joinedAt?:string;page?:number;total?:number;}
/** Structured input keeps paragraphs, blank answers and punctuation inside their own field. */
export function renderIntroductionFields(fields:readonly IntroductionCardField[],name:string,avatarData:string|undefined,showAvatar:boolean,footer='Welcome to Chairs. Make yourself comfortable.',options:IntroductionCardOptions={}){
 const header=copy(options.headerText??'CHAIRS · PULL UP A CHAIR',60,78,1080,20,brass,600);
 let svg=header.svg,y=78+header.height+14;
 if(showAvatar)svg+=portrait('intro',name,avatarData,124,y,128);
 const identity=copy(name,showAvatar?220:60,y+45,showAvatar?914:1080,40,warm,600);svg+=identity.svg;
 let identityHeight=name?identity.height+30:0;
 if(options.joinedAt){const joined=copy(`Joined ${options.joinedAt}`,showAvatar?220:60,y+45+identityHeight,showAvatar?914:1080,22,muted);svg+=joined.svg;identityHeight+=joined.height+30;}
 y+=Math.max(showAvatar?152:20,identityHeight+40);
 if((options.total??1)>1){svg+=text(60,y,`Introduction · ${(options.page??0)+1} of ${options.total}`,22,muted);y+=36;}
 for(let n=0;n<fields.length;n+=2){
  const row=fields.slice(n,n+2).map((field,col)=>{
   const x=60+col*550,title=copy(field.label,x+24,y+34,482,23,brass,600);
   const body=copy(field.answer.trim()?field.answer:'Not shared',x+24,y+34+title.height+8,482,30,field.answer.trim()?warm:muted);
   return{x,title,body,height:title.height+body.height+58};
  }),height=Math.max(...row.map(r=>r.height));
  for(const r of row)svg+=plate(r.x,y,530,height)+r.title.svg+r.body.svg;
  y+=height+18;
 }
 if(footer.trim()){const note=copy(footer,60,y+28,1080,23,muted);svg+=note.svg;y+=note.height+18;}
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
 if(fields.length){svg+=text(60,y,'SHARE WHAT YOU FEEL COMFORTABLE SHARING',20,brass,'letter-spacing="1"');y+=26;for(let n=0;n<fields.length;n+=2){const row=fields.slice(n,n+2).map((field,col)=>{const x=60+col*550,body=copy(field,x+24,y+38,482,27,warm,600);return{x,body};}),height=Math.max(...row.map(r=>r.body.height))+26;for(const r of row)svg+=plate(r.x,y,530,height)+r.body.svg;y+=height+14;}y+=12;}
 svg+=`<path d="M60 ${y}H1140" stroke="${brass}" stroke-opacity=".5"/>`+text(60,y+44,'Save privately → Preview → Publish when ready',25,muted);
 return frame(y+108,svg);
}
