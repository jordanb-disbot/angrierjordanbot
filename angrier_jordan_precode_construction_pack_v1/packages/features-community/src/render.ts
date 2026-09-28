import {wrapText} from '../../renderer/src/text-layout.js';
import {shell,panel,text,ink} from '../../features-events/src/visual.js';
import {portrait} from '../../features-events/src/gate-b-visual.js';
import type {CommunityView} from './prisma-repository.js';

const amber='#F5BC60',bright='#FFF3D9',muted='#D5C7B5';
/** Bounded excerpts preserve a landscape message; the complete record stays in Details. */
function copy(value:string,cx:number,y:number,width:number,size=30,color=bright,max=5){
 const lines=wrapText(value,width,size),visible=lines.slice(0,max);
 if(lines.length>max)visible[max-1]=(visible[max-1]??'').replace(/.$/,'')+'…';
 return {svg:visible.map((s,i)=>text(cx,y+i*Math.ceil(size*1.38),s,size,color,'text-anchor="middle" font-weight="600"')).join(''),height:visible.length*Math.ceil(size*1.38),clipped:lines.length>max};
}
function plate(x:number,y:number,w:number,h:number,accent=amber){return panel(x,y,w,h,accent)+`<rect x="${x+7}" y="${y+7}" width="${w-14}" height="${h-14}" rx="8" fill="none" stroke="${accent}" stroke-opacity=".12"/><path d="M${x+16} ${y+34}V${y+16}H${x+42}M${x+w-42} ${y+h-16}H${x+w-16}V${y+h-34}" fill="none" stroke="${accent}" stroke-opacity=".65"/><path d="M${x+32} ${y+h-8}H${x+w-32}" stroke="#FFF3D9" stroke-opacity=".1"/>`;}
function frame(height:number,body:string){
 const detail=`<ellipse cx="600" cy="140" rx="520" ry="250" fill="url(#lamp)" opacity=".25"/><rect x="12" y="12" width="1176" height="${height-24}" rx="14" fill="none" stroke="url(#gold)"/><rect x="20" y="20" width="1160" height="${height-40}" rx="10" fill="none" stroke="${amber}" stroke-opacity=".25"/>`;
 return shell(height,detail+'<g font-family="Inter">'+body+'</g>',0,1200)
 .replace(/<linearGradient id="glass"[\s\S]*?<\/linearGradient>/,'<linearGradient id="glass" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#443322" stop-opacity=".96"/><stop offset=".38" stop-color="#20252D" stop-opacity=".95"/><stop offset="1" stop-color="#090F1B" stop-opacity=".98"/></linearGradient>')
 .replace('stroke="#00D7CF"','stroke="#F5BC60"');
}
function heading(title:string,sub:string){return text(600,51,'ANGRIER JORDAN · THE COMMUNITY LOUNGE',18,amber,'text-anchor="middle" font-weight="700" letter-spacing="2"')+text(600,100,title,40,bright,'text-anchor="middle" font-family="Space Grotesk" font-weight="700"')+text(600,136,sub,22,muted,'text-anchor="middle" font-weight="600"')+'<path d="M60 154H512M688 154H1140" stroke="url(#gold)" stroke-opacity=".6"/><path d="M576 154h48m-37-10v20m26-20v20" stroke="#F5BC60" stroke-opacity=".7"/>';}
function footer(y:number,label:string,note:string){return plate(38,y,1124,85)+text(600,y+33,label,23,amber,'text-anchor="middle" font-weight="700"')+text(600,y+63,note,20,muted,'text-anchor="middle"');}
/** Simple private states use a compact layout, never a wall-sized empty panel. */
export function renderCommunityNotice(title:string,message:string){const body=copy(message,600,210,1040,29,bright,9),h=250+body.height;return frame(h,heading(title,'Your place in the conversation')+plate(38,172,1124,body.height+48)+body.svg);}
export type CommunityPortraits=Record<string,string>;
export function renderCommunity(v:CommunityView,avatars:CommunityPortraits={}){
 const closed=v.state==='CLOSED',award=v.kind==='superlatives',single=award&&v.phase==='closed'&&v.categories.length===1&&Boolean(v.categories[0]?.winner);
 const subtitle=award?`Season ${v.season} · ${v.phase==='closed'?single?'The winner':v.categories.some(c=>c.winner)?'The winners':'No winners':v.phase}`:closed?'The result is in':v.kind==='poll'&&v.ranked?'Rank your choices · best first':'A voice in the lounge';
 let body=heading(COMMUNITY_TITLES[v.kind],subtitle),y=176,clipped=false;
 const block=(value:string,top:number,width=1040,size=32,max=5,cx=600,color=bright)=>{const b=copy(value,cx,top,width,size,color,max);clipped ||= b.clipped;return b;};
 if(award){
  const cats=v.categories.slice(0,4);clipped=v.categories.length>cats.length;
  for(let row=0;row<Math.ceil(cats.length/2);row++){
   const rowCats=cats.slice(row*2,row*2+2),wide=cats.length===1,w=wide?1124:552,h=single?365:330;
   rowCats.forEach((c,col)=>{const x=38+col*572,cx=x+w/2;body+=plate(x,y,w,h);const title=block(c.name,y+40,w-48,27,2,cx,amber);body+=title.svg;
    if(c.winner){const size=single?142:102,py=y+89;body+=portrait('community-winner-'+row+'-'+col,c.winner.name,avatars[c.winner.id],cx,py,size);body+=block(c.winner.name,py+size+40,w-55,single?40:30,2,cx).svg;body+=text(cx,y+h-24,'SEASON BADGE EARNED',21,ink.emerald,'text-anchor="middle" font-weight="700"');}
    else if(c.finalists.length){const finalists=c.finalists.slice(0,5),space=(w-35)/finalists.length;finalists.forEach((m,i)=>{const mx=x+18+space*(i+.5);body+=portrait('community-finalist-'+row+'-'+col+'-'+i,m.name,avatars[m.id],mx,y+115,Math.min(82,space-15));body+=block(m.name,y+230,space-12,20,3,mx).svg;});}
    else body+=block(v.phase==='closed'?'No nominations received':'Nominate another member',y+180,w-65,30,3,cx).svg;
   });y+=h+16;
  }
 }else{
  const declined=v.kind==='ama'&&v.status==='DECLINED',prompt=block(declined?'This question was declined.':v.kind==='giveaway'?v.prize?.label??v.title:v.title,y+48,1040,34,4),ph=Math.max(116,prompt.height+42);
  body+=plate(38,y,1124,ph)+prompt.svg;y+=ph+14;
  if((v.kind==='suggest'||v.kind==='ama')&&!declined){
   const identity=v.anonymous?'Anonymous member':v.submitterName??'Community member';body+=plate(38,y,1124,110);
   if(!v.anonymous&&v.ownerId)body+=portrait('community-author',identity,avatars[v.ownerId],110,y+14,80);
   body+=block(identity,y+44,650,27,1,600).svg;body+=text(600,y+80,'MEMBER CONTRIBUTION',18,amber,'text-anchor="middle" letter-spacing="1.5"');y+=124;
  }
  if(v.answer&&!declined){const answer=block(v.answer,y+74,1040,32,5);body+=plate(38,y,1124,answer.height+95,ink.emerald)+text(600,y+31,'THE ANSWER',21,ink.emerald,'text-anchor="middle" font-weight="700"')+answer.svg;y+=answer.height+109;}
  const choices=v.choices.slice(0,8);clipped ||= v.choices.length>choices.length;
  for(let i=0;i<choices.length;i+=2){const pair=choices.slice(i,i+2),items=pair.map(c=>block(c.label,y+44,480,28,3)),rh=Math.max(116,...items.map(b=>b.height+68));pair.forEach((c,j)=>{const x=38+j*572,cx=pair.length===1?600:x+276,won=(!v.hidden||closed)&&v.winnerId===c.id;body+=plate(pair.length===1?38:x,y,pair.length===1?1124:552,rh,won?ink.emerald:amber);body+=copy(c.label,cx,y+40,480,28,bright,3).svg;
    const showResults=Boolean(v.results)&&!(v.hidden&&!closed);body+=text(cx,y+rh-24,showResults?`${v.results?.[c.id]??0} votes${won?' · WINNER':''}`:v.kind==='poll'?`OPTION ${i+j+1}`:'',21,won?ink.emerald:amber,'text-anchor="middle" font-weight="700"');});y+=rh+14;}
  if(v.kind==='giveaway'){
   body+=plate(38,y,1124,105)+text(600,y+38,`PRIZE PER WINNER · ${giveawayCounts(v)}`,25,amber,'text-anchor="middle" font-weight="700"')+text(600,y+77,v.fee==='0'?'FREE ENTRY':`${v.fee} Ottomans per entry`,26,bright,'text-anchor="middle" font-weight="600"');y+=119;
   const winners=v.winners??[];if(winners.length){const w=1124/winners.length;body+=plate(38,y,1124,205);winners.forEach((m,i)=>{const cx=38+w*(i+.5);body+=portrait('giveaway-winner-'+i,m.name,avatars[m.id],cx,y+16,100)+block(m.name,y+157,w-24,26,2,cx).svg;});y+=219;}
  }
  if(v.status){const tone=['DECLINED','FULFILLMENT_PENDING','REVIEWING'].includes(v.status)?ink.warm:ink.emerald;body+=text(600,y+23,v.status.replaceAll('_',' '),23,tone,'text-anchor="middle" font-weight="700"');y+=43;}
 }
 const label=award?v.phase==='closed'?single?'Permanent season badge awarded':v.categories.some(c=>c.winner)?'Permanent season badges awarded':'No nominations · no badges awarded':'Anonymous nominations and ballots':v.kind==='giveaway'?closed?v.status==='FULFILLMENT_PENDING'?'Draw saved · organizer fulfillment pending':v.winners?.length?'Draw saved · rewards recorded':'No entries · no prizes awarded':'One entry per member · fees are removed':v.hidden&&!closed?'Results stay hidden until close':v.anonymous?'Anonymous to members':'Member choices are recorded';
 const deadline=v.expiresAt&&!closed?`Closes ${v.expiresAt.toISOString().slice(0,16).replace('T',' ')} UTC`:award?`Season ${v.season} · No Ottoman prize`:'A shared moment · preserved in the lounge';
 body+=footer(y,label,clipped?'Preview · open Details for the complete record':deadline);return frame(y+111,body);
}

