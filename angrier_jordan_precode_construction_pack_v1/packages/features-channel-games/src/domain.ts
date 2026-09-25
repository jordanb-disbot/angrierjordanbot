import {DomainError} from '../../core/src/index.js';
export interface CountingState {count:string;lastUserId:string|null;awardedThrough:string;restore?:{count:string;lastUserId:string|null;awardedThrough:string;breakerId:string};}
export const initialCounting=():CountingState=>({count:'0',lastUserId:null,awardedThrough:'0'});
export function countingTurn(state:CountingState,userId:string,input:string){
 const content=input.trim();if(!/^-?\d{1,128}$/.test(content))return null;
 const n=BigInt(content),valid=n===BigInt(state.count)+1n&&userId!==state.lastUserId;
 if(!valid)return{state:{...initialCounting(),restore:{count:state.count,lastUserId:state.lastUserId,awardedThrough:state.awardedThrough,breakerId:userId}},valid:false,milestone:false,previous:state.count};
 const milestone=n%100n===0n&&n>BigInt(state.awardedThrough);return{state:{count:n.toString(),lastUserId:userId,awardedThrough:milestone?n.toString():state.awardedThrough},valid:true,milestone,previous:state.count};
}
export function restoreCounting(state:CountingState):CountingState {if(!state.restore)throw new DomainError('COUNTING_RESTORE','This reset is no longer restorable.');const {count,lastUserId,awardedThrough}=state.restore;return{count,lastUserId,awardedThrough};}
export interface LetterState {round:number;lastWord:string|null;lastUserId:string|null;used:string[];scores:Record<string,number>;}
export const initialLetter=(round=1):LetterState=>({round,lastWord:null,lastUserId:null,used:[],scores:{}});
export function letterTurn(state:LetterState,userId:string,input:string,known:(word:string)=>boolean){
 const word=input.trim().toLowerCase();let reason:string|undefined;
 if(!/^[a-z]+(?:'[a-z]+)?$/.test(word)||word.length>64||!known(word))reason='Use a recognized English word or common slang, without names, usernames or abbreviations.';
 else if(state.lastUserId===userId)reason='Another member must take the next valid turn.';
 else if(state.used.includes(word))reason='That word has already appeared in this round.';
 else if(state.lastWord&&word[0]!==state.lastWord.at(-1))reason=`Start with ${state.lastWord.at(-1)!.toUpperCase()}.`;
 const points=reason?-1:word[0]===word.at(-1)?2:1,score=(state.scores[userId]??0)+points;
 const next={...state,scores:{...state.scores,[userId]:score},...(!reason?{lastWord:word,lastUserId:userId,used:[...state.used,word]}:{})};
 const won=!reason&&score>=50;return{state:won?initialLetter(state.round+1):next,valid:!reason,reason,word,points,score,won,finishedRound:state.round};
}
