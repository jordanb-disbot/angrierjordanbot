import {wrapText,truncateText} from '../../renderer/src/text-layout.js';
import {shell,panel,ink} from '../../features-events/src/visual.js';
import {centeredBlock,portrait} from '../../features-events/src/gate-b-visual.js';
import type {CommunityView} from './prisma-repository.js';


/** Restrained amber lounge plates; shared reference art stays immutable. */
function communityHeading(kicker:string,title:string,subtitle:string){
 let y=35,svg='';
 for(const [value,size,color]of [[kicker,13,'#FFD38A'],[title,36,ink.white],[subtitle,18,ink.warm]] as const){
  const block=centeredBlock(value,y,{size,color,width:536,cx:300,weight:700,gap:12});
  svg+='<g font-family="Space Grotesk">'+block.svg+'</g>';y+=block.height;
 }
 return{svg,height:y+8};
}
function communityShell(height:number,body:string){
 const ornament='<rect x="8" y="8" width="584" height="'+(height-16)+'" rx="12" fill="none" stroke="#F4C542" stroke-opacity=".55"/><path d="M22 58V22H58M542 22H578V58M22 '+(height-58)+'V'+(height-22)+'H58M542 '+(height-22)+'H578V'+(height-58)+'" fill="none" stroke="#F4C542" stroke-width="2"/>';
 return shell(height,ornament+body,0,600)
  .replace('width="600" height="'+height+'"','width="1200" height="'+height*2+'"')
  .replace(/<linearGradient id="glass"[\s\S]*?<\/linearGradient>/,'<linearGradient id="glass" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#3A2D22" stop-opacity=".94"/><stop offset=".35" stop-color="#171E2C" stop-opacity=".94"/><stop offset="1" stop-color="#090F1B" stop-opacity=".98"/></linearGradient>')
  .replace(/<linearGradient id="shade"[\s\S]*?<\/linearGradient>/,'<linearGradient id="shade" x2="1" y2="1"><stop stop-color="#362416" stop-opacity=".50"/><stop offset=".5" stop-color="#0B1220" stop-opacity=".35"/><stop offset="1" stop-color="#1B1714" stop-opacity=".85"/></linearGradient>')
  .replace('stroke="#00D7CF"','stroke="#F59E0B"');
}

