import type {RaceView} from './prisma-repository.js';
import {imageAsset,raceWheelchair,ink,shell,text,lines,type EventMotion} from './visual.js';
const mid='text-anchor="middle"';
const short=(s:string,n=22)=>s.length>n?s.slice(0,n-1)+'…':s;
const title=(x:number,y:number,s:string,size=28,color:string=ink.white)=>text(x,y,s,size,color,`${mid} font-family="Space Grotesk" font-weight="700"`);
const panel=(x:number,y:number,w:number,h:number,accent:string=ink.teal)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="12" fill="#041923" fill-opacity=".7" stroke="${accent}" stroke-opacity=".7"/><path d="M${x+12} ${y+2}H${x+w-12}" stroke="#F7E5AC" stroke-opacity=".25"/>`;
const skin=(n=1)=>Math.max(1,Math.min(6,Math.trunc(n)));
const robot=(n=1)=>imageAsset('../v5/robots-'+skin(n)+'-runtime.png');
function frame(body:string,scene='lounge-stage-runtime.png',expanded=false){return shell(640,'<image href="'+imageAsset('../v5/'+scene)+'" width="1200" height="640" preserveAspectRatio="xMidYMid slice"/>'+ '<rect x="13" y="13" width="1174" height="614" rx="20" fill="none" stroke="url(#gold)" stroke-width="3"/><rect x="21" y="21" width="1158" height="598" rx="14" fill="none" stroke="#10B981" stroke-opacity=".4"/>'+'<!--event-scene-end-->'+(expanded?body:'<g transform="translate(120 0)">'+body+'</g>'),0,1200);}
function heading(name:string,state:string){return title(480,45,'ANGRIER JORDAN · PRIVATE LOUNGE EVENTS',16,ink.teal)+title(480,91,name,43)+title(480,125,state,20,ink.warm);}
function pool(view:RaceView,label:string){return panel(32,553,896,60,ink.gold)+title(480,581,(view.result?.pool??view.pool)+' Ottomans · '+label,25)+text(480,603,view.result?.refunded?'FULL REFUND · NO RAKE':'SIT. PLAY. BELONG.',14,ink.warm,mid);}
/** A single clock animation is anchored to the saved waiting deadline. */
function waitingClock(remainingMs:number,totalMs:number,x=32,y=553,width=896,poolValue='0'){
 const seconds=Math.max(0,Math.ceil(remainingMs/1000)),ratio=Math.max(0,Math.min(1,remainingMs/totalMs)),clock=seconds?String(Math.floor(seconds/60)).padStart(2,'0')+':'+String(seconds%60).padStart(2,'0'):'STARTING';
 return '<g data-waiting-seconds="'+seconds+'">'+panel(x,y,width,60,ink.gold)+title(x+width/2,y+29,(seconds?'STARTS IN '+clock:'WAITING WINDOW COMPLETE'),29,seconds<=5?ink.gold:ink.white)+text(x+width-18,y+27,short(poolValue,18)+' Ottomans',17,ink.warm,'text-anchor="end"')+'<rect x="'+(x+18)+'" y="'+(y+43)+'" width="'+(width-36)+'" height="7" rx="3" fill="#05202B"/><rect x="'+(x+18)+'" y="'+(y+43)+'" width="'+((width-36)*ratio)+'" height="7" rx="3" fill="url(#gold)"/></g>';
}
/** Position and finish arrival both consume the persisted race snapshot; no modulo motion. */
export function renderWideRace(view:RaceView,motion:EventMotion={}){
 if(view.state==='CLOSED')return grandFinale(view,'race');
 if(view.state==='OPEN')return raceEntry(view);
 const live=view.state==='LOCKED',cancelled=view.state==='CANCELLED',finished=!!view.motion?.finished;
 let body='<g transform="translate(120 0)">'+heading('Chair Race',live?(finished?'THE FINISH LINE · OFFICIAL RESULT NEXT':'LIVE STANDINGS · BETTING LOCKED'):cancelled?'RACE CANCELLED':'TAKE YOUR SEAT · BACK YOUR FAVOURITE')+'</g>';
 if(live&&view.motion){
  const h=390/Math.max(1,view.racers.length),start=290,finish=1090;
  for(const [i,r]of view.racers.entries()){
   const row=view.motion.rows.find(x=>x.userId===r.userId),progress=Math.max(0,Math.min(100,row?.progress??0)),y=146+i*h,size=Math.min(170,h-7),x=start+progress/100*(finish-start-size*.88),near=progress>80;
   body+=panel(32,y,1136,h-5,i%2?ink.gold:ink.teal)+title(151,y+h*.45,short(r.name,16),26)+title(151,y+h*.8,'#'+(row?.place??i+1),21,ink.gold);
   body+='<path d="M'+start+' '+(y+h-9)+'H'+finish+'" stroke="#B99859" stroke-width="2" stroke-dasharray="18 9"/>';
   for(let k=0;k<6;k++)body+='<rect x="'+(finish+(k%2)*8)+'" y="'+(y+8+Math.floor(k/2)*Math.max(10,(h-18)/3))+'" width="8" height="'+Math.max(10,(h-18)/3)+'" fill="'+(k%2?'#F4C542':'#E6EAF0')+'"/>';
   if(near)body+='<ellipse cx="'+(x+size/2)+'" cy="'+(y+h/2)+'" rx="'+size+'" ry="'+(h*.4)+'" fill="url(#lamp)" opacity="'+((progress-80)/20)+'"/>';
   body+='<image data-race-progress="'+progress+'" data-race-nose="'+(x+size*.88)+'" href="'+raceWheelchair(r.chair)+'" x="'+x+'" y="'+(y+2)+'" width="'+size+'" height="'+size+'"/>';
  }
 }else{
  if(!cancelled)body+=waitingClock(motion.waitingMs??0,view.extensionUsed?90000:60000,32,132,1136,view.pool);
  const n=Math.max(1,view.racers.length),cols=n<=2?n:3,rows=Math.ceil(n/cols),w=1136/cols,top=cancelled?146:203,h=((cancelled?535:617)-top)/rows;
  for(const[i,r]of view.racers.entries()){const x=32+i%cols*w,y=top+Math.floor(i/cols)*h,cx=x+w/2;
   body+=panel(x+3,y,w-6,h-8,i%2?ink.gold:ink.teal)+title(cx,y+31,short(r.name,22),28)+'<ellipse cx="'+cx+'" cy="'+(y+h-25)+'" rx="'+(w*.4)+'" ry="22" fill="url(#aura)"/><image href="'+raceWheelchair(r.chair)+'" x="'+(x+12)+'" y="'+(y+35)+'" width="'+(w-24)+'" height="'+(h-49)+'"/>';
  }
 }
 return frame(body+('<g transform="translate(120 0)">'+pool(view,live?(finished?'finish line reached':'race pool'):short(motion.callout??'total pool',48))+'</g>'),'lounge-stage-runtime.png',true);
}
/** Static entry artwork stays truthful between updates; Discord owns the live deadline. */
function raceEntry(view:RaceView){
 const deadline=view.expiresAt?new Date(view.expiresAt).toISOString().slice(11,19)+' UTC':'Pending';
 let body=text(40,45,'ANGRIER JORDAN · LOUNGE EVENTS',15,ink.teal,'letter-spacing="2"')+text(40,91,'Chair Race',40,ink.white,'font-family="Space Grotesk" font-weight="700"')+text(40,122,'Take your seat. Back your favourite.',19,ink.warm);
 body+=panel(830,33,330,91,ink.gold)+text(850,60,'ENTRY OPEN',15,ink.teal,'font-weight="600" letter-spacing="1.5"')+text(850,91,'Closes '+deadline,21,ink.white)+text(850,112,view.extensionUsed?'Host extension used':'Join using the controls below',13,ink.warm);
 const cols=3,w=376,h=185;
 for(let i=0;i<6;i++){
  const r=view.racers[i],x=32+i%cols*380,y=148+Math.floor(i/cols)*h;
  if(!r){body+=panel(x,y,w,h-12,ink.teal)+text(x+18,y+27,'LANE '+String(i+1).padStart(2,'0'),12,ink.teal,'letter-spacing="1.5"')+'<circle cx="'+(x+188)+'" cy="'+(y+84)+'" r="20" fill="none" stroke="'+ink.teal+'" stroke-opacity=".5"/><path d="M'+(x+178)+' '+(y+84)+'h20M'+(x+188)+' '+(y+74)+'v20" stroke="'+ink.warm+'" stroke-opacity=".65"/>'+text(x+188,y+135,'An open seat awaits',18,ink.muted,mid);continue;}
  body+=panel(x,y,w,h-12,i%2?ink.gold:ink.teal)+text(x+18,y+27,'LANE '+String(i+1).padStart(2,'0'),12,ink.teal,'letter-spacing="1.5"')+text(x+18,y+55,short(r.name,22),24,ink.white,'font-family="Space Grotesk" font-weight="600"');
  body+='<ellipse cx="'+(x+w/2)+'" cy="'+(y+h-30)+'" rx="130" ry="15" fill="url(#aura)"/><image href="'+raceWheelchair(r.chair)+'" x="'+(x+48)+'" y="'+(y+60)+'" width="280" height="'+(h-81)+'" preserveAspectRatio="xMidYMid meet"/>';
 }
 body+=panel(32,530,1136,82,ink.gold)+text(54,557,'ON THE GRID',12,ink.teal,'letter-spacing="1.4"')+text(54,588,view.racers.length+' racers',25,ink.white,'font-family="Space Grotesk" font-weight="600"')+'<path d="M291 546V596M653 546V596" stroke="'+ink.warm+'" stroke-opacity=".23"/>'+text(316,557,'RACE POOL',12,ink.teal,'letter-spacing="1.4"')+text(316,588,short(view.pool,18)+' Ottomans',25,ink.warm)+text(680,557,'YOUR NEXT MOVE',12,ink.teal,'letter-spacing="1.4"')+text(680,586,'Join the grid · place your bet below',21,ink.white);
 return frame(body,'lounge-stage-runtime.png',true);
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
 return frame(body+(view.state==='OPEN'?waitingClock(motion.waitingMs??0,view.extensionUsed?60000:30000,32,553,896,view.pool):pool(view,short(motion.callout??'total pool',48))));
}

/** Terminal scene persists on the original message; only settled outcomes reach this composition. */
function grandFinale(view:RaceView,kind:'race'|'fight'){
 const winner=view.racers.find(r=>r.userId===view.winnerId),loser=view.racers.find(r=>r.userId!==view.winnerId),name=short(winner?.name??'Winner',28),size=name.length>20?40:54;
 let body=(kind==='race'?'<image data-winner-chair="'+skin(winner?.chair)+'" href="'+raceWheelchair(winner?.chair)+'" x="170" y="135" width="620" height="432"/>':'<image data-winner-chair="'+skin(winner?.chair)+'" href="'+robot(winner?.chair)+'" x="80" y="145" width="500" height="422"/><g opacity=".58" transform="translate(760 445) rotate(65)"><image href="'+robot(loser?.chair)+'" x="-125" y="-125" width="250" height="250"/></g>');
 body+='<rect x="160" y="19" width="640" height="130" rx="12" fill="#06131D" fill-opacity=".72"/>'+title(480,49,kind==='race'?'CHAMPION OF THE CHAIRS':'ARENA CHAMPION',25,ink.gold)+title(480,105,name,size)+text(480,136,'ANGRIER JORDAN · THE GRAND FINALE',15,ink.teal,mid);
 if(kind==='fight')body+=panel(614,535,301,34,ink.gold)+text(765,559,'DEFEATED · '+short(loser?.name??'Opponent',16),18,ink.white,mid);
 body+=panel(30,575,900,45,ink.gold)+title(480,594,short((view.result?.pool??view.pool)+' Ottomans · '+(view.result?.refunded?'FULL REFUND':'Rake '+(view.result?.rake??'0')),70),20,ink.gold)+text(480,613,kind==='race'?'VICTORY LANE · SIT. PLAY. BELONG.':'THE FINAL BELL BELONGS TO YOU',15,ink.white,mid);
 return frame(body,kind+'-stage-runtime.png');
}

export function renderEventNotice(name:string,copy:string){return frame(heading(name,'ANGRIER JORDAN')+panel(32,150,896,460)+lines(copy,76).slice(0,16).map((line,i)=>title(480,183+i*26,line,21)).join(''));}
