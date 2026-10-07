import {shell,ink,text} from '../../features-events/src/visual.js';
import {portrait} from '../../features-events/src/gate-b-visual.js';
import {wrapText} from '../../renderer/src/text-layout.js';
import type {PartyGame} from './domain.js';
import type {PartyView} from './prisma-repository.js';
export const PARTY_TITLES:Record<PartyGame,string>={truthordare:'Truth or Dare',wwyd:'What Would You Do',finishsentence:'Finish the Sentence',onewordstory:'One Word Story',fmk:'Fuck, Marry, Kill'};
export function partyTranscript(v:PartyView){const out=[PARTY_TITLES[v.game],v.prompt??''];if(v.target)out.push('Target: '+v.target.name);if(v.answer)out.push(v.target?.name+': '+v.answer);if(v.skipped)out.push('Skipped by the target.');if(v.words.length)out.push(v.words.map(w=>w.word).join(' '),'Contributions:',...v.words.map((w,n)=>`${n+1}. ${w.name}: ${w.word}`));if(v.phase!=='submissions')out.push(...Object.entries(v.submissions).map(([,s])=>`${s.name}: ${s.text}`));if(v.assignments)for(const[key,id]of Object.entries(v.assignments)){const name=v.trio?.find(m=>m.userId===id)?.name??'Member',counts=v.subjectCounters?.[id],label=key==='fuck'?'Fuck':key==='marry'?'Marry':'Kill';out.push(`${label}: ${name} · Fuck ${counts?.fucked??0} · Marry ${counts?.married??0} · Kill ${counts?.killed??0}`);}if(v.result){out.push(v.result.label);for(const o of v.options)out.push(`${o.text}: ${v.result.totals[o.id]??0} (${v.result.percentages[o.id]??0}%)`);}return out.filter(Boolean).join('\n');}

export interface PartyArt {name:string;handle?:string;avatarData:string;}

export const PARTY_GAMES_ACCENT='#3B82F6';
const W=1200;
function panel(x:number,y:number,width:number,height:number,accent:string=PARTY_GAMES_ACCENT){return '<rect x="'+x+'" y="'+(y+5)+'" width="'+width+'" height="'+height+'" rx="14" fill="#000" opacity=".65"/><rect x="'+x+'" y="'+y+'" width="'+width+'" height="'+height+'" rx="14" fill="url(#party-glass)" stroke="url(#gold)" stroke-width="2"/><rect x="'+(x+6)+'" y="'+(y+6)+'" width="'+(width-12)+'" height="'+(height-12)+'" rx="10" fill="none" stroke="'+accent+'" stroke-opacity=".55"/><path d="M'+(x+16)+' '+(y+42)+'V'+(y+16)+'H'+(x+42)+'M'+(x+width-42)+' '+(y+height-16)+'H'+(x+width-16)+'V'+(y+height-42)+'" fill="none" stroke="url(#gold)" stroke-width="3"/><path d="M'+(x+50)+' '+(y+2)+'H'+(x+width-50)+'" stroke="'+accent+'" stroke-width="3"/>';}

