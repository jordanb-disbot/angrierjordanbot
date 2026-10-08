import {randomInt} from 'node:crypto';
import {DomainError} from '../../core/src/errors.js';
export type EventRandom=(max:number)=>number;
export const eventRandom:EventRandom=max=>randomInt(max);
export interface Racer {userId:string;name:string;avatarUrl?:string;joinedAt?:string;chair:number;}
export interface RacePlan {durationMs:number;winnerId:string;tracks:{userId:string;points:number[]}[];}
/** Winner is drawn first, independently of decoration and motion. Store this plan privately. */
export function planRace(racers:readonly Racer[],rng:EventRandom=eventRandom,favoredUserId?:string,bonusPercent=0):RacePlan{
 if(racers.length<2||racers.length>6||new Set(racers.map(r=>r.userId)).size!==racers.length)throw new DomainError('RACER_COUNT','A race needs two to six distinct racers.');
 // Keep the public Chair Race presentation on a predictable 30-second beat.
 // The persisted plan remains deterministic/restart-safe; only the duration
 // is normalized so Discord receives a bounded animation window.
 const favored=favoredUserId&&racers.some(r=>r.userId===favoredUserId)?favoredUserId:undefined;
 const winnerId=favored&&bonusPercent>0&&rng(100)<Math.min(100,Math.max(0,bonusPercent))?favored:racers[rng(racers.length)]!.userId,durationMs=30000;
 const tracks=racers.map(r=>{const finish=r.userId===winnerId?100:90+rng(10),weights=Array.from({length:12},()=>4+rng(13)),sum=weights.reduce((a,b)=>a+b,0);let value=0;const points=[0,...weights.map(w=>(value+=w)*finish/sum)];points[points.length-1]=finish;return{userId:r.userId,points};});
 return{winnerId,durationMs,tracks};
}
/** Position, percentage, standings and finish detection all consume these exact values. */
export function raceSnapshot(plan:RacePlan,elapsedMs:number){
 const fraction=Math.max(0,Math.min(1,elapsedMs/plan.durationMs));
 const rows=plan.tracks.map(track=>{const offset=fraction*(track.points.length-1),left=Math.min(track.points.length-2,Math.floor(offset)),mix=offset-left;return{userId:track.userId,progress:track.points[left]!+(track.points[left+1]!-track.points[left]!)*mix};});
 rows.sort((a,b)=>b.progress-a.progress||a.userId.localeCompare(b.userId));
 return{finished:fraction===1,rows:rows.map((row,i)=>({...row,place:i+1})),...(fraction===1?{winnerId:plan.winnerId}:{})};
}
export interface EventWager {userId:string;selectionKey:string;amount:bigint;}
/** Whole-Ottoman largest-remainder allocation preserves the entire distributable 95%. */
export function eventPayouts(wagers:readonly EventWager[],winnerId:string){
 const total=wagers.reduce((n,w)=>n+w.amount,0n),winners=new Map<string,bigint>();
 for(const w of wagers){if(w.amount<=0n)throw new DomainError('WAGER_AMOUNT','Invalid wager amount.');if(w.selectionKey===winnerId)winners.set(w.userId,(winners.get(w.userId)??0n)+w.amount);}
 const winningStake=[...winners.values()].reduce((a,b)=>a+b,0n),distributable=total*95n/100n;
 if(!winningStake)return{total,rake:0n,payouts:new Map<string,bigint>(),refund:total>0n};
 const shares=[...winners].map(([userId,amount])=>({userId,amount:distributable*amount/winningStake,remainder:distributable*amount%winningStake}));
 shares.sort((a,b)=>a.remainder===b.remainder?a.userId.localeCompare(b.userId):a.remainder>b.remainder?-1:1);
 let remaining=distributable-shares.reduce((n,s)=>n+s.amount,0n);for(const share of shares)if(remaining>0n){share.amount++;remaining--;}
 return{total,rake:total-distributable,payouts:new Map(shares.map(s=>[s.userId,s.amount])),refund:false};
}
