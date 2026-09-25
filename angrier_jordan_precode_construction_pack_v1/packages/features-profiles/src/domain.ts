import {dailyCycle} from '../../features-economy/src/service.js';
const STOP=new Set('a an and are as at be been but by for from had has have he her his i if in is it its me my of on or our she so that the their them there they this to us was we were what when where which who will with you your'.split(' '));
export interface MessageObservation {content:string;bot:boolean;command:boolean;excludedChannel:boolean;}
export function qualifyMessage(input:MessageObservation){
 if(input.bot||input.command||input.excludedChannel||/^\s*[!/]\w/.test(input.content))return null;
 const plain=input.content.replace(/https?:\/\/\S+/giu,' ').replace(/<@!?\d+>|<@&\d+>|<#\d+>|<a?:\w+:\d+>/gu,' ');
 const words=plain.normalize('NFKC').toLowerCase().match(/[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*/gu)??[];
 if(!words.length)return null;
 const wordCounts:Record<string,number>=Object.create(null);for(const word of words)if(!STOP.has(word))wordCounts[word]=(wordCounts[word]??0)+1;
 return{messages:1,words:words.length,wordCounts};
}
export interface VoiceMember {userId:string;bot:boolean;selfMuted:boolean;selfDeafened:boolean;}
export function qualifyingVoice(members:VoiceMember[],afk:boolean){const humans=members.filter(m=>!m.bot);return afk||humans.length<2?[]:humans.filter(m=>!m.selfMuted&&!m.selfDeafened).map(m=>m.userId);}
export interface ActivityTotal {userId:string;messages:number;words:number;vcSeconds:number;}
export function spotlightWinners(totals:ActivityTotal[]){
 const categories=['messages','words','vcSeconds'] as const;
 const winners=categories.map(category=>{const max=Math.max(0,...totals.map(t=>t[category]));return{category,value:max,userIds:max>0?totals.filter(t=>t[category]===max).map(t=>t.userId).sort():[]};});
 return{winners,tripleThreat:totals.filter(t=>winners.every(w=>w.userIds.includes(t.userId))).map(t=>t.userId),activeMembers:totals.filter(t=>t.messages||t.words||t.vcSeconds).length,totals:Object.fromEntries(categories.map(k=>[k,totals.reduce((n,t)=>n+t[k],0)]))};
}
export function learnedSpotlightHour(hours:Record<number,number>,previous=19){const eligible=[17,18,19,20,21,22],total=eligible.reduce((n,h)=>n+(hours[h]??0),0);if(total<30)return 19;const best=eligible.sort((a,b)=>(hours[b]??0)-(hours[a]??0)||Math.abs(a-previous)-Math.abs(b-previous))[0]!;return Math.max(17,Math.min(22,Math.round((previous*2+best)/3)));}
export interface AchievementRule {id:string;class:string;criteria:{metric?:string;atLeast?:number;requires?:string[]};}
export function earnedAchievements(rules:AchievementRule[],metrics:Record<string,number>,already:ReadonlySet<string>){const earned=new Set(already);let changed=true;while(changed){changed=false;for(const r of rules){if(earned.has(r.id))continue;const c=r.criteria;const passes=c.metric?Number.isFinite(c.atLeast)&&((metrics[c.metric]??0)>=(c.atLeast??Infinity)):Array.isArray(c.requires)&&c.requires.length>0&&c.requires.every(id=>earned.has(id));if(passes){earned.add(r.id);changed=true;}}}return[...earned].filter(id=>!already.has(id));}

/** Mountain-time 4 AM boundaries match the shared economy calendar, including DST. */
export const recordMonth=(at:Date)=>dailyCycle(at).key.slice(0,7);
export function compareRecord(value:bigint,previous:{value:string;achievedAt:string}|null,at:Date){
 if(value<0n)throw new Error('Record values must be nonnegative.');
 if(previous&&value<=BigInt(previous.value))return null;
 return{oldValue:previous?.value??'0',newValue:value.toString(),heldMs:previous?Math.max(0,at.getTime()-new Date(previous.achievedAt).getTime()):0,achievedAt:at.toISOString()};
}
