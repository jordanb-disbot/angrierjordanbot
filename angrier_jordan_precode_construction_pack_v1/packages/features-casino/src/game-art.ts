import {esc} from '../../features-events/src/visual.js';
import {portrait} from '../../features-events/src/gate-b-visual.js';
import {wrapText,textWidth,truncateText} from '../../renderer/src/text-layout.js';
import {handValue,type ChairSymbol} from './domain.js';
import type {CasinoResultRenderInput} from './render.js';

export type CasinoVisual=
 | {kind:'slots';symbols:string[];table:ChairSymbol[];jackpot?:boolean}
 | {kind:'blackjack';dealer:number[];hands:{cards:number[];stake:string;status:string}[];active:number;closed:boolean;result?:string}
 | {kind:'roulette';number:number;color:string;selection:string}
 | {kind:'dice';player:number;house:number;selection:string}
 | {kind:'coinflip';landed:string;selection:string}
 | {kind:'lottery';tickets:number;drawAt:string;price?:string;winner?:boolean}
 | {kind:'jackpot'}
 | {kind:'rules';game:string;table?:ChairSymbol[]};
const gold='#E8C780',white='#F2EFE3',mint='#9FEDD0';
const text=(x:number,y:number,s:string,size=26,color=white,font='Inter')=>`<text x="${x}" y="${y}" text-anchor="middle" font-family="${font}" font-weight="700" font-size="${size}" fill="${color}">${esc(s)}</text>`;
const fit=(x:number,y:number,s:string,width:number,size=28,color=white,font='Inter')=>text(x,y,s,Math.min(size,Math.floor(size*width/Math.max(width,textWidth(s,size)))),color,font);
const lines=(s:string,x:number,y:number,w:number,size=24,color=white)=>wrapText(s,w,size).map((l,i)=>text(x,y+i*(size+9),l,size,color)).join('');
const rect=(x:number,y:number,w:number,h:number,fill='url(#felt)',stroke=gold,r=16)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}" stroke="${stroke}" stroke-width="2"/>`;