const giveawayCounts=(v:CommunityView)=>{const winners=v.state==='CLOSED'?v.winners?.length??0:v.winnerCount;return `${winners} ${winners===1?'winner':'winners'} · ${v.entryCount} ${v.entryCount===1?'entry':'entries'}`;};
export const COMMUNITY_TITLES={poll:'Community Poll',superlatives:'Superlatives',suggest:'Suggestion',ama:'Ask Me Anything',giveaway:'Giveaway'};
export function communityTranscript(v:CommunityView){const out=[COMMUNITY_TITLES[v.kind],v.title];if(v.kind==='superlatives'){out.push(`Season ${v.season} · ${v.phase}`);for(const c of v.categories)out.push(c.name,c.winner?'Winner: '+c.winner.name:c.finalists.length?'Finalists: '+c.finalists.map(m=>m.name).join(', '):v.phase==='closed'?'No nominations received.':'Nominations open.');out.push('Permanent season badges · no Ottoman prizes.');}for(const c of v.choices)out.push(`${c.id}. ${c.label}${v.results?' · '+(v.results[c.id]??0)+' votes':''}`);if(v.kind==='giveaway'){out.push(`Prize per winner: ${v.prize?.label}`,giveawayCounts(v),`Entry: ${v.fee==='0'?'free':v.fee+' Ottomans · fees removed from circulation'}`);if(v.winners)out.push(v.winners.length?'Winners: '+v.winners.map(m=>m.name).join(', '):'No entries received.');if(v.status==='FULFILLMENT_PENDING')out.push('Custom reward fulfillment is pending with the organizer.');}if(v.status)out.push('Status: '+v.status);if(v.answer)out.push('Answer: '+v.answer);if(v.submitterName)out.push('Submitted by '+v.submitterName);if(v.ballots?.length)out.push('Named ballots:',...v.ballots.map(b=>b.memberId+': '+b.choices.map(id=>v.choices.find(c=>c.id===id)?.label??id).join(' > ')));return out.join('\n');}

export function superlativeReviewFixture():CommunityView{return{id:'superlative-review',guildId:'fixture',channelId:'fixture',messageId:'fixture',ownerId:null,state:'CLOSED',version:12,expiresAt:new Date('2026-09-25T12:00:00Z'),kind:'superlatives',phase:'closed',round:1,title:'Superlatives · Season 1',anonymous:true,hidden:true,ranked:false,choices:[],categories:[{id:'1',name:'Most Likely to Bring a Spare Chair',finalists:[{id:'fixture-winner',name:'Morgan'}],winner:{id:'fixture-winner',name:'Morgan'}}],season:1,status:undefined,submitterName:undefined,answer:undefined,prize:undefined,fee:undefined,winnerCount:undefined,winners:undefined,entryCount:7,results:undefined,winnerId:undefined};}
