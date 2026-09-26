import {readFileSync} from 'node:fs';
import {wrapText} from '../../renderer/src/text-layout.js';

const E=(s:string)=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const GOLD='#F4CF80',WHITE='#EEF4F3',MUTED='#BED4D4',TEAL='#31C9C0';
let lounge:string|undefined;
let seatArt:string|undefined;
const seat=(x:number,y:number,size:number)=>`<image href="${seatArt??=('data:image/png;base64,'+readFileSync(new URL('../../../production/event_art/v3/race_chair_1.png',import.meta.url)).toString('base64'))}" x="${x-size/2}" y="${y}" width="${size}" height="${size}" preserveAspectRatio="xMidYMid meet"/>`;
const art=()=>lounge??='data:image/png;base64,'+readFileSync(new URL('../../../production/event_art/v5/lounge-stage-runtime.png',import.meta.url)).toString('base64');
const text=(x:number,y:number,value:string,size=25,color=WHITE,heading=false)=>`<text x="${x}" y="${y}" text-anchor="middle" font-family="${heading?'Cinzel':'Poppins'}" font-size="${size}" font-weight="${heading?700:600}" fill="${color}">${E(value)}</text>`;
function block(value:string,x:number,y:number,width:number,size=25,color=WHITE,heading=false){const lines=wrapText(value,width,size),step=Math.ceil(size*1.5);return {svg:lines.map((s,n)=>text(x,y+n*step,s,size,color,heading)).join(''),height:Math.max(1,lines.length)*step};}
function chair(x:number,y:number,s=1){return `<g transform="translate(${x} ${y}) scale(${s})"><path d="M-22 7V-28Q-22-44 0-44Q22-44 22-28V7M-27-3Q-43-22-42 5V28H42V5Q43-22 27-3M-34 28V42M34 28V42" fill="#12474A" stroke="url(#gold)" stroke-width="5"/><path d="M-28 8H28V23H-28ZM-12-27 0-14 12-27M0-14V-2" fill="#10343B" stroke="#D6B570" stroke-width="2"/></g>`;}
function panel(x:number,y:number,w:number,h:number,accent=TEAL){return `<rect x="${x}" y="${y+6}" width="${w}" height="${h}" rx="18" fill="#000" opacity=".5"/><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="18" fill="url(#glass)" stroke="${accent}" stroke-width="2"/><path d="M${x+16} ${y+45}V${y+16}H${x+54}M${x+w-54} ${y+h-16}H${x+w-16}V${y+h-45}" stroke="url(#gold)" stroke-width="2" fill="none"/>`;}
function portrait(name:string,data:string|undefined,x:number,y:number,size:number,id:string){
 const safe=data&&/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(data)&&data.length<=1_400_000;
 const initials=[...new Intl.Segmenter('en',{granularity:'grapheme'}).segment(name||'AJ')].slice(0,2).map(x=>x.segment).join('').toUpperCase();
 return `<defs><clipPath id="p${id}"><rect x="${x-size/2+5}" y="${y+5}" width="${size-10}" height="${size-10}" rx="18"/></clipPath></defs><rect x="${x-size/2}" y="${y}" width="${size}" height="${size}" rx="22" fill="#0B2832" stroke="url(#gold)" stroke-width="4"/>`+(safe?`<image href="${E(data!)}" x="${x-size/2+5}" y="${y+5}" width="${size-10}" height="${size-10}" preserveAspectRatio="xMidYMid slice" clip-path="url(#p${id})"/>`:chair(x,y+size*.45,size/155)+text(x,y+size*.85,initials,Math.min(28,size*.23),GOLD));
}
function header(title:string,subtitle:string){const t=block(title,600,106,1010,40,GOLD,true),sub=block(subtitle,600,106+t.height+3,1030,23,MUTED);return {svg:chair(86,60,.52)+text(600,45,'ANGRIER JORDAN · THE CHAIRS',20,TEAL)+t.svg+sub.svg,height:123+t.height+sub.height};}
function frame(body:string,height:number,footer='SIT. PLAY. BELONG.') {const h=height+88;return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="${h}" viewBox="0 0 1200 ${h}"><defs><linearGradient id="glass" x2="0" y2="1"><stop stop-color="#173E46" stop-opacity=".96"/><stop offset="1" stop-color="#08131F" stop-opacity=".97"/></linearGradient><linearGradient id="gold"><stop stop-color="#866128"/><stop offset=".45" stop-color="#FFE3A0"/><stop offset="1" stop-color="#A27D39"/></linearGradient></defs><image href="${art()}" width="1200" height="${h}" preserveAspectRatio="xMidYMid slice"/><rect width="1200" height="${h}" fill="#06141E" opacity=".62"/>${body}<path d="M70 ${height+20}H1130" stroke="url(#gold)" stroke-width="2"/>${text(600,height+57,footer,21,GOLD)}<rect x="5" y="5" width="1190" height="${h-10}" rx="24" fill="none" stroke="${TEAL}" stroke-width="3"/><rect x="17" y="17" width="1166" height="${h-34}" rx="18" fill="none" stroke="url(#gold)" stroke-width="3"/></svg>`;}

/** Caller provides privacy-filtered data only. No truncation of authoritative values. */
export function renderPremiumProfile(data:{name:string;avatarData?:string;sections:{label:string;value:string}[]}){
 const head=header('A Seat in the Chairs','MEMBER DOSSIER · IDENTITY / ACTIVITY / LEGACY');let body=head.svg,y=head.height;
 const name=block(data.name,610,y+68,550,37,GOLD),hero=Math.max(225,name.height+125);
 body+=panel(45,y,1110,hero,GOLD)+portrait(data.name,data.avatarData,173,y+25,142,'identity')+seat(1006,y+15,195)+name.svg+text(610,y+68+name.height+12,'YOUR STORY IN THE LOUNGE',22,TEAL);y+=hero+24;
 const accents=[TEAL,'#A88AEE','#E9B657','#43D6A1'];
 for(let i=0;i<data.sections.length;i+=2){const row=data.sections.slice(i,i+2),cells=row.map((s,col)=>{
  const cx=row.length===1?600:322+col*556,w=row.length===1?1050:496,label=block(s.label.toUpperCase(),cx,y+43,w,24,accents[(i+col)%4],true),content=block(s.value,cx,y+56+label.height,w-14,24);
  return{cx,svg:label.svg+content.svg,height:80+label.height+content.height};
 });const h=Math.max(...cells.map(c=>c.height));for(const [col,c]of cells.entries())body+=panel(row.length===1?45:45+col*556,y,row.length===1?1110:530,h,accents[(i+col)%4])+c.svg;y+=h+24;}
 return frame(body,y);
}
const categoryStyle:Record<string,{title:string;unit:string;accent:string}>={wealth:{title:'Ottoman Elite',unit:'OTTOMANS · WALLET + BANK',accent:GOLD},collections:{title:'Collectors Gallery',unit:'COLLECTION COMPLETION %',accent:'#A88AEE'},crafting:{title:'Master Chair Builders',unit:'SUCCESSFUL CRAFTS',accent:'#DDA96C'},wins:{title:'Champions of the Chairs',unit:'GAME WINS',accent:'#43D6A1'},gambling:{title:'Casino Honors',unit:'CASINO WINS',accent:GOLD},crime:{title:'Notoriety Board',unit:'SUCCESSFUL ROBBERIES',accent:'#EF8B81'},messages:{title:'The Loudest Chairs',unit:'QUALIFYING MESSAGES',accent:TEAL},words:{title:'The Wordsmiths',unit:'QUALIFYING WORDS',accent:TEAL},voice:{title:'Voices of the Lounge',unit:'QUALIFYING VOICE SECONDS',accent:TEAL},spotlight:{title:'Weekly Legends',unit:'SPOTLIGHT AWARDS',accent:GOLD}};
export function renderPremiumLeaderboard(data:{category:string;rows:{rank:number;name:string;value:string;avatarData?:string}[];page:number;pages:number}){
 const style=categoryStyle[data.category]??{title:data.category.replaceAll('_',' ').toUpperCase(),unit:data.category==='fmk_agreement'?'AVERAGE AUDIENCE AGREEMENT %':'FMK VOTES',accent:'#A88AEE'},head=header(style.title,style.unit+' · PAGE '+(data.page+1)+' / '+data.pages);let body=head.svg,y=head.height;
 if(!data.rows.length){body+=panel(45,y,1110,230,style.accent)+chair(600,y+78)+text(600,y+164,'No qualifying standings yet.',28,MUTED);y+=254;}
 for(const r of data.rows){const name=block(r.name,548,y+54,490,29),long=r.value.length>12,value=block(r.value,long?690:994,y+59+(long?name.height+12:0),long?830:250,r.rank===1?36:30,GOLD),h=Math.max(r.rank===1?166:140,long?name.height+value.height+112:Math.max(name.height,value.height)+79);
  body+=panel(45,y,1110,h,r.rank<=3?GOLD:style.accent)+text(109,y+70,String(r.rank).padStart(2,'0'),r.rank===1?44:34,r.rank<=3?GOLD:MUTED,true)+portrait(r.name,r.avatarData,235,y+22,94,'rank'+r.rank)+name.svg+value.svg+text(548,y+h-20,r.rank===1?'THE LEADING CHAIR':r.rank<=3?'PODIUM HONORS':'LOUNGE STANDING',18,style.accent);y+=h+18;
 }return frame(body,y);
}
export function renderPremiumRecords(data:{scope:string;records:{title:string;memberName:string;avatarData?:string;amount:string;achievedAt:string;supporting?:string}[];page:number;pages:number}){
 const head=header('Hall of Records',data.scope+' · PAGE '+(data.page+1)+' / '+data.pages);let body=head.svg,y=head.height;
 if(!data.records.length){body+=panel(45,y,1110,255,GOLD)+chair(600,y+82,1.2)+text(600,y+169,'The next historic moment could be yours.',29,GOLD)+text(600,y+213,'No records yet for this period.',23,MUTED);y+=280;}
 for(let i=0;i<data.records.length;i+=2){const row=data.records.slice(i,i+2),cells=row.map((r,col)=>{const cx=row.length===1?600:322+col*556,width=row.length===1?950:460,title=block(r.title,cx,y+40,width,26,GOLD,true),portraitTop=y+title.height+53,name=block(r.memberName,cx,portraitTop+143,width,28),value=block(r.amount,cx,portraitTop+152+name.height,width,34,GOLD),extra=block('SET '+r.achievedAt+(r.supporting?'\n'+r.supporting:''),cx,portraitTop+163+name.height+value.height,width,21,MUTED);return{svg:title.svg+portrait(r.memberName,r.avatarData,cx,portraitTop,100,'record'+(i+col))+name.svg+value.svg+extra.svg,height:title.height+name.height+value.height+extra.height+244};});const h=Math.max(...cells.map(c=>c.height));cells.forEach((c,col)=>body+=panel(row.length===1?45:45+col*556,y,row.length===1?1110:530,h,GOLD)+c.svg);y+=h+22;
 }return frame(body,y,'THE CHAIRS REMEMBER.');
}
export function renderPremiumShowcase(data:{page:number;pages:number;badges:{name:string;selected:boolean}[];items:{name:string;selected:boolean}[];notice?:string}){
 const head=header('Your Showcase',data.notice??'EARNED HONORS · OWNED COLLECTIBLES');let body=head.svg,y=head.height;
 const groups=[{title:'ACHIEVEMENTS',rows:data.badges,empty:'Earn achievements through play. Your eligible honors will appear here.',accent:GOLD},{title:'COLLECTIBLES',rows:data.items,empty:'Discover a collectible or build a chair to begin your display.',accent:'#A88AEE'}];
 const cells=groups.map((g,index)=>{const cx=322+index*556,copy=g.rows.length?g.rows.map(x=>(x.selected?'FEATURED · ':'')+x.name).join('\n'):g.empty,content=block(copy,cx,y+197,465,24);return{svg:seat(cx,y+10,112)+text(cx,y+151,g.title,24,g.accent,true)+content.svg,height:content.height+225};});
 const h=Math.max(...cells.map(x=>x.height),335);cells.forEach((c,i)=>body+=panel(45+i*556,y,530,h,groups[i]!.accent)+c.svg);y+=h+20;
 const note=block('Select up to six earned badges and six owned collectibles. Changes apply immediately. Triple Threat keeps its permanent premium slot.',600,y+33,1050,22,MUTED);body+=panel(45,y,1110,note.height+58,GOLD)+note.svg;y+=note.height+78;
 return frame(body,y,'PRIVATE SHOWCASE · PAGE '+(data.page+1)+' / '+data.pages);
}