const center=(value:string,y:number,size=26,width=1040,cx=600,color:string=ink.white)=>{const rows=wrapText(value,width,size),line=Math.ceil(size*1.35);return{svg:rows.map((r,n)=>text(cx,y+n*line,r,size,color,'text-anchor="middle" font-weight="600"')).join(''),height:Math.max(1,rows.length)*line};};
function frame(height:number,body:string){return shell(height,'<defs><linearGradient id="party-glass" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#26313B" stop-opacity=".94"/><stop offset=".32" stop-color="#18232D" stop-opacity=".97"/><stop offset=".65" stop-color="#101C26" stop-opacity=".96"/><stop offset="1" stop-color="#071521" stop-opacity=".98"/></linearGradient></defs><g font-family="Inter" font-weight="600">'+body+'</g>',0,W).replace('stroke="#00D7CF"','stroke="'+PARTY_GAMES_ACCENT+'"');}
function header(title:string,state:string){return panel(28,26,1144,150,PARTY_GAMES_ACCENT)+text(600,61,'ANGRIER JORDAN · THE GAMES LOUNGE',19,ink.gold,'text-anchor="middle" letter-spacing="3"')+text(600,112,title,45,ink.white,'text-anchor="middle" font-family="Space Grotesk" font-weight="700"')+text(600,151,state,23,'#A8C9FF','text-anchor="middle"');}
function fmkCards(trio:{userId:string;name:string}[],assignments:Record<string,string>|undefined,counters:PartyView['subjectCounters'],art:Record<string,PartyArt>,top:number){
 let body='',bottom=top;const nameHeight=Math.max(36,...trio.map(m=>center(art[m.userId]?.name??m.name,0,29,288).height)),height=390+nameHeight;
 for(const[mIndex,m]of trio.entries()){const x=42+mIndex*378,cx=x+180,role=Object.entries(assignments??{}).find(([,id])=>id===m.userId)?.[0].toUpperCase()??'UNASSIGNED',a=art[m.userId],counts=counters?.[m.userId],values=[counts?.fucked??0,counts?.married??0,counts?.killed??0],total=Math.max(1,...values),accent=role==='FUCK'?'#EF4444':role==='MARRY'?ink.gold:role==='KILL'?ink.emerald:PARTY_GAMES_ACCENT;body+=panel(x,top,360,height,accent)+text(cx,top+42,role,30,accent,'text-anchor="middle" font-family="Space Grotesk" font-weight="700"')+portrait('fmk-'+mIndex,m.name,a?.avatarData,cx,top+62,190);body+=center(a?.name??m.name,top+286,29,288,cx).svg;
 for(let n=0;n<3;n++){const bx=x+20+n*109,y=top+312+nameHeight;body+=text(bx+50,y,['Fuck','Marry','Kill'][n]!,17,ink.muted,'text-anchor="middle"')+text(bx+50,y+30,counts?String(values[n]):'—',25,ink.white,'text-anchor="middle"')+'<rect x="'+bx+'" y="'+(y+45)+'" width="100" height="7" rx="3" fill="#06131C"/><rect x="'+bx+'" y="'+(y+45)+'" width="'+100*values[n]!/total+'" height="7" rx="3" fill="'+[PARTY_GAMES_ACCENT,ink.gold,ink.emerald][n]+'"/>';}
 bottom=top+height;}
 return{svg:body,bottom};
}
/** Landscape FMK keeps the three faces together at Discord display width. */
function fmkStage(trio:{userId:string;name:string}[],assignments:Record<string,string>,art:Record<string,PartyArt>,chooser:string,counters:PartyView['subjectCounters'],result:PartyView['result'],privateView=false){
 const accents=['#EF4444','#D568E8','#38BDF8'],roles=['FUCK','MARRY','KILL'],bottom=privateView?'Assign Fuck, then Marry. The remaining member is Kill.':result?`Agree: ${result.totals.agree??0} votes · ${result.percentages.agree??0}%     |     Disagree: ${result.totals.disagree??0} votes · ${result.percentages.disagree??0}%`:'Agree or Disagree · Anonymous votes · The chooser cannot vote';
 let body='<defs><linearGradient id="fmkFade" x2="0" y2="1"><stop stop-color="#0B1220" stop-opacity="0"/><stop offset="1" stop-color="#0B1220" stop-opacity=".98"/></linearGradient></defs><rect width="1200" height="790" fill="#07111D" opacity=".62"/>';
 body+=text(32,43,'ANGRIER JORDAN · THE GAMES LOUNGE',20,ink.gold,'font-family="Space Grotesk" font-weight="700" letter-spacing="2"');
 body+=text(32,101,'FUCK · MARRY · KILL',56,ink.white,'font-family="Space Grotesk" font-weight="700"');
 body+=text(32,136,privateView?'PRIVATE CHOICES':result?'THE VERDICT · '+result.label:'AUDIENCE VOTE OPEN',24,'#E5C278','font-family="Space Grotesk" font-weight="700"');
 body+=text(1160,51,'CHOSEN BY',18,ink.muted,'text-anchor="end" letter-spacing="2"')+text(1160,86,chooser,28,ink.white,'text-anchor="end" font-family="Space Grotesk" font-weight="700"');
 body+='<path d="M30 151H1170" stroke="url(#gold)" stroke-width="2"/>';
 for(const[n,m]of trio.entries()){
  const x=30+n*384,cx=x+180,accent=accents[n]!,a=art[m.userId],name=a?.name??m.name,role=Object.entries(assignments).find(([,id])=>id===m.userId)?.[0].toUpperCase()??'PENDING',stats=counters?.[m.userId]??{fucked:0,married:0,killed:0},values=[stats.fucked,stats.married,stats.killed],draws=values.reduce((sum,count)=>sum+count,0),high=Math.max(1,...values),safeAvatar=a?.avatarData&&/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(a.avatarData)&&a.avatarData.length<=1_400_000;
  body+=`<defs><clipPath id="fmkCrop${n}"><rect x="${x+10}" y="174" width="340" height="244" rx="13"/></clipPath></defs><rect x="${x}" y="164" width="360" height="510" rx="18" fill="#0B1220" stroke="${accent}" stroke-width="3"/><rect x="${x+9}" y="173" width="342" height="492" rx="12" fill="#081722" stroke="${accent}" stroke-opacity=".35"/>`;
  body+=safeAvatar?`<image href="${a!.avatarData}" x="${x+10}" y="174" width="340" height="244" preserveAspectRatio="xMidYMid slice" clip-path="url(#fmkCrop${n})"/>`:portrait('fmk-stage-'+n,name,a?.avatarData,cx,188,214);
  body+=`<rect x="${x+10}" y="290" width="340" height="128" fill="url(#fmkFade)"/>`;
  body+=text(x+26,207,String(n+1).padStart(2,'0'),27,accent,'font-family="Space Grotesk" font-weight="700"')+text(cx,398,role,39,accent,'text-anchor="middle" font-family="Space Grotesk" font-weight="700"');
  const nameSize=name.length>23?25:name.length>15?28:32,nameLines=wrapText(name,310,nameSize).slice(0,2);
  nameLines.forEach((line,j)=>body+=text(cx,452+j*34,line,nameSize,ink.white,'text-anchor="middle" font-family="Space Grotesk" font-weight="700"'));
  const handle=a?.handle?('@'+a.handle.replace(/^@/,'')):'MEMBER';
  body+=text(cx,525,handle,21,ink.muted,'text-anchor="middle"')+text(x+25,557,`RECORD · ${draws} DRAWS`,19,ink.muted,'font-family="Space Grotesk" font-weight="700" letter-spacing="1"');
  for(let k=0;k<3;k++){const y=583+k*27,width=Math.max(4,210*values[k]!/high);body+=text(x+25,y,roles[k]![0]!,20,accents[k]!,'font-family="Space Grotesk" font-weight="700"')+`<rect x="${x+58}" y="${y-14}" width="210" height="12" rx="6" fill="#26313B"/><rect x="${x+58}" y="${y-14}" width="${width}" height="12" rx="6" fill="${accents[k]}"/>`+text(x+332,y,String(values[k]),19,ink.white,'text-anchor="end"');}
 }
 body+=`<rect x="30" y="689" width="1140" height="72" rx="13" fill="#0A1A27" stroke="${result?ink.gold:ink.teal}" stroke-width="2"/>`+text(600,719,bottom,25,ink.white,'text-anchor="middle" font-family="Inter" font-weight="600"')+text(600,747,privateView?'SUBMIT CHOICES WHEN READY':result?'THE LOUNGE HAS SPOKEN':'VOTES STAY PRIVATE UNTIL CLOSE',17,ink.gold,'text-anchor="middle" font-family="Space Grotesk" font-weight="700" letter-spacing="2"');
 return shell(790,body,0,W);
}
/** Explicitly private projection; public DRAFT views never include this trio. */
export function renderPartyDraft(v:{trio:{userId:string;name:string}[];fuck?:string|undefined;marry?:string|undefined;subjectCounters?:PartyView['subjectCounters']},art:Record<string,PartyArt>={},chooser='The chooser'){
 const assignments:Record<string,string>={};if(v.fuck)assignments.fuck=v.fuck;if(v.marry)assignments.marry=v.marry;if(v.fuck&&v.marry){const left=v.trio.find(m=>m.userId!==v.fuck&&m.userId!==v.marry);if(left)assignments.kill=left.userId;}
 return fmkStage(v.trio,assignments,art,chooser,v.subjectCounters,undefined,true);
}
/** Public projections only: submitted private choices never enter the feed artwork. */
export function renderParty(v:PartyView,memberArt:Record<string,PartyArt>={}){
 if(v.game==='fmk'&&v.state!=='DRAFT'&&v.trio&&v.assignments)return fmkStage(v.trio,v.assignments,memberArt,memberArt[v.ownerId??'']?.name??'The chooser',v.subjectCounters,v.result);
 const state=v.state==='CLOSED'?'ROUND COMPLETE':v.phase==='runoff'?'RUNOFF · 30 SECONDS':v.phase==='vote'?'VOTING · totals hidden until close':v.phase==='submissions'?'SUBMISSIONS · WRITE YOUR ENDING':v.phase==='story'?'THE STORY TABLE':v.phase==='answer'?'THE FLOOR IS YOURS':'CHOOSE THE NEXT MOVE';
 let body=header(PARTY_TITLES[v.game],state),y=202;
 const section=(copy:string,size=32,tone:string=ink.gold)=>{const b=center(copy,y+50,size,1020);body+=panel(42,y,1116,b.height+72,tone)+b.svg;y+=b.height+94;};
 if(v.state==='DRAFT'){section('Private choices belong to the chooser.');return frame(y+20,body);}
 if(v.game==='fmk'&&v.trio&&v.assignments){const chooser=memberArt[v.ownerId??''];if(chooser){body+=portrait('chooser',chooser.name,chooser.avatarData,106,y,72)+center('Chosen by '+chooser.name,y+43,25,920,660).svg;y+=100;}const cards=fmkCards(v.trio,v.assignments,v.subjectCounters,memberArt,y);body+=cards.svg;y=cards.bottom+30;}
 else{
 if(v.prompt)section(v.prompt,36,v.game==='truthordare'&&v.mode==='dare'?ink.gold:PARTY_GAMES_ACCENT);
 if(v.target){const a=memberArt[v.target.userId],name=a?.name??v.target.name,label=center(name,y+135,34,780,760);body+=panel(42,y,1116,label.height+166,PARTY_GAMES_ACCENT)+portrait('target',v.target.name,a?.avatarData,360,y+22,108)+text(760,y+53,'THE FLOOR BELONGS TO',21,ink.gold,'text-anchor="middle" letter-spacing="3"')+label.svg;y+=label.height+192;}
 if(v.game==='truthordare')section(v.skipped?'Skipped by the target.':v.answer??(v.phase==='choose'?'Choose Truth, Dare, or Skip.':'The target can answer using the controls below.'),30);
 if(v.game==='finishsentence'&&v.phase==='choose')section('Random Prompt or Write My Own · the host sets the scene',28);
 if(v.phase==='submissions')section(v.submissionCount+' submissions saved · answers stay private until close',28);
 if(v.words.length){if(v.words.length>40)section('Latest 40 words · full story in Details',23);section(v.words.slice(-40).map(w=>w.word).join(' '),30);}
 if(v.game==='onewordstory')section(v.words.length+' / '+v.targetLength+' words · one word each turn',28);
 if(v.result?.winnerId){const id=v.result.winnerId,a=memberArt[id],name=a?.name??v.submissions[id]?.name??'Winning member',label=center(name,y+185,32);body+=panel(42,y,1116,label.height+220,ink.gold)+text(600,y+36,'THE LOUNGE CHOICE',22,ink.gold,'text-anchor="middle" letter-spacing="3"')+portrait('winner',name,a?.avatarData,600,y+50,105)+label.svg;y+=label.height+246;}
 }
 const privateChoice=v.visibility==='private'&&v.game==='wwyd'&&Boolean(v.result);
 if(['vote','runoff','done'].includes(v.phase)&&v.options.length){const options=v.options.slice(0,5),columns=v.game==='wwyd'||v.game==='fmk'?2:1,cell=columns===2?544:1116,gap=28;for(let n=0;n<options.length;n+=columns){const row=options.slice(n,n+columns),blocks=row.map((o,j)=>center(o.text,y+78,32,cell-72,42+j*(cell+gap)+cell/2)),h=Math.max(...blocks.map(b=>b.height))+112+(v.result?82:0);for(const[oIndex,o]of row.entries()){const x=42+oIndex*(cell+gap),cx=x+cell/2,accent=oIndex%2?ink.gold:PARTY_GAMES_ACCENT,chosen=privateChoice&&v.result?.totals[o.id]===1;body+=panel(x,y,cell,h,chosen?ink.emerald:accent)+text(cx,y+35,columns===2?'CHOICE '+String.fromCharCode(65+n+oIndex):'YOUR CHOICE',19,accent,'text-anchor="middle" letter-spacing="2"')+blocks[oIndex]!.svg;if(v.result){const percent=v.result.percentages[o.id]??0;body+=privateChoice?center(chosen?'YOUR PICK':'',y+h-60,26,cell-72,cx,ink.emerald).svg:center((v.result.totals[o.id]??0)+' votes · '+percent+'%',y+h-60,26,cell-72,cx,ink.emerald).svg+'<rect x="'+(x+30)+'" y="'+(y+h-26)+'" width="'+(cell-60)+'" height="10" rx="5" fill="#03131D"/><rect x="'+(x+30)+'" y="'+(y+h-26)+'" width="'+((cell-60)*Math.max(0,Math.min(100,percent))/100)+'" height="10" rx="5" fill="'+accent+'"/>';}}y+=h+26;}if(v.options.length>5)section('Use Details for every contribution and the voting menu.',23);}
 const footer=v.result?.label??(v.phase==='submissions'?'Submit once · revise until close':v.phase==='vote'||v.phase==='runoff'?v.game==='fmk'?'Do you agree with this FMK? Anonymous ballots · the chooser cannot vote.':v.game==='finishsentence'||v.game==='onewordstory'?'Anonymous ballots · vote for another member · change until close':'Anonymous ballots · one vote per member · change until close':v.game==='onewordstory'?'Let another member follow your word.':'Use the controls below.');section(footer,28);return frame(y+8,body);
}
