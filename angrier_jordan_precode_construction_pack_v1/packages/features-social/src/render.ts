import {brandedNotice} from '../../features-events/src/gate-b-visual.js';
import {ink} from '../../features-events/src/visual.js';
/** All public social cards inherit the approved Gate B frame, typography and centered wrapping. */
export function renderSocialResponse(action:string,content:string,names:Readonly<Record<string,string>>={}){
 const text=content.replace(/<@!?(\d+)>/g,(_match,id:string)=>names[id]??'Member');
 return brandedNotice(action==='roast'?'Roast':action==='haiku.passive'?'Haiku detected':'Chairs · '+action,text,'ANGRIER JORDAN · CHAIRS',ink.teal);
}