/** Hand-drawn vectors use the saved symbol identity, never substitute a different roll. */
export function chairSymbol(id:string,x:number,y:number,size:number):string{
 let shape='';
 if(id==='folding_chair')shape='<path d="M30 18H73L68 51H35Z" fill="url(#leather)"/><path d="M30 57H78V69H30Z" fill="url(#brass)"/><path d="M37 68L75 96M71 68L27 96M34 48L29 65M70 48L77 65" fill="none"/><path d="M42 25H63M40 34H62" stroke="#76C4A1" stroke-width="2"/>';
 else if(id==='barstool')shape='<ellipse cx="51" cy="30" rx="30" ry="13" fill="url(#leather)"/><path d="M25 30V39Q51 54 78 39V30" fill="url(#leather)"/><path d="M32 46L25 94M69 46L77 94M30 70H72M26 91H77" fill="none"/>';
 else if(id==='chaise_lounge')shape='<path d="M11 62Q9 35 23 29Q35 25 41 54L83 58Q96 58 94 76H14Z" fill="url(#leather)"/><path d="M20 78L16 94M83 78L90 94M28 45Q36 68 84 68" fill="none"/><path d="M47 61V69M59 63V70M71 65V71" stroke-width="2"/>';
 else if(id==='recliner')shape='<path d="M27 14Q50 5 73 14L78 67H23Z" fill="url(#leather)"/><path d="M15 47Q25 38 32 49V67H70V49Q80 37 89 47L84 82H17Z" fill="url(#leather)"/><path d="M31 70H75L92 90H45Z" fill="url(#leather)"/><path d="M19 82V94M78 82V95M42 20V48M59 20V48" fill="none"/>';
 else if(id==='throne')shape='<path d="M20 60V26L30 18L35 10L47 13L52 3L60 13L71 10L75 21L84 27V64" fill="url(#brass)"/><path d="M30 29Q51 17 74 29V67H30Z" fill="url(#leather)"/><path d="M14 52Q24 45 30 59V71H73V59Q84 43 92 53L88 87H15Z" fill="url(#leather)"/><path d="M23 88L20 99M79 88L85 99M39 31L64 60M66 31L40 60M29 79H78" fill="none"/><circle cx="52" cy="44" r="3" fill="#FFEAB0"/>';
 else shape='<path d="M25 15Q50 5 75 15V68H25Z" fill="url(#leather)"/><path d="M15 50H28V70H73V50H87V87H15Z" fill="url(#leather)"/><path d="M23 88V99M78 88V99"/>';
 return `<g data-art="chair-symbol" transform="translate(${x} ${y}) scale(${size/105})" stroke="${gold}" stroke-width="3.5" stroke-linejoin="round"><ellipse cx="52" cy="98" rx="46" ry="5" fill="#000" opacity=".3" stroke="none"/>${shape}</g>`;
}
function card(c:number|null,x:number,y:number,w:number,h:number):string{
 if(c===null)return `<g data-art="hidden-card">${rect(x,y,w,h,'#163C38',gold,8)}<rect x="${x+7}" y="${y+7}" width="${w-14}" height="${h-14}" rx="5" fill="url(#weave)" stroke="${gold}"/>${chairSymbol('throne',x+w*.18,y+h*.24,w*.64)}</g>`;
 const rank=['A','2','3','4','5','6','7','8','9','10','J','Q','K'][c%13]??'?',suit=Math.floor(c/13),color=[1,2].includes(suit)?'#A72535':'#142C2B';
 // Vector suits avoid missing Unicode glyphs in the bundled display fonts.
 const glyph=suit===0?'<circle cx="0" cy="-12" r="11"/><circle cx="-11" cy="2" r="11"/><circle cx="11" cy="2" r="11"/><path d="M-6 3H6L11 23H-11Z"/>':suit===1?'<path d="M0-25L20 0L0 25L-20 0Z"/>':suit===2?'<path d="M0 24L-19 3C-40-21-9-33 0-14C9-33 40-21 19 3Z"/>':'<path d="M0-25L-19-4C-39 19-10 29 0 12C10 29 39 19 19-4ZM-6 8H6L11 27H-11Z"/>';
 return `<g data-art="card-face" data-suit="${suit}">${rect(x,y,w,h,'url(#ivory)','#C6A96A',8)}${text(x+w*.24,y+h*.24,rank,Math.min(26,w*.3),color)}<g transform="translate(${x+w*.52} ${y+h*.55}) scale(${w/110})" fill="${color}">${glyph}</g>${text(x+w*.78,y+h*.91,rank,Math.min(20,w*.26),color)}</g>`;
}
function hand(cards:(number|null)[],cx:number,y:number,width:number,h:number):string{
 const w=Math.min(96,h*.76),step=Math.min(w+12,(width-w)/Math.max(1,cards.length-1)),left=cx-(w+step*(cards.length-1))/2;
 return cards.map((c,i)=>card(c,left+i*step,y,w,h)).join('');
}
function die(value:number,x:number,y:number,size:number,house=false):string{
 const positions:Record<number,number[][]>={1:[[1,1]],2:[[0,0],[2,2]],3:[[0,0],[1,1],[2,2]],4:[[0,0],[2,0],[0,2],[2,2]],5:[[0,0],[2,0],[1,1],[0,2],[2,2]],6:[[0,0],[0,1],[0,2],[2,0],[2,1],[2,2]]};
 return `<g data-art="die-${value}"><rect x="${x+7}" y="${y+9}" width="${size}" height="${size}" rx="26" fill="#020C10"/>${rect(x,y,size,size,house?'url(#leather)':'url(#ivory)',gold,26)}${(positions[value]??[]).map(([a,b])=>`<circle cx="${x+size*(.24+a!*.26)}" cy="${y+size*(.24+b!*.26)}" r="${size*.068}" fill="${house?gold:'#134B3A'}"/>`).join('')}</g>`;
}
function coin(side:string,cx:number,cy:number,r:number):string{
 return `<g data-art="coin-${esc(side)}"><circle cx="${cx}" cy="${cy+7}" r="${r}" fill="#765523"/><circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#brass)" stroke="#FBE6AC" stroke-width="3"/><circle cx="${cx}" cy="${cy}" r="${r-13}" fill="#163D31" stroke="#B9954E" stroke-width="4"/><circle cx="${cx}" cy="${cy}" r="${r-22}" fill="none" stroke="${gold}" stroke-dasharray="2 8" stroke-width="3"/>${side==='heads'?chairSymbol('throne',cx-r*.47,cy-r*.58,r*.94):text(cx,cy+r*.23,'AJ',r*.75,gold,'Space Grotesk')}${text(cx,cy+r*.69,side.toUpperCase(),Math.max(18,r*.16),gold)}</g>`;
}
const wheelNumbers=[0,32,15,19,4,21,2,25,17,34,6,27,13,36,11,30,8,23,10,5,24,16,33,1,20,14,31,9,22,18,29,7,28,12,35,3,26];
function wheel(hit:number):string{
 const cx=348,cy=341,r=171,inner=127;
 const pt=(angle:number,rad:number)=>[cx+Math.cos(angle)*rad,cy+Math.sin(angle)*rad];
 return `<g data-art="roulette-wheel"><circle cx="${cx}" cy="${cy}" r="184" fill="url(#brass)"/><circle cx="${cx}" cy="${cy}" r="177" fill="#06221E"/>${wheelNumbers.map((n,i)=>{const a=-Math.PI/2+(i-.5)*Math.PI*2/37,b=a+Math.PI*2/37,[x1,y1]=pt(a,r),[x2,y2]=pt(b,r),[ix,iy]=pt(b,inner),[jx,jy]=pt(a,inner),[tx,ty]=pt((a+b)/2,150);return `<path d="M${x1} ${y1}A${r} ${r} 0 0 1 ${x2} ${y2}L${ix} ${iy}A${inner} ${inner} 0 0 0 ${jx} ${jy}Z" fill="${i===0?'#168967':i%2?'#9E2939':'#14202A'}" stroke="${n===hit?'#FFF5C4':'#C1A365'}" stroke-width="${n===hit?4:1}"/>${text(tx!,ty!+6,String(n),16)}${n===hit?`<circle cx="${cx+(tx!-cx)*1.11}" cy="${cy+(ty!-cy)*1.11}" r="7" fill="#FFF8E6"/>`:''}`;}).join('')}<circle cx="${cx}" cy="${cy}" r="122" fill="url(#leather)" stroke="${gold}"/><circle cx="${cx}" cy="${cy}" r="95" fill="none" stroke="${gold}" stroke-opacity=".4"/>${chairSymbol('throne',cx-49,cy-60,98)}${text(cx,cy+83,'SINGLE ZERO',16,gold)}</g>`;
}
function ticket(x:number,y:number,w:number,h:number,label:string,value:string):string{
 return `<g data-art="lottery-ticket">${rect(x,y,w,h,'url(#ivory)',gold,24)}<path d="M${x+w*.76} ${y+12}V${y+h-12}" stroke="#99763A" stroke-dasharray="7 7" stroke-width="2"/>${text(x+w*.38,y+41,label,20,'#35594A')}${fit(x+w*.38,y+h*.63,value,w*.65,49,'#153F35')}${chairSymbol('throne',x+w*.79,y+h*.25,w*.15)}${text(x+w*.38,y+h-20,'THE EMERALD ROOM',16,'#846226')}</g>`;
}

