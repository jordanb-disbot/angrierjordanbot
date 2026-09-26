import {shell,panel,ink} from '../../features-events/src/visual.js';
import {centeredHeading,centeredBlock,portrait} from '../../features-events/src/gate-b-visual.js';
import type {PartyGame} from './domain.js';
import type {PartyView} from './prisma-repository.js';
export const PARTY_TITLES:Record<PartyGame,string>={truthordare:'Truth or Dare',wwyd:'What Would You Do',finishsentence:'Finish the Sentence',onewordstory:'One Word Story',fmk:'Fuck, Marry, Kill'};
export function partyTranscript(v:PartyView){const out=[PARTY_TITLES[v.game],v.prompt??''];if(v.target)out.push('Target: '+v.target.name);if(v.answer)out.push(v.target?.name+': '+v.answer);if(v.skipped)out.push('Skipped by the target.');if(v.words.length)out.push(v.words.map(w=>w.word).join(' '),'Contributions:',...v.words.map((w,n)=>`${n+1}. ${w.name}: ${w.word}`));if(v.phase!=='submissions')out.push(...Object.entries(v.submissions).map(([id,s])=>`${s.name} (${id}): ${s.text}`));if(v.assignments)for(const[key,id]of Object.entries(v.assignments)){const name=v.trio?.find(m=>m.userId===id)?.name??'Member',counts=v.subjectCounters?.[id];out.push(`${key.toUpperCase()}: ${name} · Fucked ${counts?.fucked??0} · Married ${counts?.married??0} · Killed ${counts?.killed??0}`);}if(v.result){out.push(v.result.label);for(const o of v.options)out.push(`${o.text}: ${v.result.totals[o.id]??0} (${v.result.percentages[o.id]??0}%)`);}return out.filter(Boolean).join('\n');}

export interface PartyArt {name:string;avatarData:string;}
/** Public projections only: submitted private choices never enter the feed artwork. */
export function renderParty(v:PartyView,memberArt:Record<string,PartyArt>={}){const h=centeredHeading('ANGRIER JORDAN · PARTY',PARTY_TITLES[v.game],v.state==='CLOSED'?'The round is complete':v.phase==='runoff'?'Voting · 30-second runoff':v.phase==='vote'?'Voting · totals hidden until close':'The lounge is making a little history');let body=h.svg,top=h.height,y=top+26,content='';
 const add=(value:string,color=ink.white,size=17)=>{const block=centeredBlock(value,y,{size,color,width:360,gap:10});content+=block.svg;y+=block.height;};
 const person=(id:string,name:string,label?:string)=>{const art=memberArt[id];if(label)add(label,ink.warm,16);content+=portrait('party-'+id,name,art?.avatarData??'',220,y,76);y+=99;add(art?.name??name,ink.white,18);};
 if(v.state==='DRAFT')add('Private choices belong to the chooser.');else{
 if(v.prompt)add(v.prompt,ink.warm,19);if(v.target)person(v.target.userId,v.target.name,'TARGET');
 if(v.game==='truthordare')add(v.skipped?'Skipped by the target.':v.answer??(v.phase==='choose'?'Truth, Dare, or Skip?':'The target can answer using the button below.'));
 if(v.game==='finishsentence'&&v.phase==='choose')add('Host: choose Random Prompt or Write My Own.');
 if(v.phase==='submissions')add(v.submissionCount+' submissions saved. Answers stay private until submissions close.');
 if(v.words.length)add(v.words.map(w=>w.word).join(' '));if(v.game==='onewordstory')add(v.words.length+' / '+v.targetLength+' words · one word each turn',ink.emerald,16);
 if(v.assignments){for(const[key,id]of Object.entries(v.assignments)){person(id,v.trio?.find(m=>m.userId===id)?.name??'Member',key.toUpperCase());const c=v.subjectCounters?.[id];add('Fucked '+(c?.fucked??0)+' · Married '+(c?.married??0)+' · Killed '+(c?.killed??0),ink.muted,13);}}
 if(v.result?.winnerId&&!v.assignments){const id=v.result.winnerId;person(id,v.submissions[id]?.name??'Winning member','LOUNGE CHOICE');}
 if(['vote','runoff','done'].includes(v.phase))for(const o of v.options.slice(0,5)){const start=y-8;let option='';const label=centeredBlock(o.text,y+13,{size:16,color:ink.white,width:338,gap:8});option+=label.svg;y+=label.height+13;if(v.result){const tally=centeredBlock((v.result.totals[o.id]??0)+' votes · '+(v.result.percentages[o.id]??0)+'%',y,{size:14,color:ink.emerald,width:338,gap:8});option+=tally.svg;y+=tally.height;const width=330*Math.min(100,Math.max(0,v.result.percentages[o.id]??0))/100;option+='<rect x="55" y="'+y+'" width="330" height="5" rx="2.5" fill="#04131D"/><rect x="55" y="'+y+'" width="'+width+'" height="5" rx="2.5" fill="'+ink.emerald+'"/>';y+=15;}content+=panel(38,start,364,y-start,ink.gold)+option;y+=22;}
 if(v.options.length>5)add('Full text and choices: use Details below.',ink.muted,13);
 }
 const bottom=y+5;body+=panel(18,top,404,bottom-top)+content;const footer=v.result?.label??(v.phase==='submissions'?'Submit once · revise until close':v.phase==='vote'||v.phase==='runoff'?v.game==='fmk'?'Do you agree with this FMK?':'One vote · change until close':v.game==='onewordstory'?'Let another member follow your word.':'Use the controls below.');y=bottom+43;content='';add(footer,ink.warm,15);add(v.result?.winnerId?'Winner recorded · no Ottomans':v.state==='CLOSED'?'Play Again starts a fresh round.':'Named contributions · anonymous ballots',ink.muted,12);body+=panel(18,bottom+16,404,y-bottom-9,ink.gold)+content;return shell(y+26,body);
}
