import {wrapText} from '../../../../packages/renderer/src/text-layout.js';
import {ink,panel,shell,text} from '../../../../packages/features-events/src/visual.js';

const plain=(value:string)=>value.replaceAll('**','').replaceAll('__','').replaceAll('`','').replace(/\[([^\]]+)\]\([^)]*\)/g,'$1').replace(/<@!?[^>]+>/g,'Member').replace(/<#[^>]+>/g,'Channel');

/** A compact, staff-only record: legible at Discord widths without reusing the member-facing cards. */
export function renderActivityCard(title:string,body:string,accent:string){
 const width=1200,copy=plain(body),rows=wrapText(copy,1052,30),lineHeight=42,contentHeight=Math.max(192,rows.length*lineHeight+82),height=contentHeight+204;
 const lines=rows.map((row,index)=>text(74,202+index*lineHeight,row,30,ink.white,'font-weight="500"')).join('');
 const header=`<rect x="30" y="28" width="1140" height="116" rx="20" fill="#06131C" fill-opacity=".86" stroke="${accent}" stroke-opacity=".82" stroke-width="2"/><rect x="54" y="55" width="14" height="62" rx="7" fill="${accent}"/><text x="94" y="73" font-size="20" fill="${accent}" letter-spacing="3" font-family="Space Grotesk" font-weight="700">ANGRIER JORDAN · STAFF ACTIVITY</text>${text(94,116,title,42,ink.white,'font-family="Space Grotesk" font-weight="700"')}`;
 const detail=panel(30,166,1140,contentHeight,accent)+`<path d="M58 220H1142" stroke="${accent}" stroke-opacity=".28"/>`+lines+text(74,height-28,'ADMIN-ONLY LOG · SERVER ACTIVITY',19,ink.muted,'letter-spacing="2" font-family="Space Grotesk" font-weight="600"');
 return shell(height,header+detail,0,width);
}
