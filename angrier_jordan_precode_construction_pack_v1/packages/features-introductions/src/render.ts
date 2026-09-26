import {portrait} from '../../features-events/src/gate-b-visual.js';
import {shell,text} from '../../features-events/src/visual.js';
import {wrapText} from '../../renderer/src/text-layout.js';
const brass='#BCA276',warm='#F7EFE8',muted='#D2BFC3';
function frame(height:number,body:string){return shell(height,`<rect width="1200" height="${height}" fill="#29121F" fill-opacity=".62"/><rect x="16" y="16" width="1168" height="${height-32}" rx="16" fill="#17131F" fill-opacity=".45" stroke="${brass}"/><rect x="25" y="25" width="1150" height="${height-50}" rx="12" fill="none" stroke="${brass}" stroke-opacity=".3"/><path d="M40 84V40H94M1106 40H1160V84M40 ${height-84}V${height-40}H94M1106 ${height-40}H1160V${height-84}" fill="none" stroke="${brass}" stroke-width="2"/><g font-family="Poppins">${body}</g>`,0,1200).replaceAll('#00D7CF',brass).replaceAll('#0EA5A6',brass).replaceAll('#FFE29A',warm).replaceAll('#00C8C6',brass).replaceAll('#08282D','#3F202D').replaceAll('Space Grotesk','Poppins').replace(/<linearGradient id="glass"[\s\S]*?<\/linearGradient>/,'<linearGradient id="glass" x2="0" y2="1"><stop stop-color="#582D40"/><stop offset="1" stop-color="#211723"/></linearGradient>');}
function copy(value:string,x:number,y:number,width:number,size=30,color=warm,weight=400){const lines=wrapText(value,width,size);return {svg:lines.map((line,n)=>text(x,y+n*42,line,size,color,`font-weight="${weight}"`)).join(''),height:lines.length*42};}
function plate(x:number,y:number,w:number,h:number){return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="10" fill="#301C29" fill-opacity=".94" stroke="${brass}" stroke-opacity=".4"/><path d="M${x+16} ${y+2}H${x+w-16}" stroke="${brass}" stroke-opacity=".5"/>`;}
export function renderIntroduction(value:string,name:string,avatarData:string|undefined,showAvatar:boolean,page:number,total:number){
 let svg=text(60,78,'CHAIRS · PULL UP A CHAIR',20,brass,'letter-spacing="2" font-weight="600"'),y=108;
 if(showAvatar)svg+=portrait('intro',name,avatarData,124,y,128);
 const identity=copy(name,showAvatar?220:60,y+50,showAvatar?914:1080,40,warm,600);svg+=`<g font-family="Cinzel">${identity.svg}</g>`;y+=Math.max(showAvatar?158:90,identity.height+55);
 if(total>1){svg+=text(60,y,`Introduction · ${page+1} of ${total}`,22,muted);y+=36;}
 const blocks=value.split('\n\n').filter(s=>s.trim()),fields=blocks.filter(b=>b.includes('\n')),notes=blocks.filter(b=>!b.includes('\n'));
 // Paired rows grow to fit both answers. Nothing is truncated or replaced with placeholders.
 for(let n=0;n<fields.length;n+=2){const row=fields.slice(n,n+2).map((block,col)=>{const [label,...answer]=block.split('\n'),x=60+col*550;const title=copy(label!,x+24,y+34,478,23,brass,600),body=copy(answer.join('\n'),x+24,y+34+title.height,478);return{x,title,body,height:title.height+body.height+46};}),height=Math.max(...row.map(r=>r.height));for(const r of row)svg+=plate(r.x,y,530,height)+r.title.svg+r.body.svg;y+=height+18;}
 if(notes.length){const body=copy(notes.join(' · '),60,y+29,1080,23,muted);svg+=body.svg;y+=body.height+20;}
 return frame(y+36,svg);
}
export function renderIntroductionHub(message:string,fields:string[]=[]){
 let svg=text(60,80,'ANGRIER JORDAN · CHAIRS',20,brass,'letter-spacing="2"')+text(60,140,'Pull Up a Chair',46,warm,'font-family="Cinzel" font-weight="700"');
 const intro=copy(message,60,192,1080,28,muted);svg+=intro.svg;let y=218+intro.height;
 if(fields.length){svg+=text(60,y,'SHARE WHAT YOU FEEL COMFORTABLE SHARING',20,brass,'letter-spacing="1"');y+=26;for(let n=0;n<fields.length;n+=2){const row=fields.slice(n,n+2).map((field,col)=>{const x=60+col*550,body=copy(field,x+24,y+38,482,27,warm,600);return{x,body};}),height=Math.max(...row.map(r=>r.body.height))+26;for(const r of row)svg+=plate(r.x,y,530,height)+r.body.svg;y+=height+14;}y+=12;}
 svg+=`<path d="M60 ${y}H1140" stroke="${brass}" stroke-opacity=".5"/>`+text(60,y+44,'Save privately → Preview → Publish when ready',25,muted);
 return frame(y+108,svg);
}
