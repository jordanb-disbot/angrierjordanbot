import {ink,panel,shell} from '../../features-events/src/visual.js';
import {centeredHeading,centeredBlock,portrait} from '../../features-events/src/gate-b-visual.js';
export interface SpotlightRenderInput {
 weekStart:string;weekEnd:string;activeMembers:number;messages:number;words:number;voiceSeconds:number;
 categories:{title:string;winners:{name:string;avatarData:string;total:string;lifetimeWins:number;status:string;tripleThreat:boolean}[]}[];
}
export function renderSpotlight(data:SpotlightRenderInput):string{
 const head=centeredHeading('ANGRIER JORDAN · WEEKLY HONORS','Weekly Spotlight',data.weekStart+' — '+data.weekEnd+' · Mountain');let body=head.svg,y=head.height;
 for(const [ci,category]of data.categories.entries()){
  const title=centeredBlock(category.title,y+22,{size:20,color:ink.gold,weight:600});body+=title.svg;y+=title.height+28;
  if(!category.winners.length){body+=panel(18,y,404,60,ink.teal)+centeredBlock('No qualifying winner',y+36,{size:16,color:ink.muted}).svg;y+=72;}
  for(let index=0;index<category.winners.length;index+=2){
   const row=category.winners.slice(index,index+2),cols=row.map((winner,col)=>{
    const cx=row.length===1?220:122+col*196,width=row.length===1?360:168;let inner=100,svg=portrait('spotlight-'+ci+'-'+(index+col),winner.name,winner.avatarData,cx,y+14,68);
    for(const [value,size,color,weight]of [[winner.name,18,ink.white,600],[winner.total,19,ink.gold,700],[winner.status+' · '+winner.lifetimeWins+' lifetime wins',12,ink.muted,400],...(winner.tripleThreat?[['TRIPLE THREAT · PERMANENT',12,ink.gold,600]]:[])] as [string,number,string,number][]){const block=centeredBlock(value,y+inner,{size,color,weight,width,gap:7,cx});svg+=block.svg;inner+=block.height;}
    return{svg,height:inner+5};
   });
   const height=Math.max(...cols.map(c=>c.height));body+=panel(18,y,404,height,row.some(w=>w.tripleThreat)?ink.gold:ink.teal)+cols.map(c=>c.svg).join('');y+=height+12;
  }
 }
 const totals=centeredBlock([data.activeMembers+' active members',data.messages+' messages · '+data.words+' words',data.voiceSeconds+' qualifying voice seconds'].join('\n'),y+53,{size:15,width:368,gap:0});
 const height=totals.height+64;body+=panel(18,y,404,height,ink.gold)+centeredBlock('SERVER TOTALS',y+25,{size:11,color:ink.warm}).svg+totals.svg;return shell(y+height+18,body);
}
export interface RecordRenderInput {scope:string;title?:string;records:{title:string;memberName:string;avatarData?:string;amount:string;achievedAt:string;supporting?:string}[];}
export const recordTitle=(key:string)=>key.replaceAll('_',' ').replaceAll('.',' · ').replace(/\b\w/g,c=>c.toUpperCase());
export function renderRecords(data:RecordRenderInput):string{
 const head=centeredHeading('ANGRIER JORDAN · HALL OF RECORDS',data.title??'Server Records',data.scope);let body=head.svg,y=head.height;
 if(!data.records.length){body+=panel(18,y,404,76,ink.teal)+centeredBlock('No records yet.',y+45,{size:18,color:ink.muted}).svg;y+=90;}
 for(const [index,r]of data.records.entries()){
  let content=portrait('record-'+index,r.memberName,r.avatarData,220,y+16,76),inner=y+119;
  for(const [value,size,color,weight]of [[r.memberName,20,ink.white,600],[r.title,19,ink.warm,600],[r.amount,23,ink.gold,700],['Set '+r.achievedAt,13,ink.muted,400],...(r.supporting?[[r.supporting,14,ink.muted,400]]:[])]as[string,number,string,number][]){const block=centeredBlock(value,inner,{size,color,weight,width:368,gap:8});content+=block.svg;inner+=block.height;}
  body+=panel(18,y,404,inner-y+4,ink.gold)+content;y=inner+18;
 }return shell(y+8,body);
}
/** Inputs are already privacy-filtered before presentation. */
export function renderProfile(data:{name:string;avatarData?:string;sections:{label:string;value:string}[]}):string{
 const head=centeredHeading('ANGRIER JORDAN · MEMBER PROFILE','A Seat in the Chairs','');let body=head.svg,y=head.height;
 const name=centeredBlock(data.name,y+124,{size:22,color:ink.warm,weight:600});body+=panel(18,y,404,136+name.height,ink.gold)+portrait('profile',data.name,data.avatarData,220,y+16,84)+name.svg;y+=148+name.height;
 for(const section of data.sections){const label=centeredBlock(section.label.toUpperCase(),y+26,{size:12,color:ink.warm,weight:600}),value=centeredBlock(section.value,y+26+label.height,{size:15,width:368,gap:0}),height=36+label.height+value.height;body+=panel(18,y,404,height,ink.teal)+label.svg+value.svg;y+=height+12;}
 return shell(y+8,body);
}
