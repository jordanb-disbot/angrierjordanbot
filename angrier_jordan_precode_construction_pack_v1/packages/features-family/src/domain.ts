import {createHmac} from 'node:crypto';
import {DomainError,VotingEngine,type Ballot} from '../../core/src/index.js';

export const DAY=86_400_000;
export const FAMILY_ITEMS={ring:'family.ring',sack:'family.wedding_sack',blessing:'family.blessing'} as const;
export const FAMILY_PERKS=['Brass Family Portrait','Emerald Family Portrait','Midnight Family Portrait'] as const;
export interface FamilyMember {userId:string;name:string;avatar:string;}
export interface FamilyContext {guildId:string;channelId:string;userId:string;requestKey:string;}
export interface FamilyPolicy {
 proposalHours:number;divorceMinDays:number;remarryDays:number;graceHours:number;auctionMinHours:number;auctionMaxHours:number;
 childSlotDays:number[];marriageVoteHours:number;cooldownBaseSeconds:number;cooldownMaxSeconds:number;cooldownQuietHours:number;
}
export const DEFAULT_FAMILY_POLICY:FamilyPolicy={proposalHours:24,divorceMinDays:3,remarryDays:7,graceHours:24,auctionMinHours:1,auctionMaxHours:72,childSlotDays:[3,7,14,30,60],marriageVoteHours:3,cooldownBaseSeconds:1800,cooldownMaxSeconds:86400,cooldownQuietHours:168};
export function pairKey(a:string,b:string){if(a===b)throw new DomainError('FAMILY_SELF','Choose another member.');return[a,b].sort().join(':');}
export function relationshipFlavor(guildId:string,a:string,b:string,secret:string,marriageId:string){
 if(secret.length<32)throw new DomainError('FAMILY_SECRET','A stable family compatibility secret is required.');
 const pair=createHmac('sha256',secret).update(guildId+':'+pairKey(a,b)).digest(),compatibility=10+pair.readUInt32BE(0)%91;
 const offset=createHmac('sha256',secret).update(guildId+':'+marriageId+':success').digest().readUInt32BE(0)%31-15;
 let success=Math.max(1,Math.min(99,Math.round(compatibility*.75+12+offset)));
 if(success===compatibility)success=success===99?98:success+1;
 return{compatibility,success};
}
export function childSlots(startedAt:Date,now:Date,bonus=false,days:readonly number[]=DEFAULT_FAMILY_POLICY.childSlotDays){const age=Math.max(0,(now.getTime()-startedAt.getTime())/DAY),normal=days.filter(day=>age>=day).length;return Math.min(5,Math.max(normal,bonus?1:0));}
export function marriageVoting(ballots:readonly Ballot[]){const engine=new VotingEngine({anonymous:true,editable:true,hiddenUntilClose:false,eligibleChoices:['up','down']});for(const ballot of ballots)engine.cast(ballot.voterUserId,ballot.choiceKey,ballot.updatedAt,ballot.questionKey);const totals=engine.results(),total=(totals.up??0)+(totals.down??0),approval=total?Math.round((totals.up??0)/total*10000)/100:0;return{engine,totals,total,approval,firstChildBonus:total>=5&&(totals.up??0)*100>total*80};}
export function cooldownUntil(events:readonly string[],now:Date,policy:FamilyPolicy){const recent=events.map(value=>new Date(value)).filter(date=>Number.isFinite(date.getTime())&&now.getTime()-date.getTime()<policy.cooldownQuietHours*3_600_000).sort((a,b)=>b.getTime()-a.getTime());if(!recent.length)return now;return new Date(recent[0]!.getTime()+Math.min(policy.cooldownMaxSeconds,policy.cooldownBaseSeconds*2**Math.min(20,recent.length-1))*1000);}
export interface ActiveMarriage {id:string;userA:string;userB:string;startedAt:Date;bonus?:boolean;}
export interface ActiveAdoption {id:string;parentPairKey:string;childUserId:string;parents:[string,string];}
/** Active edges only; no ended identity information enters the tree projection. */
export function familyComponents(marriages:readonly ActiveMarriage[],adoptions:readonly ActiveAdoption[]){const graph=new Map<string,Set<string>>(),link=(a:string,b:string)=>{if(!graph.has(a))graph.set(a,new Set());if(!graph.has(b))graph.set(b,new Set());graph.get(a)!.add(b);graph.get(b)!.add(a);};for(const m of marriages)link(m.userA,m.userB);for(const a of adoptions){link(a.parents[0],a.childUserId);link(a.parents[1],a.childUserId);}const seen=new Set<string>(),groups:string[][]=[];for(const id of graph.keys()){if(seen.has(id))continue;const group:string[]=[],pending=[id];while(pending.length){const next=pending.pop()!;if(seen.has(next))continue;seen.add(next);group.push(next);pending.push(...graph.get(next)!);}groups.push(group.sort());}return groups.sort((a,b)=>b.length-a.length||a.join(':').localeCompare(b.join(':')));}
export function validateAuctionHours(value:number,policy:FamilyPolicy){if(!Number.isInteger(value)||value<policy.auctionMinHours||value>policy.auctionMaxHours||value<1||value>72)throw new DomainError('FAMILY_AUCTION_DURATION','Choose an auction duration from 1 to 72 hours.');return value;}
export function positiveMoney(value:bigint){if(value<=0n)throw new DomainError('FAMILY_BID','Enter a positive Ottoman amount.');return value;}
export type FamilyItemReservation={itemId:string;quantity:number;state:string};
export type FamilyData={itemEscrow?:FamilyItemReservation[];kind:'marriage'|'adoption'|'divorce'|'auction'|'estate'|'ended';members?:FamilyMember[];targetId?:string;marriageId?:string;proposalItem?:string;marriedAt?:string;blessingConsumed?:boolean;compatibility?:number;success?:number;firstChildBonus?:boolean;spouseCounts?:Record<string,number>;voteResult?:{up:number;down:number;total:number;approval:number};amount?:string;payerId?:string;receiverId?:string;auctionType?:'spouse'|'child'|'estate';reserve?:string;winnerId?:string;result?:string;asset?:EstateAsset;departedId?:string;heirId?:string;executed?:boolean;reason?:string;departedAt?:string;graceEndsAt?:string;auctionIds?:string[];assetsTransferred?:number};
export type EstateAsset={kind:'stack';itemId:string;quantity:number;locked:boolean}|{kind:'tool';id:string}|{kind:'chair';id:string};
