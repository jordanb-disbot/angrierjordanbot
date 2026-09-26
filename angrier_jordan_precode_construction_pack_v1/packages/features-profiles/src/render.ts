import {heading,ink,panel,shell,text} from '../../features-events/src/visual.js';
import {wrapText} from '../../renderer/src/text-layout.js';
export interface SpotlightRenderInput {
 weekStart:string;weekEnd:string;activeMembers:number;messages:number;words:number;voiceSeconds:number;
 categories:{title:string;winners:{name:string;avatarData:string;total:string;lifetimeWins:number;status:string;tripleThreat:boolean}[]}[];
}
/** Frozen totals and resolved Discord identities in the approved lounge shell. */
export function renderSpotlight(data:SpotlightRenderInput):string{
 let y=136,body=heading('CHAIRS · WEEKLY HONORS','Weekly Spotlight',data.weekStart+' — '+data.weekEnd+' · Mountain');
 for(const category of data.categories){
  body+=text(24,y+22,category.title,21,ink.gold,'font-family="Space Grotesk" font-weight="600"');y+=36;
  if(!category.winners.length){body+=panel(18,y,404,62,ink.slate)+text(34,y+37,'No qualifying winner',16,ink.muted);y+=74;}
  for(const w of category.winners){
   if(!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(w.avatarData))throw new Error('Spotlight requires a resolved avatar image.');
   const nameLines=wrapText(w.name,300,18),statusLines=wrapText(w.status+' · '+w.lifetimeWins+' lifetime wins',372,13),height=96+(nameLines.length-1)*22+statusLines.length*18+(w.tripleThreat?36:0);
   body+=panel(18,y,404,height,w.tripleThreat?ink.gold:ink.teal)+`<image x="32" y="${y+17}" width="52" height="52" href="${w.avatarData}"/>`;
   nameLines.forEach((line,n)=>body+=text(98,y+37+n*22,line,18,ink.white,'font-weight="600"'));
   const totalY=y+62+(nameLines.length-1)*22;body+=text(98,totalY,w.total,17,ink.gold);
   statusLines.forEach((line,n)=>body+=text(32,totalY+27+n*18,line,13,ink.muted));
   if(w.tripleThreat)body+=text(32,y+height-17,'TRIPLE THREAT · PERMANENT',13,ink.gold,'font-family="Space Grotesk" font-weight="700"');
   y+=height+12;
  }
  y+=8;
 }
 const totals=[data.activeMembers+' active members',data.messages+' messages · '+data.words+' words',data.voiceSeconds+' qualifying voice seconds'].flatMap(value=>wrapText(value,372,15));
 const totalsHeight=48+totals.length*24;
 body+=panel(18,y,404,totalsHeight,ink.slate)+text(34,y+25,'SERVER TOTALS',11,ink.warm);
 totals.forEach((line,n)=>body+=text(34,y+53+n*24,line,15,n===totals.length-1?ink.muted:ink.white));
 return shell(y+totalsHeight+20,body);
}
export interface RecordRenderInput {scope:string;records:{title:string;memberName:string;amount:string;achievedAt:string}[];}
export const recordTitle=(key:string)=>key.replaceAll('_',' ').replaceAll('.',' · ').replace(/\b\w/g,c=>c.toUpperCase());
export function renderRecords(data:RecordRenderInput):string{
 let y=135,body=heading('CHAIRS · HALL OF RECORDS','Server Records',data.scope);
 if(!data.records.length){body+=panel(18,y,404,75,ink.slate)+text(34,y+44,'No records yet.',18,ink.muted);y+=90;}
 for(const r of data.records){const content=[...wrapText(r.title,372,19),...wrapText(r.memberName,372,16),...wrapText(r.amount,372,16),'Set '+r.achievedAt],height=30+content.length*25;body+=panel(18,y,404,height,ink.gold);content.forEach((line,n)=>body+=text(34,y+30+n*25,line,n===0?19:16,n===0?ink.gold:ink.white));y+=height+14;}
 return shell(y+12,body);
}
