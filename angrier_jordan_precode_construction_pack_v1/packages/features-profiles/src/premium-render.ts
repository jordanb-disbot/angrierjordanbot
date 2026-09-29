import {readFileSync} from 'node:fs';
import {textWidth,wrapText} from '../../renderer/src/text-layout.js';

const E=(s:string)=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const brand=JSON.parse(readFileSync(new URL('../../../production/theme/brand.json',import.meta.url),'utf8')) as {palette:{warm:string;white:string;muted:string;teal:string;emerald:string};typography:{heading:string;body:string}};
const GOLD=brand.palette.warm,WHITE=brand.palette.white,MUTED=brand.palette.muted,TEAL=brand.palette.teal;
let lounge:string|undefined;
let seatArt:string|undefined;
const seat=(x:number,y:number,size:number)=>`<image href="${seatArt??=('data:image/png;base64,'+readFileSync(new URL('../../../production/event_art/v3/race_chair_1.png',import.meta.url)).toString('base64'))}" x="${x-size/2}" y="${y}" width="${size}" height="${size}" preserveAspectRatio="xMidYMid meet"/>`;
const art=()=>lounge??='data:image/png;base64,'+readFileSync(new URL('../../../production/event_art/v5/lounge-stage-runtime.png',import.meta.url)).toString('base64');
const text=(x:number,y:number,value:string,size=25,color=WHITE,heading=false,anchor='middle')=>`<text x="${x}" y="${y}" text-anchor="${anchor}" font-family="${heading?brand.typography.heading:brand.typography.body}" font-size="${size}" font-weight="${heading?600:400}" fill="${color}">${E(value)}</text>`;
function block(value:string,x:number,y:number,width:number,size=25,color=WHITE,heading=false,anchor='middle'){const lines=wrapText(value,width,size),step=Math.ceil(size*1.4);return {svg:lines.map((s,n)=>text(x,y+n*step,s,size,color,heading,anchor)).join(''),height:Math.max(1,lines.length)*step};}
function chair(x:number,y:number,s=1){return `<g transform="translate(${x} ${y}) scale(${s})"><path d="M-22 7V-28Q-22-44 0-44Q22-44 22-28V7M-27-3Q-43-22-42 5V28H42V5Q43-22 27-3M-34 28V42M34 28V42" fill="#12474A" stroke="url(#gold)" stroke-width="5"/><path d="M-28 8H28V23H-28ZM-12-27 0-14 12-27M0-14V-2" fill="#10343B" stroke="#D6B570" stroke-width="2"/></g>`;}
function panel(x:number,y:number,w:number,h:number,accent=TEAL){return `<rect x="${x}" y="${y+6}" width="${w}" height="${h}" rx="18" fill="#000" opacity=".5"/><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="18" fill="url(#glass)" stroke="${accent}" stroke-width="2"/><path d="M${x+16} ${y+45}V${y+16}H${x+54}M${x+w-54} ${y+h-16}H${x+w-16}V${y+h-45}" stroke="url(#gold)" stroke-width="2" fill="none"/>`;}
function portrait(name:string,data:string|undefined,x:number,y:number,size:number,id:string){
 const safe=data&&/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(data)&&data.length<=1_400_000;
 const initials=[...new Intl.Segmenter('en',{granularity:'grapheme'}).segment(name||'AJ')].slice(0,2).map(x=>x.segment).join('').toUpperCase();
 return `<defs><clipPath id="p${id}"><circle cx="${x}" cy="${y+size/2}" r="${size/2-4}"/></clipPath></defs><circle cx="${x}" cy="${y+size/2}" r="${size/2}" fill="#0B2832" stroke="url(#gold)" stroke-width="3"/>`+(safe?`<image href="${E(data!)}" x="${x-size/2+4}" y="${y+4}" width="${size-8}" height="${size-8}" preserveAspectRatio="xMidYMid slice" clip-path="url(#p${id})"/>`:text(x,y+size*.61,initials,size*.3,GOLD,true));
}
function header(title:string,subtitle:string){const t=block(title,80,108,1040,44,WHITE,true,'start'),sub=subtitle?block(subtitle,80,119+t.height,1040,25,MUTED,false,'start'):{svg:'',height:0};return {svg:text(80,49,'ANGRIER JORDAN',21,brand.palette.emerald,false,'start')+t.svg+sub.svg,height:128+t.height+sub.height};}
function frame(body:string,height:number,footer='SIT. PLAY. BELONG.') {const h=height+88;return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="${h}" viewBox="0 0 1200 ${h}"><defs><linearGradient id="glass" x2="0" y2="1"><stop stop-color="#102630" stop-opacity=".96"/><stop offset="1" stop-color="#0B1220" stop-opacity=".97"/></linearGradient><linearGradient id="gold"><stop stop-color="#866128"/><stop offset=".45" stop-color="#FFE3A0"/><stop offset="1" stop-color="#A27D39"/></linearGradient></defs><image href="${art()}" width="1200" height="${h}" preserveAspectRatio="xMidYMid slice"/><rect width="1200" height="${h}" fill="#06141E" opacity=".62"/>${body}<path d="M70 ${height+20}H1130" stroke="url(#gold)" stroke-width="2"/>${text(600,height+57,footer,21,GOLD)}<rect x="5" y="5" width="1190" height="${h-10}" rx="24" fill="none" stroke="${TEAL}" stroke-width="3"/><rect x="17" y="17" width="1166" height="${h-34}" rx="18" fill="none" stroke="url(#gold)" stroke-width="3"/></svg>`;}

/** One-line values remain complete; exceptional long values fit their tile without wrapping. */
function profileLine(value:string,x:number,y:number,width:number,maxSize:number,minSize:number,color:string,heading=false,anchor:'start'|'middle'='start'){
 const estimated=textWidth(value,maxSize),size=Math.max(minSize,Math.min(maxSize,Math.floor(maxSize*width/Math.max(width,estimated))));
 const fitted=textWidth(value,size)>width?` textLength="${width}" lengthAdjust="spacingAndGlyphs"`:'';
 return `<text x="${x}" y="${y}" text-anchor="${anchor}" font-family="${heading?brand.typography.heading:brand.typography.body}" font-size="${size}" font-weight="${heading?700:600}" fill="${color}"${fitted}>${E(value)}</text>`;
}
export interface PremiumProfileInput {name:string;avatarData?:string|undefined;highlights?:{label:string;value:string}[];sections:{label:string;value:string;singlePage?:boolean|undefined}[];compactHero?:boolean;prestigeBadges?:('triple_threat'|'fully_furnished')[];}
function prestigeMedallion(kind:'triple_threat'|'fully_furnished',x:number,y:number){const accent=kind==='triple_threat'?'#A469E2':brand.palette.emerald;return `<g><circle cx="${x}" cy="${y}" r="51" fill="#081A23" stroke="url(#gold)" stroke-width="4"/><circle cx="${x}" cy="${y}" r="43" fill="${accent}" fill-opacity=".26" stroke="${accent}" stroke-width="2"/>${[[-28,-22],[31,-15],[-24,27],[27,28]].map(([dx,dy])=>`<circle cx="${x+dx!}" cy="${y+dy!}" r="2.5" fill="#FFE3A0"/>`).join('')}<path d="M${x-21} ${y+20}V${y-17}Q${x-21} ${y-31} ${x} ${y-31}Q${x+21} ${y-31} ${x+21} ${y-17}V${y+20}M${x-28} ${y+5}Q${x-41} ${y-11} ${x-38} ${y+22}H${x+38}Q${x+41} ${y-11} ${x+28} ${y+5}M${x-25} ${y+20}H${x+25}V${y+35}H${x-25}Z" fill="#D6B570" stroke="#FFE3A0" stroke-width="2"/>${kind==='triple_threat'?`<path d="M${x-13} ${y-5}L${x} ${y-19}L${x+13} ${y-5}L${x} ${y+8}Z" fill="${accent}"/>`:''}</g>`;}
/** Caller provides privacy-filtered data only. Every stat keeps its complete value. */
export function renderPremiumProfile(data:PremiumProfileInput){
 let body=text(45,58,'ANGRIER JORDAN · MEMBER PROFILE',23,brand.palette.emerald,true,'start');
 if(data.compactHero){body+=panel(45,85,1110,112,GOLD)+portrait(data.name,data.avatarData,111,96,92,'identity')+profileLine(data.name,194,153,915,48,32,WHITE,true);}
 else{body+=panel(45,85,1110,326,GOLD)+portrait(data.name,data.avatarData,164,115,196,'identity');
  const badges=(data.prestigeBadges??[]).slice(0,2),nameWidth=badges.length?540:815;
  body+=profileLine(data.name,300,183,nameWidth,62,34,WHITE,true)+text(300,229,'A seat in the Chairs',29,MUTED,false,'start');
  badges.forEach((badge,n)=>body+=prestigeMedallion(badge,1034-n*116,183));
  for(const [n,h]of (data.highlights??[]).slice(0,3).entries()){
   const x=300+n*274,accent=[GOLD,brand.palette.emerald,'#A469E2'][n]!;
   body+=`<rect x="${x}" y="277" width="258" height="111" rx="13" fill="${accent}" fill-opacity=".10" stroke="${accent}" stroke-opacity=".65"/>`;
   body+=profileLine(h.label,x+129,316,224,28,23,accent,true,'middle')+profileLine(h.value,x+129,369,224,48,30,WHITE,true,'middle');
  }
 }
 const section=(s:{label:string;value:string;singlePage?:boolean|undefined},y:number,accent:string,secondary:string)=>{
  const entries=s.value.split('\n').filter(Boolean).filter(row=>!/^Activity this month \/ all time$/i.test(row)).map(row=>{const split=row.indexOf(':');return{label:split>0?row.slice(0,split):'',value:split>0?row.slice(split+1).trim():row};});
  let grid='',row=0,col=0;
  for(const [n,entry]of entries.entries()){
   const full=(n===entries.length-1&&col===0)||(!s.singlePage&&(!entry.label||textWidth(entry.label,30)>475||textWidth(entry.value,47)>475));
   if(full&&col){row++;col=0;}
   const x=full?62:62+col*546,tileY=y+82+row*151,width=full?1076:530,tone=n%2?secondary:accent;
   grid+=`<rect x="${x}" y="${tileY}" width="${width}" height="135" rx="15" fill="${tone}" fill-opacity=".11" stroke="${tone}" stroke-opacity=".62"/>`;
   if(entry.label)grid+=profileLine(entry.label,x+width/2,tileY+46,width-46,31,25,tone,true,'middle');
   grid+=profileLine(entry.value,x+width/2,tileY+(entry.label?105:86),width-46,entry.label?48:44,30,WHITE,false,'middle');
   if(full){row++;col=0;}else if(col){row++;col=0;}else col=1;
  }
  const rows=row+(col?1:0),height=82+Math.max(1,rows)*151+21;
  return{svg:panel(45,y,1110,height,accent)+profileLine(s.label,76,y+57,1050,42,32,accent,true)+grid,height};
 };
 let y=data.compactHero?214:431;
 for(const item of data.sections){const label=item.label.toLowerCase(),theme=label.includes('game')||label.includes('community')?['#A469E2','#38BDF8']:label.includes('economy')||label.includes('family')?[brand.palette.emerald,GOLD]:label.includes('honor')||label.includes('showcase')?[GOLD,TEAL]:[TEAL,GOLD];const s=section(item,y,theme[0]!,theme[1]!);body+=s.svg;y+=s.height+22;}
 return frame(body,y+10);
}
/** Logical pages keep whole tiles together; Discord displays each as a full-width gallery row. */
export function renderPremiumProfilePages(data:PremiumProfileInput):string[]{
 const cleaned=data.sections.map(s=>({...s,lines:s.value.split('\n').filter(Boolean).filter(line=>!/^Activity this month \/ all time$/i.test(line))}));
 let perPage=4,pages=Infinity;
 while(pages>10){pages=1+cleaned.reduce((total,s)=>total+(s.singlePage?1:Math.ceil(Math.max(1,s.lines.length)/perPage)),0);if(pages>10)perPage+=2;}
 const result=[renderPremiumProfile({...data,sections:[]})];
 for(const section of cleaned)for(let start=0;start<Math.max(1,section.lines.length);start+=section.singlePage?Math.max(1,section.lines.length):perPage)result.push(renderPremiumProfile({name:data.name,avatarData:data.avatarData,compactHero:true,sections:[{label:section.label+(start?' · Continued':''),value:section.lines.slice(start,start+(section.singlePage?section.lines.length:perPage)).join('\n')||'No data yet',singlePage:section.singlePage}]}));
 return result;
}
export function renderPremiumAchievements(data:{name:string;avatarData?:string;rows:{name:string;class:string;earnedAt:Date|null;progress?:string}[];page:number;pages:number}){const head=header('Achievement Cabinet',`${data.name.toUpperCase()} · PAGE ${data.page+1} / ${data.pages}`);let body=head.svg,y=head.height;for(let row=0;row<3;row++)for(let col=0;col<3;col++){const entry=data.rows[row*3+col];if(!entry)continue;const x=45+col*372,tileY=y+row*252,accent=entry.earnedAt?entry.class.toLowerCase().includes('prestige')?GOLD:TEAL:'#374151';body+=panel(x,tileY,350,230,accent);body+=`<circle cx="${x+175}" cy="${tileY+76}" r="47" fill="${entry.earnedAt?accent:'#111827'}" fill-opacity=".35" stroke="${accent}" stroke-width="3"/>`;body+=entry.earnedAt?chair(x+175,tileY+57,.68):text(x+175,tileY+91,'LOCK',15,MUTED,true);body+=profileLine(entry.name,x+175,tileY+154,306,25,18,WHITE,true,'middle')+text(x+175,tileY+188,entry.earnedAt?'EARNED':`LOCKED · ${entry.class.toUpperCase()}`,18,entry.earnedAt?GOLD:MUTED,true);if(entry.earnedAt)body+=text(x+175,tileY+214,entry.earnedAt.toISOString().slice(0,10),16,MUTED);else if(entry.progress)body+=text(x+175,tileY+214,entry.progress,16,TEAL,true);}return frame(body,y+3*252+10,'EARNED HONORS · LOCKED POSSIBILITIES');}
const categoryStyle:Record<string,{title:string;unit:string;accent:string}>={wealth:{title:'Ottoman Elite',unit:'OTTOMANS · WALLET + BANK',accent:GOLD},collections:{title:'Collectors Gallery',unit:'COLLECTION COMPLETION %',accent:brand.palette.emerald},crafting:{title:'Master Chair Builders',unit:'SUCCESSFUL CRAFTS',accent:GOLD},wins:{title:'Champions of the Chairs',unit:'GAME WINS',accent:brand.palette.emerald},gambling:{title:'Casino Honors',unit:'CASINO WINS',accent:GOLD},crime:{title:'Notoriety Board',unit:'SUCCESSFUL ROBBERIES',accent:TEAL},messages:{title:'The Loudest Chairs',unit:'QUALIFYING MESSAGES',accent:TEAL},words:{title:'The Wordsmiths',unit:'QUALIFYING WORDS',accent:TEAL},voice:{title:'Voices of the Lounge',unit:'QUALIFYING VOICE SECONDS',accent:TEAL},spotlight:{title:'Weekly Legends',unit:'SPOTLIGHT AWARDS',accent:GOLD}};
export function renderPremiumLeaderboard(data:{category:string;rows:{rank:number;name:string;value:string;avatarData?:string}[];page:number;pages:number}){
 const style=categoryStyle[data.category]??{title:data.category.replaceAll('_',' ').toUpperCase(),unit:data.category==='fmk_agreement'?'AVERAGE AUDIENCE AGREEMENT %':'FMK VOTES',accent:brand.palette.emerald},head=header(style.title,style.unit+' · PAGE '+(data.page+1)+' / '+data.pages);let body=head.svg,y=head.height;
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
 const groups=[{title:'ACHIEVEMENTS',rows:data.badges,empty:'Earn achievements through play. Your eligible honors will appear here.',accent:GOLD},{title:'COLLECTIBLES',rows:data.items,empty:'Discover a collectible or build a chair to begin your display.',accent:brand.palette.emerald}];
 const cells=groups.map((g,index)=>{const cx=322+index*556,copy=g.rows.length?g.rows.map(x=>(x.selected?'FEATURED · ':'')+x.name).join('\n'):g.empty,content=block(copy,cx,y+197,465,24);return{svg:seat(cx,y+10,112)+text(cx,y+151,g.title,24,g.accent,true)+content.svg,height:content.height+225};});
 const h=Math.max(...cells.map(x=>x.height),335);cells.forEach((c,i)=>body+=panel(45+i*556,y,530,h,groups[i]!.accent)+c.svg);y+=h+20;
 const note=block('Select up to six earned badges and six owned collectibles. Changes apply immediately. Triple Threat keeps its permanent premium slot.',600,y+33,1050,22,MUTED);body+=panel(45,y,1110,note.height+58,GOLD)+note.svg;y+=note.height+78;
 return frame(body,y,'PRIVATE SHOWCASE · PAGE '+(data.page+1)+' / '+data.pages);
}
