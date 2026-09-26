import {ink,panel,shell} from '../../features-events/src/visual.js';
import {centeredHeading,centeredBlock,portrait} from '../../features-events/src/gate-b-visual.js';
export interface CasinoResultRenderInput {title:string;memberName?:string;avatarData?:string;subtitle:string;amount:string;amountLabel:string;details:{label:string;value:string}[];}
export function renderCasinoResult(data:CasinoResultRenderInput):string{
 const head=centeredHeading('ANGRIER JORDAN · CASINO',data.title,data.subtitle);let body=head.svg,y=head.height,content='',inner=y+26;
 if(data.memberName){content+=portrait('casino-member',data.memberName,data.avatarData,220,inner-10,84);inner+=99;const name=centeredBlock(data.memberName,inner,{size:20,color:ink.warm,weight:600});content+=name.svg;inner+=name.height;}
 const label=centeredBlock(data.amountLabel.toUpperCase(),inner,{size:11,color:ink.muted,gap:10});content+=label.svg;inner+=label.height;
 const amount=centeredBlock(data.amount,inner,{size:24,color:ink.gold,weight:700,width:372,gap:2});content+=amount.svg;inner+=amount.height;
 const unit=centeredBlock('Ottomans',inner,{size:13,color:ink.muted,gap:0});content+=unit.svg;inner+=unit.height;
 body+=panel(18,y,404,inner-y+12,ink.gold)+content;y=inner+24;
 for(const detail of data.details){const label=centeredBlock(detail.label.toUpperCase(),y+24,{size:11,color:ink.warm,gap:8}),value=centeredBlock(detail.value,y+24+label.height,{size:16,width:368,gap:0}),height=34+label.height+value.height;body+=panel(18,y,404,height,ink.teal)+label.svg+value.svg;y+=height+12;}
 body+=centeredBlock('Angrier Jordan · Chairs',y+12,{size:11,color:ink.muted}).svg;return shell(y+32,body);
}
