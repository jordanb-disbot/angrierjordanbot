import {DomainError} from '../../core/src/errors.js';
export interface IntroPrompt {id:string;sortOrder:number;label:string;cardLabel:string;placeholder:string|null;required:boolean;minLength:number|null;maxLength:number;inputStyle:string;enabled:boolean;showOnCard:boolean;deletedAt:Date|string|null;}
export interface IntroConfig {guildId:string;introductionChannelId:string|null;panelMessageId:string|null;headerText:string;footerText:string;showAvatar:boolean;showDisplayName:boolean;showJoinDate:boolean;allowAdminIntroConfig:boolean;version:number;}
export interface IntroForm {id:string;version:number;title:string;prompts:IntroPrompt[];}
export interface IntroDraft {form:IntroForm;config:IntroConfig;answers:Record<string,string>;baseRevision:number;page:number;previewedVersion:number|null;}
export interface IntroContext {guildId:string;channelId:string;userId:string;requestKey:string;}
export const INTRO_DEFAULTS=[
 {id:'name',label:'What should we call you?',cardLabel:'What should we call you?',required:false,maxLength:80,inputStyle:'short'},
 {id:'doc',label:'What is your drug of choice?',cardLabel:'What is your drug of choice?',required:false,maxLength:100,inputStyle:'short'},
 {id:'character',label:'What fictional character would you choose to get high with?',cardLabel:'What fictional character would you choose to get high with?',required:false,maxLength:400,inputStyle:'paragraph'},
 {id:'opinion',label:'What is your most controversial opinion?',cardLabel:'What is your most controversial opinion?',required:false,maxLength:700,inputStyle:'paragraph'},
 {id:'last_meal',label:'If on death row, what would your last meal be?',cardLabel:'If on death row, what would your last meal be?',required:false,maxLength:500,inputStyle:'paragraph'},
 {id:'chair',label:'What is your favorite type of chair?',cardLabel:'What is your favorite type of chair?',required:false,maxLength:300,inputStyle:'paragraph'}
] as const;
export function activePrompts(form:IntroForm){return form.prompts.filter(p=>p.enabled&&!p.deletedAt).sort((a,b)=>a.sortOrder-b.sortOrder||a.id.localeCompare(b.id));}
export function promptPages(form:IntroForm,pageSize:3|5|100=3){const prompts=activePrompts(form);return Array.from({length:Math.ceil(prompts.length/pageSize)},(_,n)=>prompts.slice(n*pageSize,n*pageSize+pageSize));}
const questionHeading=(p:IntroPrompt,n:number)=>`${n+1}. ${p.label}`;
/** One native text input; explicit headings keep free-form/multiline answers separate. */
export function introductionAnswerSheet(draft:IntroDraft){const value=activePrompts(draft.form).map((p,n)=>`${questionHeading(p,n)}\n${draft.answers[p.id]??''}`).join('\n\n');if(value.length>4000)throw new DomainError('INTRO_SHEET_LIMIT','These saved answers exceed the single-form limit. Ask an admin to shorten the configured questions or answer limits.');return value;}
export function parseIntroductionAnswerSheet(form:IntroForm,value:string){
 if(value.length>4000)throw new DomainError('INTRO_SHEET_LIMIT','Use at most 4,000 characters in the introduction form.');
 const prompts=activePrompts(form),headings=prompts.map(questionHeading),lines=value.replace(/\r\n?/g,'\n').split('\n'),answers:Record<string,string>={};let current=-1;
 for(const line of lines){const heading=headings.indexOf(line.trim());if(heading>=0){if(heading!==current+1)throw new DomainError('INTRO_SHEET_FORMAT','Keep all numbered questions once, in order, and write your answers underneath.');current=heading;answers[prompts[current]!.id]='';}else if(current<0){if(line.trim())throw new DomainError('INTRO_SHEET_FORMAT','Keep the first numbered question above your answers.');}else{const id=prompts[current]!.id;answers[id]+=(answers[id]?'\n':'')+line;}}
 if(current!==prompts.length-1)throw new DomainError('INTRO_SHEET_FORMAT','Keep all numbered questions once, in order, and write your answers underneath.');return Object.fromEntries(Object.entries(answers).map(([id,answer])=>[id,answer.trim()]));
}
export function validateIntroForm(form:IntroForm,config:IntroConfig){
 if(typeof form?.title!=='string'||!Array.isArray(form.prompts)||typeof config?.headerText!=='string'||typeof config.footerText!=='string'||['showAvatar','showDisplayName','showJoinDate','allowAdminIntroConfig'].some(key=>typeof config[key as keyof IntroConfig]!=='boolean'))throw new DomainError('INTRO_FORM','The form configuration is invalid.');
 for(const p of form.prompts)if(!p||typeof p.id!=='string'||typeof p.label!=='string'||typeof p.cardLabel!=='string'||p.placeholder!==null&&typeof p.placeholder!=='string'||['required','enabled','showOnCard'].some(key=>typeof p[key as keyof IntroPrompt]!=='boolean')||p.deletedAt!==null&&!Number.isFinite(new Date(p.deletedAt).getTime()))throw new DomainError('INTRO_PROMPT','A prompt has invalid field types.');
 if(!form.title.trim()||form.title.length>45||!activePrompts(form).length||activePrompts(form).length>100)throw new DomainError('INTRO_FORM','The form needs a title and 1–100 prompts.');
 const ids=new Set<string>();let publicBudget=0;
 for(const p of form.prompts){if(ids.has(p.id)||['__proto__','prototype','constructor'].includes(p.id)||!/^[-a-zA-Z0-9_]{1,80}$/.test(p.id)||!p.label.trim()||p.label.length>300||!p.cardLabel.trim()||p.cardLabel.length>80||!Number.isSafeInteger(p.sortOrder)||!Number.isInteger(p.maxLength)||p.maxLength<1||p.maxLength>4000||p.minLength!==null&&(!Number.isInteger(p.minLength)||p.minLength<0||p.minLength>p.maxLength)||!['short','paragraph'].includes(p.inputStyle)||(p.placeholder?.length??0)>100)throw new DomainError('INTRO_PROMPT','A prompt has invalid labels, length limits or input style.');ids.add(p.id);if(p.enabled&&!p.deletedAt&&p.showOnCard)publicBudget+=p.maxLength+p.cardLabel.length+4;}
 if(publicBudget>10000)throw new DomainError('INTRO_CARD_LIMIT','Visible prompt character limits must total at most 10,000 characters, including labels.');
 if(!config.headerText.trim()||config.headerText.length>80||config.footerText.length>300)throw new DomainError('INTRO_CARD_CONFIG','Use a header of 1–80 and a welcome message of at most 300 characters.');
}
export function saveAnswers(draft:IntroDraft,page:number,submitted:Record<string,string>,pageSize:3|5|100=3):IntroDraft {
 const prompts=promptPages(draft.form,pageSize)[page];if(!Number.isInteger(page)||!prompts)throw new DomainError('INTRO_PAGE','Open a current form page.');
 const allowed=new Set(prompts.map(p=>p.id));if(Object.keys(submitted).some(id=>!allowed.has(id)))throw new DomainError('INTRO_FIELD','This field does not belong to this form page.');
 const answers={...draft.answers};for(const p of prompts){const value=(submitted[p.id]??'').replace(/\r\n?/g,'\n').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,'').trim();if(value.length>p.maxLength||value.length>0&&value.length<(p.minLength??0)||p.required&&!value)throw new DomainError('INTRO_ANSWER',`Check “${p.cardLabel}”: ${p.required?'an answer is required; ':''}use ${p.minLength??0}–${p.maxLength} characters.`);answers[p.id]=value;}
 return{...draft,answers,page,previewedVersion:null};
}
export function validateAnswers(draft:IntroDraft){for(let n=0;n<promptPages(draft.form).length;n++){const values=Object.fromEntries(promptPages(draft.form)[n]!.map(p=>[p.id,draft.answers[p.id]??'']));saveAnswers(draft,n,values);}}
export function introTranscript(draft:IntroDraft,displayName:string,joinedAt?:string){return [draft.config.headerText,draft.config.showDisplayName?displayName:'',draft.config.showJoinDate&&joinedAt?`Joined ${joinedAt}`:'',...activePrompts(draft.form).filter(p=>p.showOnCard&&draft.answers[p.id]?.trim()).map(p=>`${p.cardLabel}\n${draft.answers[p.id]}`),draft.config.footerText].filter(Boolean).join('\n\n');}
/** Bound every image page; split long answers without losing text or splitting surrogate pairs. */
export function introCardPages(text:string){const chars=[...text],pages:string[]=[];while(chars.length)pages.push(chars.splice(0,1250).join(''));if(pages.length>10)throw new DomainError('INTRO_CARD_LIMIT','This introduction exceeds Discord’s card attachment limit.');return pages.length?pages:['Pull up a chair.'];}
