import type {RaceView} from './prisma-repository.js';
import {imageAsset,ink,shell,text,lines,type EventMotion} from './visual.js';
const mid='text-anchor="middle"';
const short=(s:string,n=22)=>s.length>n?s.slice(0,n-1)+'…':s;
const title=(x:number,y:number,s:string,size=28,color:string=ink.white)=>text(x,y,s,size,color,`${mid} font-family="Space Grotesk" font-weight="700"`);
const panel=(x:number,y:number,w:number,h:number,accent:string=ink.teal)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="12" fill="#041923" fill-opacity=".7" stroke="${accent}" stroke-opacity=".7"/><path d="M${x+12} ${y+2}H${x+w-12}" stroke="#F7E5AC" stroke-opacity=".25"/>`;
const skin=(n=1)=>Math.max(1,Math.min(6,Math.trunc(n)));
const car=(n=1)=>imageAsset('../v5/cars-'+skin(n)+'-runtime.png'),robot=(n=1)=>imageAsset('../v5/robots-'+skin(n)+'-runtime.png');
function frame(body:string,scene='lounge-stage-runtime.png'){return shell(640,'<image href="'+imageAsset('../v5/'+scene)+'" width="960" height="640"/>'+ '<rect x="13" y="13" width="934" height="614" rx="20" fill="none" stroke="url(#gold)" stroke-width="3"/><rect x="21" y="21" width="918" height="598" rx="14" fill="none" stroke="#10B981" stroke-opacity=".4"/>'+body,0,960);}
function heading(name:string,state:string){return title(480,45,'ANGRIER JORDAN · PRIVATE LOUNGE EVENTS',16,ink.teal)+title(480,91,name,43)+title(480,125,state,20,ink.warm);}
function pool(view:RaceView,label:string){return panel(32,553,896,60,ink.gold)+title(480,581,(view.result?.pool??view.pool)+' Ottomans · '+label,25)+text(480,603,view.result?.refunded?'FULL REFUND · NO RAKE':'SIT. PLAY. BELONG.',14,ink.warm,mid);}
/** Live positions consume the persisted authoritative race timeline. */
export function renderWideRace(view:RaceView,motion:EventMotion={}){
 const live=view.state==='LOCKED',closed=view.state==='CLOSED',cancelled=view.state==='CANCELLED',phase=motion.phase??0;
 if(closed)return grandFinale(view,'race');
 if(live&&view.motion){let body=heading('Chair Race','LIVE STANDINGS · BETTING LOCKED');const h=390/Math.max(1,view.racers.length);for(const [i,r]of view.racers.entries()){const row=view.motion.rows.find(x=>x.userId===r.userId),progress=Math.max(0,Math.min(100,row?.progress??0)),y=146+i*h;body+=panel(32,y,896,h-5,i%2?ink.gold:ink.teal)+title(155,y+h*.45,short(r.name,15),24)+title(155,y+h*.75,'#'+(row?.place??i+1),20,ink.gold)+'<path d="M290 '+(y+h-15)+'H890" stroke="#B99859" stroke-width="2" stroke-dasharray="16 8"/><image href="'+car(r.chair)+'" x="'+(280+progress*4.7)+'" y="'+(y+2)+'" width="135" height="'+(h-10)+'"/>'; }return frame(body+pool(view,'race pool'));}
 let body=heading(closed?'Chair Race · Winner’s Circle':'Chair Race',live?'ENGINES ON · BETTING LOCKED':closed?'THE OFFICIAL RESULT':cancelled?'RACE CANCELLED':'TAKE YOUR SEAT · BACK YOUR FAVOURITE');
 if(closed){const winner=view.racers.find(r=>r.userId===view.winnerId),ranked=[...view.racers].sort((a,b)=>(view.motion?.rows.find(r=>r.userId===a.userId)?.place??1)-(view.motion?.rows.find(r=>r.userId===b.userId)?.place??1));
  body+=panel(32,146,478,390,ink.gold)+'<ellipse cx="271" cy="405" rx="210" ry="75" fill="url(#lamp)"/><image href="'+car(winner?.chair)+'" x="115" y="160" width="312" height="285"/>'+title(271,477,short(winner?.name??'Winner'),34,ink.gold)+title(271,511,'FIRST ACROSS THE LINE',18)+panel(526,146,402,390);
  const gap=Math.min(72,310/Math.max(1,ranked.length)),top=341-(ranked.length-1)*gap/2;
  body+=ranked.map((r,i)=>title(727,top+i*gap,String(i+1).padStart(2,'0')+' · '+short(r.name,18),28,i?ink.white:ink.gold)).join('');
 }else{
  const n=Math.max(1,view.racers.length),cols=n<=2?n:3,rows=Math.ceil(n/cols),w=896/cols,h=390/rows;
  for(const[rIndex,r]of view.racers.entries()){const x=32+(rIndex%cols)*w,y=146+Math.floor(rIndex/cols)*h,cx=x+w/2,bob=live?Math.sin(phase*2*Math.PI+rIndex)*2:0;
   body+=panel(x+3,y,w-6,h-8,rIndex%2?ink.gold:ink.teal)+title(cx,y+32,short(r.name,20),27)+'<ellipse cx="'+cx+'" cy="'+(y+h-40)+'" rx="'+(w*.4)+'" ry="28" fill="url(#aura)"/>';
   if(live)for(let j=0;j<5;j++)body+='<path d="M'+(x+20+(j*53+phase*60)%(w-50))+' '+(y+h-34)+'h18" stroke="#52E4C5" stroke-width="2" opacity=".45"/>';
   body+='<image href="'+car(r.chair)+'" x="'+(x+20)+'" y="'+(y+37+bob)+'" width="'+(w-40)+'" height="'+(h-78)+'"/>'+text(cx,y+h-20,live?'RACER '+(rIndex+1):cancelled?'UNTIL NEXT TIME':'RACER '+(rIndex+1)+' · EQUAL ODDS',18,ink.warm,mid);
  }
 }
 return frame(body+pool(view,short(motion.callout??'total pool',48)));
}
/** Combat animation adds energy only: actual HP and moves come from the persisted timeline. */
export function renderWideFight(view:RaceView,motion:EventMotion={}){
 const closed=view.state==='CLOSED',cancelled=view.state==='CANCELLED',live=view.state==='LOCKED',phase=motion.phase??0,hp=view.combat?.hp??[100,100];
 if(closed)return grandFinale(view,'fight');
 let body=heading(closed?'Robo Chair Fight · Final Bell':'Robo Chair Fight',cancelled?'ALL WAGERS REFUNDED':closed?'THE OFFICIAL RESULT':live?'COMBAT LIVE · THE ARENA IS YOURS':'TWO CHAIRS · ONE WINNER');
 body+=panel(32,146,896,390,ink.gold)+'<ellipse cx="480" cy="443" rx="410" ry="52" fill="#061B22" stroke="#C8A057" stroke-width="3"/><ellipse cx="480" cy="473" rx="390" ry="43" fill="none" stroke="#10B981"/>';
 for(const[fIndex,f]of view.racers.entries()){const cx=260+fIndex*440,bob=live?Math.sin(phase*2*Math.PI+fIndex)*3:0,win=closed&&f.userId===view.winnerId;
  body+=title(cx,181,short(f.name,21),30,win?ink.gold:ink.white)+'<ellipse cx="'+cx+'" cy="396" rx="165" ry="110" fill="url(#'+(fIndex?'lamp':'aura')+')"/>';
  body+='<g transform="translate('+cx+' '+(190+bob)+') scale('+(fIndex?-1:1)+' 1)"><image href="'+robot(f.chair)+'" x="-148" y="0" width="296" height="242"/></g>'+title(cx,470,hp[fIndex]+' HP',27,fIndex?ink.gold:ink.teal)+'<rect x="'+(cx-135)+'" y="479" width="270" height="9" rx="4" fill="#071820"/><rect x="'+(cx-135)+'" y="479" width="'+(270*Math.max(0,hp[fIndex]??0)/100)+'" height="9" rx="4" fill="'+(fIndex?'#F4C542':'#10B981')+'"/>';
 }
 body+=title(480,316,closed?'KO':'VS',39,ink.gold);
 if(live)for(let i=0;i<12;i++){const a=i*Math.PI/6+phase*.4;body+='<circle cx="'+(480+Math.cos(a)*(22+phase*50))+'" cy="'+(356+Math.sin(a)*(22+phase*50))+'" r="2" fill="'+(i%2?'#10B981':'#F4C542')+'" opacity="'+(1-phase*.6)+'"/>';}
 if(live){for(const [i,line]of lines(view.combat?.log.at(-1)??'The fighters enter the arena.',68).slice(0,2).entries())body+=title(480,510+i*22,line,20);}
 return frame(body+pool(view,short(motion.callout??'total pool',48)));
}

/** Terminal scene persists on the original message; only settled outcomes reach this composition. */
function grandFinale(view:RaceView,kind:'race'|'fight'){
 const winner=view.racers.find(r=>r.userId===view.winnerId),loser=view.racers.find(r=>r.userId!==view.winnerId),name=short(winner?.name??'Winner',28),size=name.length>20?40:54;
 let body=(kind==='race'?'<image data-winner-chair="'+skin(winner?.chair)+'" href="'+car(winner?.chair)+'" x="170" y="135" width="620" height="432"/>':'<image data-winner-chair="'+skin(winner?.chair)+'" href="'+robot(winner?.chair)+'" x="80" y="145" width="500" height="422"/><g opacity=".58" transform="translate(760 445) rotate(65)"><image href="'+robot(loser?.chair)+'" x="-125" y="-125" width="250" height="250"/></g>');
 body+='<rect x="160" y="19" width="640" height="130" rx="12" fill="#06131D" fill-opacity=".72"/>'+title(480,49,kind==='race'?'CHAMPION OF THE CHAIRS':'ARENA CHAMPION',25,ink.gold)+title(480,105,name,size)+text(480,136,'ANGRIER JORDAN · THE GRAND FINALE',15,ink.teal,mid);
 if(kind==='fight')body+=panel(614,535,301,34,ink.gold)+text(765,559,'DEFEATED · '+short(loser?.name??'Opponent',16),18,ink.white,mid);
 body+=panel(30,575,900,45,ink.gold)+title(480,594,short((view.result?.pool??view.pool)+' Ottomans · '+(view.result?.refunded?'FULL REFUND':'Rake '+(view.result?.rake??'0')),70),20,ink.gold)+text(480,613,kind==='race'?'VICTORY LANE · SIT. PLAY. BELONG.':'THE FINAL BELL BELONGS TO YOU',15,ink.white,mid);
 return frame(body,kind+'-stage-runtime.png');
}

export function renderEventNotice(name:string,copy:string){return frame(heading(name,'ANGRIER JORDAN')+panel(32,150,896,460)+lines(copy,76).slice(0,16).map((line,i)=>title(480,183+i*26,line,21)).join(''));}
