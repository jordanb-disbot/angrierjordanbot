import {DomainError} from '../../core/src/index.js';
export const LORE_CHAPTERS=[{id:'not',title:'The Story Behind the ‘not’'},{id:'chairs',title:'Why the Server Is Called Chairs'},{id:'jordan',title:'The Story of Angrier Jordan'}] as const;
export interface Chapter {id:string;title:string;version:number;pages:string[];}
export const LORE_PAGE_TARGET=1200;
// Reserve space below Discord's description limit for the page label and achievement notice.
// An indivisible oversized paragraph must be edited at an authored boundary, never truncated.
export const LORE_PARAGRAPH_MAX=3500;
export function chapterContent(id:string,version:number,payload:unknown):Chapter{
 const known=LORE_CHAPTERS.find(c=>c.id===id),paragraphs=(payload as {paragraphs?:unknown})?.paragraphs;
 if(!known||!Number.isInteger(version)||version<1||!Array.isArray(paragraphs)||!paragraphs.length||paragraphs.length>100||paragraphs.some(p=>typeof p!=='string'||!p.trim()||p.length>10000))throw new DomainError('LORE_CONTENT','This chapter is not ready to read.');
 const natural=(paragraphs as string[]).flatMap(p=>p.replace(/\r\n/g,'\n').split(/\n[ \t]*\n+/)).map(p=>p.trim()).filter(Boolean);
 if(!natural.length||natural.length>1000||natural.some(p=>p.length>LORE_PARAGRAPH_MAX))throw new DomainError('LORE_CONTENT','This chapter needs an authored paragraph break before its full text can be displayed.');
 const pages:string[]=[];let current='';for(const p of natural){if(current&&current.length+p.length+2>LORE_PAGE_TARGET){pages.push(current);current='';}current+=(current?'\n\n':'')+p;}if(current)pages.push(current);
 return{id,title:known.title,version,pages};
}
export function validateReadingPage(page:number,chapter:Chapter,lastPage=-1){if(!Number.isInteger(page)||page<0||page>=chapter.pages.length||page>lastPage+1)throw new DomainError('LORE_PAGE','Use the reader navigation to continue from your saved page.');}
export function validateTutorialStep(lessonId:string,step:number,reset=false){if(!/^[a-z0-9][a-z0-9_.-]{0,79}$/.test(lessonId)||!Number.isInteger(step)||step<0||step>3||reset&&step!==0)throw new DomainError('TUTORIAL_STEP','Reopen this lesson. Restart begins at the first step.');}
export const TUTORIAL_PATHS=[['discord','Discord Basics'],['start','Getting Started'],['identity','Your Identity'],['economy','Economy & Items'],['games','Games & Events'],['family','Crime & Family'],['community','Community'],['safety','Safety & Moderation'],['staff','Staff Academy'],['admin','Owner/Admin'],['finder','Command Finder']] as const;
export function conversationSnapshot(rows:{bot:boolean;system:boolean;content:string;createdAt:Date}[],since:Date,until:Date){const messages=rows.filter(m=>!m.bot&&!m.system&&m.createdAt>=since&&m.createdAt<=until&&m.content.trim()&&!/^\s*[!/]\w/.test(m.content));return{messages:messages.length,words:messages.reduce((n,m)=>n+m.content.trim().split(/\s+/u).length,0)};}
export function tldrDuration(kind:string,time:string){const allowed=kind==='chat'?{'1h':1,'2h':2,'4h':4,'8h':8}:kind==='events'?{'1d':24,'7d':168}:{};const hours=(allowed as Record<string,number>)[time];if(!hours)throw new DomainError('TLDR_WINDOW','Choose one of the offered recap windows.');return hours*3600000;}
