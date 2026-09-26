import {DomainError} from '../../core/src/errors.js';
export interface IntroPrompt {id:string;sortOrder:number;label:string;cardLabel:string;placeholder:string|null;required:boolean;minLength:number|null;maxLength:number;inputStyle:string;enabled:boolean;showOnCard:boolean;deletedAt:Date|string|null;}
export interface IntroConfig {guildId:string;introductionChannelId:string|null;panelMessageId:string|null;headerText:string;footerText:string;showAvatar:boolean;showDisplayName:boolean;showJoinDate:boolean;allowAdminIntroConfig:boolean;version:number;}
export interface IntroForm {id:string;version:number;title:string;prompts:IntroPrompt[];}
export interface IntroDraft {form:IntroForm;config:IntroConfig;answers:Record<string,string>;baseRevision:number;page:number;previewedVersion:number|null;}
export interface IntroContext {guildId:string;channelId:string;userId:string;requestKey:string;}
export const INTRO_DEFAULTS=[
 {id:'name',label:'What should we call you?',cardLabel:'Name',required:true,maxLength:80,inputStyle:'short'},
 {id:'age',label:'How old are you?',cardLabel:'Age',required:true,maxLength:20,inputStyle:'short'},
 {id:'from',label:"What part of the world are you joining us from? Share only as much as you're comfortable with.",cardLabel:'From',required:false,maxLength:100,inputStyle:'short'},
 {id:'about',label:'Tell us a little about yourself — hobbies, interests, personality, whatever you want people to know.',cardLabel:'About Me',required:true,maxLength:700,inputStyle:'paragraph'},
 {id:'why',label:'What brought you here, or what are you hoping to find in the community?',cardLabel:"Why I’m Here",required:false,maxLength:500,inputStyle:'paragraph'}
] as const;
export function activePrompts(form:IntroForm){return form.prompts.filter(p=>p.enabled&&!p.deletedAt).sort((a,b)=>a.sortOrder-b.sortOrder||a.id.localeCompare(b.id));}
export function promptPages(form:IntroForm){const prompts=activePrompts(form);return Array.from({length:Math.ceil(prompts.length/5)},(_,n)=>prompts.slice(n*5,n*5+5));}
export function validateIntroForm(form:IntroForm,config:IntroConfig){
 if(typeof form?.title!=='string'||!Array.isArray(form.prompts)||typeof config?.headerText!=='string'||typeof config.footerText!=='string'||['showAvatar','showDisplayName','showJoinDate','allowAdminIntroConfig'].some(key=>typeof config[key as keyof IntroConfig]!=='boolean'))throw new DomainError('INTRO_FORM','The form configuration is invalid.');
 for(const p of form.prompts)if(!p||typeof p.id!=='string'||typeof p.label!=='string'||typeof p.cardLabel!=='string'||p.placeholder!==null&&typeof p.placeholder!=='string'||['required','enabled','showOnCard'].some(key=>typeof p[key as keyof IntroPrompt]!=='boolean')||p.deletedAt!==null&&!Number.isFinite(new Date(p.deletedAt).getTime()))throw new DomainError('INTRO_PROMPT','A prompt has invalid field types.');
 if(!form.title.trim()||form.title.length>45||!activePrompts(form).length||activePrompts(form).length>100)throw new DomainError('INTRO_FORM','The form needs a title and 1–100 prompts.');
 const ids=new Set<string>();let publicBudget=0;
 for(const p of form.prompts){if(ids.has(p.id)||['__proto__','prototype','constructor'].includes(p.id)||!/^[-a-zA-Z0-9_]{1,80}$/.test(p.id)||!p.label.trim()||p.label.length>300||!p.cardLabel.trim()||p.cardLabel.length>80||!Number.isSafeInteger(p.sortOrder)||!Number.isInteger(p.maxLength)||p.maxLength<1||p.maxLength>4000||p.minLength!==null&&(!Number.isInteger(p.minLength)||p.minLength<0||p.minLength>p.maxLength)||!['short','paragraph'].includes(p.inputStyle)||(p.placeholder?.length??0)>100)throw new DomainError('INTRO_PROMPT','A prompt has invalid labels, length limits or input style.');ids.add(p.id);if(p.enabled&&!p.deletedAt&&p.showOnCard)publicBudget+=p.maxLength+p.cardLabel.length+4;}
 if(publicBudget>10000)throw new DomainError('INTRO_CARD_LIMIT','Visible prompt character limits must total at most 10,000 characters, including labels.');
 if(!config.headerText.trim()||config.headerText.length>80||config.footerText.length>300)throw new DomainError('INTRO_CARD_CONFIG','Use a header of 1–80 and a welcome message of at most 300 characters.');
}
export function saveAnswers(draft:IntroDraft,page:number,submitted:Record<string,string>):IntroDraft {
 const prompts=promptPages(draft.form)[page];if(!Number.isInteger(page)||!prompts)throw new DomainError('INTRO_PAGE','Open a current form page.');
 const allowed=new Set(prompts.map(p=>p.id));if(Object.keys(submitted).some(id=>!allowed.has(id)))throw new DomainError('INTRO_FIELD','This field does not belong to this form page.');
 const answers={...draft.answers};for(const p of prompts){const value=(submitted[p.id]??'').replace(/\r\n?/g,'\n').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,'').trim();if(value.length>p.maxLength||value.length>0&&value.length<(p.minLength??0)||p.required&&!value)throw new DomainError('INTRO_ANSWER',`Check “${p.cardLabel}”: ${p.required?'an answer is required; ':''}use ${p.minLength??0}–${p.maxLength} characters.`);answers[p.id]=value;}
 return{...draft,answers,page,previewedVersion:null};
}
export function validateAnswers(draft:IntroDraft){for(let n=0;n<promptPages(draft.form).length;n++){const values=Object.fromEntries(promptPages(draft.form)[n]!.map(p=>[p.id,draft.answers[p.id]??'']));saveAnswers(draft,n,values);}}
export function introTranscript(draft:IntroDraft,displayName:string,joinedAt?:string){return [draft.config.headerText,draft.config.showDisplayName?displayName:'',draft.config.showJoinDate&&joinedAt?`Joined ${joinedAt}`:'',...activePrompts(draft.form).filter(p=>p.showOnCard&&draft.answers[p.id]).map(p=>`${p.cardLabel}\n${draft.answers[p.id]}`),draft.config.footerText].filter(Boolean).join('\n\n');}
/** Bound every image page; split long answers without losing text or splitting surrogate pairs. */
export function introCardPages(text:string){const chars=[...text],pages:string[]=[];while(chars.length)pages.push(chars.splice(0,1250).join(''));if(pages.length>10)throw new DomainError('INTRO_CARD_LIMIT','This introduction exceeds Discord’s card attachment limit.');return pages.length?pages:['Pull up a chair.'];}
