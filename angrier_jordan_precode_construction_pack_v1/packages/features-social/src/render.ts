import {portrait} from '../../features-events/src/gate-b-visual.js';
import {ink,panel,shell,text} from '../../features-events/src/visual.js';
import {wrapText} from '../../renderer/src/text-layout.js';

export interface SocialPortrait {id:string;name:string;avatarData?:string;}
const accentFor=(action:string)=>action==='roast'?'#EF4444':action==='compliment'?'#10B981':action.startsWith('haiku')?'#38BDF8':'#A469E2';
/** Short public reactions share the house frame, with a rotating semantic accent and real member portraits when supplied. */
export function renderSocialResponse(action:string,content:string,names:Readonly<Record<string,string>>={},people:readonly SocialPortrait[]=[]){
 const copy=content.replace(/<@!?(\d+)>/g,(_match,id:string)=>names[id]??'Member');
 const accent=accentFor(action),title=action==='roast'?'Roast':action==='haiku.passive'?'Haiku detected':'Chairs · '+action.replaceAll('_',' ');
 const members=people.slice(0,2),size=copy.length>175?30:36,lines=wrapText(copy,1040,size),lineHeight=Math.ceil(size*1.34);
 const contentTop=members.length?338:177,contentHeight=Math.max(126,lines.length*lineHeight+54),height=contentTop+contentHeight+76;
 let body=`<rect width="1200" height="${height}" fill="#06141E" opacity=".56"/>`;
 body+=text(600,52,'ANGRIER JORDAN · CHAIRS',22,ink.warm,'text-anchor="middle" font-family="Space Grotesk" font-weight="700" letter-spacing="3"');
 body+=text(600,116,title.toUpperCase(),49,ink.white,'text-anchor="middle" font-family="Space Grotesk" font-weight="700"');
 body+=`<path d="M72 139H1128" stroke="${accent}" stroke-width="3"/>`;
 for(const [n,member] of members.entries()){
  const cx=members.length===1?600:n?780:420;
  body+=portrait('social-'+n,member.name,member.avatarData,cx,151,126);
  body+=text(cx,312,member.name,32,ink.white,'text-anchor="middle" font-family="Space Grotesk" font-weight="700"');
 }
 body+=panel(42,contentTop,1116,contentHeight,accent);
 for(const [n,line] of lines.entries())body+=text(600,contentTop+49+n*lineHeight,line,size,ink.white,'text-anchor="middle" font-family="Inter" font-weight="600"');
 body+=text(600,height-26,'A MOMENT IN THE LOUNGE',20,accent,'text-anchor="middle" font-family="Space Grotesk" font-weight="700" letter-spacing="2"');
 return shell(height,body,0,1200).replace('stroke="#00D7CF"',`stroke="${accent}"`);
}