function scene(v:CasinoVisual):string{
 if(v.kind==='slots'){
  const match=v.symbols.length===3&&v.symbols.every(s=>s===v.symbols[0]),symbol=v.table.find(s=>s.id===v.symbols[0]),pay=match&&symbol&&(symbol.multiplier>0||symbol.jackpot);
  return `<g data-game="slots">${v.jackpot?Array.from({length:18},(_,i)=>`<path d="M600 340L${90+i*60} ${i%2?175:534}" stroke="#FBE3A2" opacity=".32" stroke-width="3"/>`).join(''):''}${rect(117,167,966,349,'url(#brass)')}${rect(127,177,946,329,'#071C1B')}${v.symbols.slice(0,3).map((id,i)=>{const x=151+i*306,s=v.table.find(t=>t.id===id);return `${rect(x,192,286,222,'url(#ivory)',pay?'#FBE3A2':'#977B44',18)}${chairSymbol(id,x+54,194,178)}${fit(x+143,393,s?.name??'Chair symbol',258,26,'#183E31')}`;}).join('')}<path d="M133 302H1067" stroke="${pay?'#F9DA83':'#A8874D'}" stroke-width="${pay?5:2}" stroke-dasharray="${pay?'0':'7 10'}" opacity=".7"/><path d="M128 291L143 302L128 313M1072 291L1057 302L1072 313" fill="${gold}"/>${text(600,450,v.jackpot?'CHAIR POT · JACKPOT':pay?'THREE OF A KIND':'NO PAYING LINE',32,v.jackpot?'#FFE7A0':white,'Space Grotesk')}${text(600,485,pay?(symbol?.jackpot?symbol.multiplier?`Chair Pot + ${symbol.multiplier}× base return`:'THE FULL CHAIR POT':`${symbol?.multiplier}× wager returned`):'Three matching symbols unlock the payout',22,mint)}${text(600,544,'SYMBOL PAYOUT GUIDE · OPEN RULES',20,gold)}</g>`;
 }
 if(v.kind==='blackjack'){
  const dealer=v.closed?v.dealer:[v.dealer[0]!,null],count=v.hands.length,w=1080/Math.max(1,count);
  return `<g data-game="blackjack"><ellipse cx="600" cy="364" rx="540" ry="186" fill="url(#felt)" stroke="${gold}" stroke-width="3"/><ellipse cx="600" cy="364" rx="523" ry="173" fill="url(#weave)" stroke="#A3CDB0" stroke-opacity=".35"/>${text(600,178,v.closed?`DEALER · ${handValue(v.dealer).total}`:'DEALER · HOLE CARD HIDDEN',21,gold)}${hand(dealer,600,193,800,123)}${v.hands.map((h,i)=>{const cx=60+w*(i+.5),label=`HAND ${i+1} · ${handValue(h.cards).total}${!v.closed&&v.active===i?' · YOUR MOVE':''}`;return `${text(cx,339,label,count>2?18:22,!v.closed&&v.active===i?'#FFE39A':mint)}${hand(h.cards,cx,354,w-24,123)}${fit(cx,499,`${h.stake} Ottomans · ${h.status??''}`,w-20,19)}`;}).join('')}${text(600,540,v.closed?(v.result==='Blackjack'?'BLACKJACK · NATURAL 21':(v.result??'Hand settled').toUpperCase()):'HIT · STAND · DOUBLE · SPLIT',22,gold)}</g>`;
 }
 if(v.kind==='roulette')return `<g data-game="roulette"><g transform="translate(348 341) scale(1.08) translate(-348 -341)">${wheel(v.number)}</g>${rect(612,193,481,319)}${text(851,239,'WINNING POCKET',22,gold)}<circle cx="851" cy="323" r="66" fill="${v.color==='red'?'#A52D3C':v.color==='green'?'#168563':'#08131B'}" stroke="${gold}" stroke-width="3"/>${text(851,346,String(v.number),64)}${text(851,424,v.color.toUpperCase(),25,gold)}${fit(851,470,'YOUR BET · '+v.selection.toUpperCase(),430,27)}</g>`;
 if(v.kind==='dice')return `<g data-game="dice">${text(324,208,'YOUR ROLL',25,gold)}${text(876,208,'HOUSE ROLL',25,gold)}${die(v.player,211,222,226)}${die(v.house,763,222,226,true)}${text(600,344,v.player===v.house?'=':v.player>v.house?'>':'<',92,gold,'Space Grotesk')}${text(324,477,String(v.player),38)}${text(876,477,String(v.house),38)}${text(600,529,'HIGHER ROLL WINS · TIES RETURN YOUR WAGER',23,mint)}</g>`;
 if(v.kind==='coinflip')return `<g data-game="coinflip">${coin(v.landed,386,346,166)}${rect(641,223,450,247)}${text(866,270,'YOUR CALL',22,gold)}${text(866,323,v.selection.toUpperCase(),43)}${text(866,374,'LANDED',20,mint)}${text(866,425,v.landed.toUpperCase(),38,gold)}${text(600,538,'THRONE = HEADS · AJ MONOGRAM = TAILS',22,mint)}</g>`;
 if(v.kind==='lottery')return `<g data-game="lottery">${ticket(113,194,974,211,v.winner?'THE WINNING DRAW':'YOUR WEEKLY ENTRIES',v.winner?'WINNER':`${v.tickets} / 20 TICKETS`)}${text(600,456,v.winner?'THE FULL POT · ONE WINNER':'NEXT DRAW',25,gold)}${fit(600,500,v.winner?'Your prize has been settled.':v.drawAt,1030,28)}${text(600,536,(v.price?`${v.price} OTTOMANS / TICKET · `:'TICKET-FUNDED PRIZE · ')+'NO RAKE · NO ROLLOVER',21,mint)}</g>`;
 if(v.kind==='jackpot')return `<g data-game="jackpot">${Array.from({length:24},(_,i)=>{const a=i*Math.PI/12;return `<path d="M${600+Math.cos(a)*161} ${342+Math.sin(a)*132}L${600+Math.cos(a)*465} ${342+Math.sin(a)*175}" stroke="${gold}" stroke-width="${i%3?1:4}" opacity=".5"/>`;}).join('')}<ellipse cx="600" cy="492" rx="257" ry="22" fill="url(#brass)"/><ellipse cx="600" cy="483" rx="224" ry="12" fill="#4C5838"/>${chairSymbol('throne',453,172,294)}${text(600,541,'THE CHAIR POT IS YOURS',32,'#FFEAB2','Space Grotesk')}</g>`;
 return '';
}

