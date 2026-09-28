import {readFileSync} from 'node:fs';
import {wrapText} from '../../renderer/src/text-layout.js';
import type {WyrRuntimeSession,WyrResults} from './types.js';
const C={blue:'#3B82F6',gold:'#F4C542',white:'#E6EAF0',muted:'#B4C8CA',emerald:'#10B981'};
let lounge:string|undefined;
const esc=(s:string)=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const text=(s:string,x:number,y:number,size=30,color:string=C.white,title=false)=>`<text x="${x}" y="${y}" text-anchor="middle" fill="${color}" font-family="${title?'Space Grotesk':'Inter'}" font-weight="700" font-size="${size}">${esc(s)}</text>`;
function lines(s:string,x:number,y:number,width:number,size=32,color:string=C.white){const rows=wrapText(s,width,size);return{svg:rows.map((r,n)=>text(r,x,y+n*Math.ceil(size*1.4),size,color)).join(''),height:rows.length*Math.ceil(size*1.4)};}
const panel=(x:number,y:number,w:number,h:number,accent:string)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="24" fill="url(#leather)" stroke="${accent}" stroke-width="3"/><rect x="${x+9}" y="${y+9}" width="${w-18}" height="${h-18}" rx="17" fill="none" stroke="${accent}" opacity=".28"/><path d="M${x+28} ${y+12}H${x+w-28}" stroke="#E6EAF0" stroke-opacity=".2" stroke-width="2"/><path d="M${x+18} ${y+65}V${y+18}H${x+75}M${x+w-75} ${y+h-18}H${x+w-18}V${y+h-65}" fill="none" stroke="url(#brass)" stroke-width="4"/>`;
function render(s:WyrRuntimeSession,result?:WyrResults){
 lounge??='data:image/png;base64,'+readFileSync(new URL('../../../production/event_art/v5/lounge-stage-runtime.png',import.meta.url)).toString('base64');
 const question=lines(s.data.question,600,190,1080,34),top=206+question.height;
 const choices=[s.data.optionA,s.data.optionB].map((label,n)=>lines(label,n?885:315,top+110,440,34)),height=Math.max(255,...choices.map(c=>c.height+155))+(result?108:0);
 let body=text('ANGRIER JORDAN · THE GAMES LOUNGE',600,48,23,C.blue)+text('WOULD YOU RATHER',600,110,48,C.gold,true)+text(s.data.category.toUpperCase()+' · '+(result?'THE ROOM HAS SPOKEN':'PICK YOUR SIDE'),600,150,25,C.muted)+question.svg;
 for(let n=0;n<2;n++){const x=n?625:55,accent=n?C.gold:C.blue,key=n?'B':'A',votes=result?(n?result.B:result.A):0,pct=result?.total?Math.round(votes/result.total*100):0,winner=result?.winner===key;body+=panel(x,top,520,height,winner?C.emerald:accent)+text('CHOICE '+key,x+260,top+49,28,accent,true)+choices[n]!.svg;
 if(result)body+=`<rect x="${x+40}" y="${top+height-100}" width="440" height="16" rx="8" fill="#0B1220"/><rect x="${x+40}" y="${top+height-100}" width="${440*pct/100}" height="16" rx="8" fill="${winner?C.emerald:accent}"/>`+text(pct+'% · '+votes+' votes',x+260,top+height-45,36,winner?C.emerald:C.white);
 else body+=text(n?'CHOOSE RIGHT':'CHOOSE LEFT',x+260,top+height-42,25,accent);
 }
 body+=`<circle cx="600" cy="${top+height/2}" r="33" fill="#0B1220" stroke="${C.gold}" stroke-width="2"/>`+text('OR',600,top+height/2+9,22,C.gold);
 const y=top+height+26,summary=result?(result.winner==='NONE'?'No votes cast':result.winner==='TIE'?'A split decision':'Choice '+result.winner+' wins'):'ANONYMOUS · EDITABLE · TOTALS HIDDEN',detail=result?result.total+' total votes · Play Again for a fresh question':'Closes '+s.expiresAt.toISOString().slice(11,19)+' UTC · '+(s.extensionUsed?'Extension used':s.data.extensionSeconds?'Host may extend once by '+s.data.extensionSeconds+'s':'No extension');
 body+=panel(55,y,1090,143,result?C.gold:C.blue)+text(summary,600,y+55,result?38:29,result?C.gold:C.white,true)+text(detail,600,y+105,25,C.muted);
 const total=y+215;return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="${total}" viewBox="0 0 1200 ${total}"><defs><linearGradient id="leather" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#26313B" stop-opacity=".94"/><stop offset=".32" stop-color="#18232D" stop-opacity=".97"/><stop offset=".65" stop-color="#101C26" stop-opacity=".96"/><stop offset="1" stop-color="#071521" stop-opacity=".98"/></linearGradient><linearGradient id="brass"><stop stop-color="#374151"/><stop offset=".48" stop-color="#F4C542"/><stop offset="1" stop-color="#FFE29A"/></linearGradient></defs><image href="${lounge}" width="1200" height="${total}" preserveAspectRatio="xMidYMid slice"/><rect width="1200" height="${total}" fill="#0B1220" opacity=".45"/>${body}<rect x="8" y="8" width="1184" height="${total-16}" rx="28" fill="none" stroke="${C.blue}" stroke-width="3"/><rect x="20" y="20" width="1160" height="${total-40}" rx="20" fill="none" stroke="url(#brass)" stroke-width="2"/>${text('SIT. PLAY. BELONG.',600,total-25,22,C.gold)}</svg>`;
}
/** Stable deadline artwork; Discord's native timestamp supplies the moving countdown. */
export function renderWyrOpen(session:WyrRuntimeSession,_remainingSeconds:number){return render(session);}
export function renderWyrResults(session:WyrRuntimeSession,results:WyrResults){return render(session,results);}
