import {createHash} from 'node:crypto';
import {DomainError,VotingEngine} from '../../core/src/index.js';
export const COMMUNITY_KINDS=['poll','superlatives','suggest','ama','giveaway'] as const;
export type CommunityKind=typeof COMMUNITY_KINDS[number];
export interface CommunityMember {id:string;name:string;}
export interface Choice {id:string;label:string;}
export interface Category {id:string;name:string;finalists:CommunityMember[];winner?:CommunityMember;}
export interface Prize {kind:'ottomans'|'item'|'tool'|'recipe'|'collectible'|'custom';value:string;label:string;catalog?:{id:string;type:string;metadata:unknown};}
export interface CommunityData {kind:CommunityKind;phase:'open'|'nominations'|'voting'|'closed';round:number;title:string;anonymous:boolean;hidden:boolean;ranked:boolean;choices:Choice[];seed:string;categories:Category[];season?:number;status?:string;submitterName?:string;answer?:string;prize?:Prize;winnerCount?:number;fee?:string;winners?:CommunityMember[];results?:Record<string,number>;winnerId?:string;entryCount:number;}
export function clean(value:string,max=1000){const v=value.trim();if(!v||v.length>max||/[\u0000-\u0008\u000b-\u001f]/.test(v))throw new DomainError('COMMUNITY_TEXT',`Enter between 1 and ${max} characters.`);return v;}
export function choicesFrom(value:string,max=20){if(!Number.isInteger(max)||max<2||max>25)throw new DomainError('COMMUNITY_CHOICES','The poll choice limit must be between 2 and 25.');const labels=value.split('|').map(x=>clean(x,80));if(labels.length<2||labels.length>max||new Set(labels.map(x=>x.toLowerCase())).size!==labels.length)throw new DomainError('COMMUNITY_CHOICES',`Use 2–${max} distinct choices separated by |.`);return labels.map((label,n)=>({id:String(n+1),label}));}
export function tieOrder(seed:string,ids:readonly string[]){return [...ids].sort((a,b)=>createHash('sha256').update(seed+'\0'+a).digest('hex').localeCompare(createHash('sha256').update(seed+'\0'+b).digest('hex'))||a.localeCompare(b));}
export function validateRanking(ids:readonly string[],choices:readonly string[]){if(!ids.length||ids.length>choices.length||new Set(ids).size!==ids.length||ids.some(id=>!choices.includes(id)))throw new DomainError('COMMUNITY_RANKING','Rank distinct available choices, best first.');return [...ids];}
/** Shared Voting validates every ranked position; persisted ballot is one ordered array per member. */
export function tally(choices:readonly string[],ballots:readonly {voterUserId:string;choiceKey:string}[],ranked:boolean,seed:string){
 const rankings=ballots.map(b=>({user:b.voterUserId,ids:ranked?validateRanking(JSON.parse(b.choiceKey) as string[],choices):validateRanking([b.choiceKey],choices)}));let remaining=[...choices],totals:Record<string,number>={};let winnerId:string|undefined;
 while(remaining.length){const engine=new VotingEngine({anonymous:true,editable:false,hiddenUntilClose:true,eligibleChoices:remaining});for(const b of rankings){const id=b.ids.find(x=>remaining.includes(x));if(id)engine.cast(b.user,id);}totals=engine.results();const total=Object.values(totals).reduce((a,b)=>a+b,0),best=Math.max(...Object.values(totals)),bestIds=remaining.filter(id=>totals[id]===best);if(!total)break;if(!ranked||best>total/2||remaining.length===1){winnerId=tieOrder(seed,bestIds)[0];break;}const low=Math.min(...Object.values(totals)),remove=tieOrder(seed,remaining.filter(id=>totals[id]===low)).at(-1)!;remaining=remaining.filter(id=>id!==remove);}
 return{totals,...(winnerId?{winnerId}:{})};
}
export function parsePrize(value:string):Prize {const at=value.indexOf(':'),kind=value.slice(0,at) as Prize['kind'],v=clean(value.slice(at+1),160);if(at<1||!['ottomans','item','tool','recipe','collectible','custom'].includes(kind)||kind==='ottomans'&&(!/^[1-9][0-9]{0,8}$/.test(v)))throw new DomainError('GIVEAWAY_PRIZE','Use ottomans:amount, item:id, collectible:id, recipe:id, tool:id or custom:description.');return{kind,value:v,label:kind==='ottomans'?v+' Ottomans':v};}
export const SUGGESTION_STATUSES=['OPEN','REVIEWING','ACCEPTED','DECLINED','IMPLEMENTED'] as const;