export function renderCasinoGame(data:CasinoResultRenderInput):string{
 const v=data.visual!;
 let body='',height=720;
 if(v.kind==='rules'){
  let y=176;
  if(v.game==='slots'&&v.table?.length){
   body+=text(600,y,'THREE MATCHING SYMBOLS · GROSS RETURNS',23,gold);y+=22;
   for(let start=0;start<v.table.length;start+=5){const items=v.table.slice(start,start+5),w=1100/items.length;body+=items.map((s,i)=>{const cx=50+w*(i+.5);return rect(cx-w/2+5,y,w-10,196)+chairSymbol(s.id,cx-43,y+7,86)+fit(cx,y+123,s.name,w-22,22)+fit(cx,y+159,s.jackpot?(s.multiplier?`${s.multiplier}× + Chair Pot`:'Chair Pot'):`${s.multiplier}×`,w-22,23,gold);}).join('');y+=211;}
  }else {
   body+=text(600,y,`${v.game.toUpperCase()} · TABLE GUIDE`,29,gold,'Space Grotesk');
   body+=v.game==='blackjack'?hand([0,12],600,194,340,110):v.game==='roulette'?`<g transform="translate(496 144) scale(.3)">${wheel(0)}</g>`:v.game==='dice'?die(6,479,198,98)+die(3,621,198,98,true):v.game==='coinflip'?coin('heads',600,252,58):ticket(420,194,360,112,'WEEKLY DRAW','LOTTERY');y=329;
  }
  for(const d of data.details){const wrapped=wrapText(d.value,1020,25),h=68+wrapped.length*34;body+=rect(46,y,1108,h)+text(600,y+33,d.label.toUpperCase(),20,gold)+wrapped.map((l,i)=>text(600,y+69+i*34,l,25)).join('');y+=h+14;}height=Math.max(400,y+46);
 }else{
  body=scene(v);
  const columns=data.wager?[{label:'COMMITTED WAGER',value:data.wager},{label:data.net===undefined&&v.kind==='blackjack'?'ACTIVE HAND':data.amountLabel.toUpperCase(),value:data.net===undefined&&v.kind==='blackjack'?`${v.active+1} / ${v.hands.length}`:data.amount},{label:data.net===undefined?'ROUND STATE':'NET RESULT',value:data.net??'In progress'}]:[{label:data.amountLabel.toUpperCase(),value:data.amount}];
  const width=1108/columns.length;
  body+=rect(46,559,1108,99,'#08211E')+columns.map((c,i)=>`${i?`<path d="M${46+i*width} 576V641" stroke="${gold}" opacity=".45"/>`:''}${text(46+width*(i+.5),586,c.label,18,mint)}${fit(46+width*(i+.5),628,c.value,width-28,columns.length===1?54:43,gold)}`).join('');
  body+=text(600,683,'Ottomans · '+(data.wager?'Return includes any returned stake':'The Emerald Room'),18,mint);
 }
 const member=data.memberName?`${portrait('casino-identity',data.memberName,data.avatarData,86,29,70)}${text(218,63,truncateText(data.memberName,175,20),20,gold)}`:'';
 return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="${height}" viewBox="0 0 1200 ${height}"><defs><linearGradient id="brass" x2=".9" y2="1"><stop stop-color="#7D602D"/><stop offset=".26" stop-color="#F8E1A3"/><stop offset=".53" stop-color="#BA934D"/><stop offset=".8" stop-color="#EACD8B"/><stop offset="1" stop-color="#735528"/></linearGradient><radialGradient id="felt"><stop stop-color="#155944"/><stop offset="1" stop-color="#092925"/></radialGradient><linearGradient id="leather" x2=".7" y2="1"><stop stop-color="#56A88C"/><stop offset=".35" stop-color="#155944"/><stop offset="1" stop-color="#06251F"/></linearGradient><linearGradient id="ivory" x2=".1" y2="1"><stop stop-color="#FFF5D9"/><stop offset=".5" stop-color="#EBDEC0"/><stop offset="1" stop-color="#BDA77B"/></linearGradient><pattern id="weave" width="28" height="28" patternUnits="userSpaceOnUse"><path d="M0 14L14 0L28 14L14 28Z" fill="none" stroke="#B5D8BA" stroke-opacity=".09"/></pattern><radialGradient id="room"><stop stop-color="#10282C"/><stop offset="1" stop-color="#07141B"/></radialGradient></defs><rect width="1200" height="${height}" rx="22" fill="url(#room)"/><rect width="1200" height="${height}" fill="url(#weave)"/><rect x="13" y="13" width="1174" height="${height-26}" rx="18" fill="none" stroke="url(#brass)" stroke-width="4"/><rect x="23" y="23" width="1154" height="${height-46}" rx="13" fill="none" stroke="#C6A360" opacity=".48"/>${[0,1].map(i=>`<g transform="translate(${i?1200:0} 0) scale(${i?-1:1} 1)" fill="none" stroke="${gold}" opacity=".7"><path d="M36 107V36H121M42 116V43H129M36 ${height-107}V${height-36}H121"/><path d="M36 76L57 55L77 36M43 93L67 69L93 43" stroke-width="2"/></g>`).join('')}${member}${text(665,48,'ANGRIER JORDAN · THE EMERALD ROOM',17,gold)}${fit(650,94,data.title,830,46,gold,'Space Grotesk')}${fit(600,134,data.subtitle,1060,28,data.net?.startsWith('-')?'#F7AAA9':mint)}<path d="M80 152H1120" stroke="url(#brass)"/>${body}${v.kind==='rules'?text(600,height-20,'SIT. PLAY. BELONG.',17,gold):''}</svg>`;
}
