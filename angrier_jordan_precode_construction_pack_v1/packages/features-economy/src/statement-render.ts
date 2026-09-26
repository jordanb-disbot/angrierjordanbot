import {readFileSync} from 'node:fs';
import {wrapText} from '../../renderer/src/text-layout.js';
import type {StatementView} from './types.js';
let lounge:string|undefined;
const escape=(s:string)=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const fmt=(n:bigint)=>n.toLocaleString('en-US');
const text=(x:number,y:number,s:string,size=32,color='#EFF5F2',heading=false)=>`<text x="${x}" y="${y}" text-anchor="middle" font-family="${heading?'Cinzel':'Poppins'}" font-size="${size}" font-weight="700" fill="${color}">${escape(s)}</text>`;
const panel=(y:number,h:number,color='#DDB96E')=>`<rect x="30" y="${y}" width="1140" height="${h}" rx="18" fill="url(#glass)" stroke="${color}" stroke-width="2"/><path d="M45 ${y+45}V${y+15}H80M1120 ${y+h-15}H1155V${y+h-45}" stroke="#F2CF86" stroke-width="3" fill="none"/>`;
/** All statement values remain in the artwork; exact amounts are never abbreviated. */
export function renderStatement(s:StatementView,page=0,pages=1):string {
 let body=text(600,48,'ANGRIER JORDAN · THE LOUNGE LEDGER',25,'#40D1BA')+text(600,107,'Ottoman Statement',46,'#F2CF86',true)+text(600,151,'BANK TIER '+s.account.bankTier+' · ALL AMOUNTS IN OTTOMANS',26,'#C3D4D4');
 let y=177;
 const totals=[['Wallet',s.account.wallet,'#F2CF86'],['Bank',s.account.bank,'#40D1BA'],['Liquid net worth',s.liquidNetWorth,'#BAA4EC']] as const;
 const values=totals.map(([label,value,color],n)=>({label,color,x:220+n*380,lines:wrapText(fmt(value),335,38)}));
 const h=Math.max(...values.map(v=>v.lines.length))*47+95;
 body+=panel(y,h);
 values.forEach(v=>{body+=text(v.x,y+40,v.label,29,v.color);v.lines.forEach((l,n)=>body+=text(v.x,y+91+n*47,l,38));});
 y+=h+28;body+=text(600,y+29,'Recent Transactions · '+(page+1)+' / '+pages,34,'#F2CF86',true);y+=55;
 if(!s.entries.length){body+=panel(y,150,'#40D1BA')+text(600,y+85,'No transactions yet.',36);y+=174;}
 for(const [i,e] of s.entries.entries()){
  const amount=(e.amount>0n?'+':'')+fmt(e.amount),color=e.amount<0n?'#F2A09A':'#66DFBA';
  const reason=wrapText(e.reason.replaceAll('_',' '),660,30),amountLines=wrapText(amount,365,33),date=e.createdAt.toISOString().slice(0,16).replace('T',' ')+' UTC';
  const rh=Math.max(reason.length*40+57,amountLines.length*42+28);
  body+=panel(y,rh,i%2?'#A897D1':'#36BCAA');
  reason.forEach((l,n)=>body+=text(395,y+43+n*40,l,30));body+=text(395,y+40+reason.length*40,date,23,'#C3D4D4');
  amountLines.forEach((l,n)=>body+=text(960,y+rh/2-(amountLines.length-1)*21+12+n*42,l,33,color));y+=rh+12;
 }
 const height=y+70;body+=text(600,y+42,'SIT. PLAY. BELONG.',23,'#F2CF86');
 return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="${height}" viewBox="0 0 1200 ${height}"><defs><linearGradient id="glass" x2="0" y2="1"><stop stop-color="#193B45" stop-opacity=".97"/><stop offset="1" stop-color="#07121F" stop-opacity=".97"/></linearGradient></defs><image href="${lounge??='data:image/png;base64,'+readFileSync(new URL('../../../production/event_art/v5/lounge-stage-runtime.png',import.meta.url)).toString('base64')}" width="1200" height="${height}" preserveAspectRatio="xMidYMid slice"/><rect width="1200" height="${height}" fill="#071320" opacity=".55"/>${body}<rect x="5" y="5" width="1190" height="${height-10}" rx="22" fill="none" stroke="#31BFAE" stroke-width="3"/><rect x="15" y="15" width="1170" height="${height-30}" rx="16" fill="none" stroke="#DDB96E" stroke-width="2"/></svg>`;
}