/** Shared private confirmations/errors keep the same Community material. */
export function renderCommunityNotice(title:string,message:string){
 const head=communityHeading('ANGRIER JORDAN · COMMUNITY',title,''),copy=centeredBlock(message,head.height+34,{size:22,color:ink.white,width:500,cx:300,weight:600});
 return communityShell(head.height+copy.height+68,head.svg+panel(18,head.height,564,copy.height+48,'#F59E0B')+copy.svg);
}
const giveawayCounts=(v:CommunityView)=>{const winners=v.state==='CLOSED'?v.winners?.length??0:v.winnerCount;return `${winners} ${winners===1?'winner':'winners'} · ${v.entryCount} ${v.entryCount===1?'entry':'entries'}`;};
export const COMMUNITY_TITLES={poll:'Community Poll',superlatives:'Superlatives',suggest:'Suggestion',ama:'Ask Me Anything',giveaway:'Giveaway'};
export function communityTranscript(v:CommunityView){const out=[COMMUNITY_TITLES[v.kind],v.title];if(v.kind==='superlatives'){out.push(`Season ${v.season} · ${v.phase}`);for(const c of v.categories)out.push(c.name,c.winner?'Winner: '+c.winner.name:c.finalists.length?'Finalists: '+c.finalists.map(m=>m.name).join(', '):v.phase==='closed'?'No nominations received.':'Nominations open.');out.push('Permanent season badges · no Ottoman prizes.');}for(const c of v.choices)out.push(`${c.id}. ${c.label}${v.results?' · '+(v.results[c.id]??0)+' votes':''}`);if(v.kind==='giveaway'){out.push(`Prize per winner: ${v.prize?.label}`,giveawayCounts(v),`Entry: ${v.fee==='0'?'free':v.fee+' Ottomans · fees removed from circulation'}`);if(v.winners)out.push(v.winners.length?'Winners: '+v.winners.map(m=>m.name).join(', '):'No entries received.');if(v.status==='FULFILLMENT_PENDING')out.push('Custom reward fulfillment is pending with the organizer.');}if(v.status)out.push('Status: '+v.status);if(v.answer)out.push('Answer: '+v.answer);if(v.submitterName)out.push('Submitted by '+v.submitterName);if(v.ballots?.length)out.push('Named ballots:',...v.ballots.map(b=>b.memberId+': '+b.choices.map(id=>v.choices.find(c=>c.id===id)?.label??id).join(' > ')));return out.join('\n');}
/** Public member art is supplied separately; anonymous voters and authors never enter this map. */
export type CommunityPortraits=Record<string,string>;
export function renderCommunity(v:CommunityView,avatars:CommunityPortraits={}){
 const singleWinner=v.kind==='superlatives'&&v.phase==='closed'&&v.categories.length===1&&Boolean(v.categories[0]?.winner);
 const h=communityHeading('ANGRIER JORDAN · COMMUNITY',COMMUNITY_TITLES[v.kind],v.kind==='superlatives'?`Season ${v.season} · ${v.phase==='closed'?singleWinner?'The winner':v.categories.some(c=>c.winner)?'The winners':'No winners':v.phase}`:v.state==='CLOSED'?'The result is in':v.kind==='poll'&&v.ranked?'Rank your choices · best first':'A voice in the lounge');
 let body=h.svg,y=h.height;
 const section=(draw:(add:(value:string,color?:string,size?:number,limit?:number)=>void,member:(id:string,name:string,hero?:boolean)=>void)=>void,accent='#F59E0B')=>{
  const top=y;let content='';y+=30;
  const add=(value:string,color=ink.white,size=22,limit=12)=>{const all=wrapText(value,500,size),visible=all.slice(0,limit);if(all.length>limit)visible[limit-1]=truncateText(visible[limit-1]+'…',500,size);const b=centeredBlock(visible.join('\n'),y,{size,color,width:500,cx:300,weight:600});content+=b.svg;y+=b.height;if(all.length>limit){const note=centeredBlock('Use Details for the complete text.',y,{size:16,color:ink.muted,width:500,cx:300});content+=note.svg;y+=note.height;}};
  const member=(id:string,name:string,hero=false)=>{const size=hero?142:96,nameSize=hero?Array.from(name).length<=16?40:28:21;content+=portrait('community-'+id+'-'+top,name,avatars[id],300,y-8,size);y+=size+nameSize+8;add(name,hero?ink.white:ink.warm,nameSize,10);};
  draw(add,member);y+=9;body+=panel(18,top,564,y-top,accent)+content;y+=14;
 };
 if(v.kind==='superlatives')for(const c of v.categories)section((add,member)=>{add(c.name,ink.warm,25);if(c.winner){member(c.winner.id,c.winner.name,singleWinner);add('SEASON BADGE EARNED',ink.emerald,17);add('Saved to the member’s profile',ink.white,19);}else if(c.finalists.length){for(const m of c.finalists)member(m.id,m.name);}else add(v.phase==='closed'?'No nominations received':'Nominate another member',ink.white,22);},ink.gold);
 else section((add,member)=>{add(v.title,ink.warm,26,8);if(!v.anonymous&&v.submitterName&&v.status!=='DECLINED'){if(v.ownerId)member(v.ownerId,v.submitterName);else add('By '+v.submitterName,ink.muted,15);}for(const c of v.choices)add(`${c.id}. ${c.label}${v.results?' · '+(v.results[c.id]??0)+' votes':''}`,v.winnerId===c.id?ink.emerald:ink.white,22);if(v.answer)add(v.answer,ink.emerald,22,10);if(v.kind==='giveaway'){add(giveawayCounts(v),ink.emerald);add(v.fee==='0'?'Free entry':v.fee+' Ottomans per entry',ink.white);for(const m of v.winners??[])member(m.id,m.name,(v.winners?.length??0)===1);if(v.status==='FULFILLMENT_PENDING')add('Organizer fulfillment pending',ink.muted,14);}if(v.status)add(v.status.replaceAll('_',' '),['DECLINED','FULFILLMENT_PENDING','REVIEWING'].includes(v.status)?ink.warm:ink.emerald,15);});
 const label=v.kind==='superlatives'?v.phase==='closed'?singleWinner?'Permanent season badge awarded':v.categories.some(c=>c.winner)?'Permanent season badges awarded':'No nominations · no badges awarded':'Anonymous nominations and ballots':v.kind==='giveaway'?v.state==='CLOSED'?v.status==='FULFILLMENT_PENDING'?'Draw saved · organizer fulfillment pending':v.winners?.length?'Draw saved · rewards recorded':'No entries · no prizes awarded':'One entry per member · fees are removed':v.hidden&&v.state==='OPEN'?'Results stay hidden until close':v.anonymous?'Anonymous to members':'Member choices are recorded';
 section(add=>{add(label,ink.warm,19);add(v.kind==='superlatives'?v.phase==='closed'?`Season ${v.season} · No Ottoman prize`:'48 hours for nominations · 48 hours for voting':'Use the controls below.',ink.muted,16);},ink.gold);
 return communityShell(y+6,body);
}
export function superlativeReviewFixture():CommunityView{return{id:'superlative-review',guildId:'fixture',channelId:'fixture',messageId:'fixture',ownerId:null,state:'CLOSED',version:12,expiresAt:new Date('2026-09-25T12:00:00Z'),kind:'superlatives',phase:'closed',round:1,title:'Superlatives · Season 1',anonymous:true,hidden:true,ranked:false,choices:[],categories:[{id:'1',name:'Most Likely to Bring a Spare Chair',finalists:[{id:'fixture-winner',name:'Morgan'}],winner:{id:'fixture-winner',name:'Morgan'}}],season:1,status:undefined,submitterName:undefined,answer:undefined,prize:undefined,fee:undefined,winnerCount:undefined,winners:undefined,entryCount:7,results:undefined,winnerId:undefined};}
