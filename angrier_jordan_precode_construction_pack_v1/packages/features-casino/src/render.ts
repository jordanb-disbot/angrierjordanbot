import {heading,ink,panel,shell,text} from '../../features-events/src/visual.js';
import {wrapText} from '../../renderer/src/text-layout.js';
export interface CasinoResultRenderInput {
 title:string; memberName?:string; subtitle:string; amount:string; amountLabel:string;
 details:{label:string;value:string}[];
}
/** Shared production card: values come from saved state. */
export function renderCasinoResult(data:CasinoResultRenderInput):string {
 let y=246,body=heading('CHAIRS · CASINO',data.title,data.subtitle);
 body+=panel(18,134,404,94,ink.gold)+text(34,158,data.amountLabel.toUpperCase(),11,ink.warm,'letter-spacing="1.1"');
 body+=text(34,192,data.amount,24,ink.white,'font-family="Space Grotesk" font-weight="700"')+text(34,214,'Ottomans',13,ink.muted);
 for(const item of [...(data.memberName?[{label:'MEMBER',value:data.memberName}]:[]),...data.details]){const wrapped=wrapText(item.value,372,16),height=45+wrapped.length*21;body+=panel(18,y,404,height,ink.slate)+text(34,y+23,item.label.toUpperCase(),11,ink.warm);wrapped.forEach((line,n)=>body+=text(34,y+47+n*21,line,16));y+=height+12;}
 body+=text(22,y+16,'Angrier Jordan · Chairs',12,ink.muted);
 return shell(y+38,body);
}
