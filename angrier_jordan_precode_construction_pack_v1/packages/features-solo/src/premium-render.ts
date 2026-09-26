import {readFileSync} from 'node:fs';
import type {SoloView} from './prisma-repository.js';
import {wrapText} from '../../renderer/src/text-layout.js';
let lounge:string|undefined,chair:string|undefined;
const esc=(s:string)=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const t=(x:number,y:number,s:string,size=30,color='#E6EAF0',heading=false)=>`<text x="${x}" y="${y}" text-anchor="middle" font-family="${heading?'Cinzel':'Poppins'}" font-size="${size}" font-weight="700" fill="${color}">${esc(s)}</text>`;
const box=(x:number,y:number,w:number,h:number,color='#3B82F6')=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="20" fill="url(#glass)" stroke="${color}" stroke-width="2"/><path d="M${x+24} ${y+9}H${x+w-24}" stroke="#E6EAF0" stroke-opacity=".2" stroke-width="2"/><path d="M${x+24} ${y+h-7}H${x+w-24}" stroke="#F4C542" stroke-opacity=".15"/><path d="M${x+12} ${y+42}V${y+12}H${x+46}M${x+w-46} ${y+h-12}H${x+w-12}V${y+h-42}" fill="none" stroke="#F4C542" stroke-width="3"/>`;
export interface SoloPortrait {name:string;avatarData:string;}
export function renderPremiumSolo(v:SoloView,title:string,member?:SoloPortrait){
 lounge??='data:image/png;base64,'+readFileSync(new URL('../../../production/event_art/v5/lounge-stage-runtime.png',import.meta.url)).toString('base64');
 chair??='data:image/png;base64,'+readFileSync(new URL('../../../production/event_art/v3/race_chair_1.png',import.meta.url)).toString('base64');
 const p=v.puzzle,closed=p.outcome!=='playing',accent=p.outcome==='won'?'#10B981':closed?'#F4C542':'#3B82F6';
 let b=t(600,48,'ANGRIER JORDAN · THE PUZZLE LOUNGE',22,'#F4C542')+t(600,112,title,48,'#E6EAF0',true);
 b+=box(35,140,1130,95,accent)+t(620,181,member?.name?.slice(0,45)??'Your solo challenge',28)+t(620,215,closed?p.outcome.toUpperCase()+' · '+v.paid+' Ottomans awarded':'ROUND ACTIVE · NO ENTRY FEE',23,accent);
 if(member?.avatarData&&/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(member.avatarData)&&member.avatarData.length<1400000)b+=`<defs><clipPath id="avatar"><circle cx="97" cy="187" r="33"/></clipPath></defs><image href="${member.avatarData}" x="64" y="154" width="66" height="66" clip-path="url(#avatar)"/><circle cx="97" cy="187" r="35" fill="none" stroke="#F4C542" stroke-width="3"/>`;
 b+=box(35,256,1130,480);
 if(p.game==='minesweeper'){
  const size=p.options.boardSize!,side=73,gap=10,start=100;
  for(const[n,c]of p.board!.entries()){const x=start+n%size*(side+gap),y=283+Math.floor(n/size)*(side+gap);b+=box(x,y,side,side,c==='mine'?'#EF4444':c==='flag'?'#F4C542':'#3B82F6')+t(x+side/2,y+48,c==='hidden'?String(n+1):c==='flag'?'F':c==='mine'?'×':String(c),32,c==='hidden'?'#E6EAF0':'#F4C542');}
  b+=t(850,337,size+' × '+size+' FIELD',36,'#F4C542',true)+t(850,402,size===4?'3 hidden mines':'5 hidden mines',30)+t(850,470,'F · Flagged',27,'#F4C542')+t(850,519,'Number · Nearby mines',24)+t(850,583,'Reveal every safe cell',26)+t(850,633,'First reveal is safe',24,'#9CBDFA');
 }else if(p.game==='mastermind'){
  b+=t(600,298,'FOUR DIGITS · 1–6 · REPEATS ALLOWED',26,'#F4C542');
  for(let n=0;n<10;n++){const col=n<5?0:1,row=n%5,x=col?635:75,y=323+row*70,g=p.guesses[n];b+=box(x,y,490,58,g?'#3B82F6':'#374151')+t(x+32,y+39,String(n+1),22,'#F4C542')+t(x+147,y+40,g?g.split('').join(' '):'— — — —',28)+t(x+350,y+37,g?`${p.feedback[n]!.exact} exact · ${p.feedback[n]!.misplaced} near`:'Awaiting guess',21,g?'#9CBDFA':'#9BAABB');}
  b+=t(600,717,p.code?'Code: '+p.code.join(' '):'Exact = digit + position · Near = digit in another position',24,'#F4C542');
 }else{
  b+=t(600,307,p.game==='hangman'?'REVEAL THE LOUNGE WORD':'UNSCRAMBLE THE LOUNGE WORD',27,'#F4C542');
  const word=p.scrambled??p.word??'',tileWidth=Math.min(74,1020/Math.max(1,word.length)),left=600-word.length*tileWidth/2;for(const [n,letter]of [...word.toUpperCase()].entries()){const x=left+n*tileWidth;b+=box(x+3,337,tileWidth-6,67,p.game==='hangman'&&letter==='_'?'#374151':'#3B82F6')+t(x+tileWidth/2,384,letter,Math.min(38,tileWidth*.62),'#E6EAF0');}
  if(p.scrambled)b+=t(600,443,closed?'Answer: '+p.word:'Find the original word',28,'#9CBDFA');
  const used=p.game==='hangman'?p.mistakes:p.guesses.length;b+=t(600,493,used+' / 6 '+(p.game==='hangman'?'incorrect letters':'guesses'),28,'#F4C542');
  if(p.game==='hangman'){for(let n=0;n<6;n++){const x=340+n*88;b+=`<image href="${chair}" x="${x}" y="505" width="70" height="65" opacity="${n<used?'.22':'1'}"/>`;if(n<used)b+=`<path d="M${x+12} 559L${x+58} 519" stroke="#F4C542" stroke-width="4"/>`;}}else for(let n=0;n<6;n++)b+=`<rect x="${342+n*88}" y="515" width="70" height="12" rx="6" fill="${n<used?'#F4C542':'#24354F'}"/>`;
  const history=p.game==='hangman'?(p.letters.join(' · ').toUpperCase()||'No letters guessed yet'):p.guesses.join(' · ')||'Your guesses will appear here';
  wrapText(history,1010,27).slice(0,4).forEach((s,n)=>b+=t(600,603+n*31,s,25));
 }
 if(p.outcome==='won'){for(let n=0;n<16;n++){const x=55+n*72,y=124+(n%3)*9;b+=`<path d="M${x} ${y-5}v10m-5-5h10" stroke="#F4C542" stroke-width="2"/>`;}b+=t(1080,215,'VICTORY',21,'#10B981');}
 b+=box(35,756,1130,99,'#F4C542')+t(600,796,closed?'ROUND COMPLETE · PLAY AGAIN BELOW':'USE THE CONTROLS BELOW TO PLAY',28,'#F4C542',true)+t(600,833,closed?'A fresh puzzle awaits.':v.expiresAt?'Closes '+v.expiresAt.toISOString().slice(11,19)+' UTC · Shared daily reward cap':'Shared daily reward cap',24);
 return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="895" viewBox="0 0 1200 895"><defs><linearGradient id="glass" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#28517A" stop-opacity=".94"/><stop offset=".32" stop-color="#173454" stop-opacity=".97"/><stop offset=".65" stop-color="#102339" stop-opacity=".96"/><stop offset="1" stop-color="#071521" stop-opacity=".98"/></linearGradient></defs><image href="${lounge}" width="1200" height="895" preserveAspectRatio="xMidYMid slice"/><rect width="1200" height="895" fill="#081220" opacity=".48"/>${b}<rect x="7" y="7" width="1186" height="881" rx="26" fill="none" stroke="#3B82F6" stroke-width="3"/><rect x="18" y="18" width="1164" height="859" rx="20" fill="none" stroke="#F4C542" stroke-width="2"/></svg>`;
}
