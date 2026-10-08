import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {DomainError} from '../../core/src/errors.js';
import {eventRandom,type EventRandom,type Racer} from './domain.js';
const bytes=readFileSync(new URL('../../../content/fight/angrier_jordan_fight_move_pool_v1.json',import.meta.url));
export const FIGHT_POOL_SHA256='eb60c22f152ba5cb8e34cefb9154d701e0aa93ca899d30a869dbd089356999fe';
if(createHash('sha256').update(bytes).digest('hex')!==FIGHT_POOL_SHA256)throw new Error('Approved Fight move pool integrity mismatch.');
interface Attack {id:string;name:string;base_damage_min:number;base_damage_max:number;enabled:boolean;}
interface Heal {id:string;name:string;heal_min:number;heal_max:number;enabled:boolean;}
interface Pool {attacks:Attack[];heals:Heal[];combat_log_templates:Record<string,string>;}
export const fightPool=JSON.parse(bytes.toString('utf8')) as Pool;
if(fightPool.attacks.length!==100||fightPool.heals.length!==36||new Set([...fightPool.attacks,...fightPool.heals].map(m=>m.id)).size!==136)throw new Error('Invalid approved Fight pool counts.');
export type AttackOutcome='normal'|'miss'|'blocked'|'critical';
export const attackOutcome=(roll:number):AttackOutcome=>roll<68?'normal':roll<78?'miss':roll<90?'blocked':'critical';
export interface FightBeat {atMs:number;actor:number;target:number;moveId:string;moveName:string;outcome:AttackOutcome|'heal';amount:number;rolledAmount:number;hp:[number,number];text:string;ko:boolean;}
export interface FightPlan {winnerId:string;durationMs:number;beats:FightBeat[];usedMoveIds:string[];poolHash:string;}
const template=(key:string,values:Record<string,string|number>)=>fightPool.combat_log_templates[key]!.replace(/\{(\w+)\}/g,(_,name)=>String(values[name]??''));
const rollRange=(min:number,max:number,rng:EventRandom)=>min+rng(max-min+1);
function choose<T extends {id:string;enabled:boolean}>(pool:T[],used:Set<string>,recent:Set<string>,rng:EventRandom){const unused=pool.filter(m=>m.enabled&&!used.has(m.id)),fresh=unused.filter(m=>!recent.has(m.id)),available=fresh.length?fresh:unused;if(!available.length)throw new DomainError('FIGHT_POOL_EXHAUSTED','Combat content is unavailable.');const move=available[rng(available.length)]!;used.add(move.id);return move;}
/** Sample complete valid sequences for a winner selected exactly once, before narration. */
export function planFight(fighters:readonly Racer[],recentMoveIds:readonly string[]=[],rng:EventRandom=eventRandom,favoredUserId?:string,bonusPercent=0):FightPlan{
 if(fighters.length!==2||fighters[0]!.userId===fighters[1]!.userId)throw new DomainError('FIGHTERS','Fight requires two distinct members.');
 const favored=favoredUserId?fighters.findIndex(f=>f.userId===favoredUserId):-1;
 const winner=favored>=0&&bonusPercent>0&&rng(100)<Math.min(100,Math.max(0,bonusPercent))?favored:rng(2),recent=new Set(recentMoveIds);
 for(let attempt=0;attempt<2048;attempt++){
  const hp:[number,number]=[100,100],used=new Set<string>(),beats:FightBeat[]=[];let elapsed=0;
  for(let turn=0;turn<30;turn++){
   elapsed+=rollRange(450,500,rng);if(elapsed>16000)break;
   const actor=turn%2,target=1-actor,attacker=fighters[actor]!.name,defender=fighters[target]!.name;
   const healing=hp[actor]!<100&&elapsed<15000&&rng(100)<(elapsed>=12000?5:10);
   let moveId:string,moveName:string,outcome:FightBeat['outcome'],amount:number,rolledAmount:number,text:string;
   if(healing){const move=choose(fightPool.heals,used,recent,rng);moveId=move.id;moveName=move.name;outcome='heal';rolledAmount=rollRange(move.heal_min,move.heal_max,rng);amount=Math.min(100-hp[actor]!,rolledAmount);hp[actor]=hp[actor]!+amount;text=template('heal',{fighter:attacker,move:moveName,heal:amount});}
   else{
    const move=choose(fightPool.attacks,used,recent,rng);moveId=move.id;moveName=move.name;outcome=attackOutcome(rng(100));if(elapsed>=15000&&outcome==='miss')outcome='normal';
    const base=rollRange(move.base_damage_min,move.base_damage_max,rng);rolledAmount=outcome==='miss'?0:outcome==='blocked'?Math.max(1,Math.round(base*rollRange(25,45,rng)/100)):outcome==='critical'?Math.round(base*rollRange(165,190,rng)/100):base;
    amount=Math.min(hp[target]!,rolledAmount);if(elapsed<12000&&amount>=hp[target]!)amount=Math.max(0,hp[target]!-1);hp[target]=hp[target]!-amount;text=template(outcome,{attacker,defender,move:moveName,damage:amount});
   }
   const ko=hp[0]===0||hp[1]===0;beats.push({atMs:elapsed,actor,target:outcome==='heal'?actor:target,moveId,moveName,outcome,amount,rolledAmount,hp:[...hp],text,ko});
   if(ko){if(hp[winner]!>0&&elapsed>=12000)return{winnerId:fighters[winner]!.userId,durationMs:elapsed,beats,usedMoveIds:[...used],poolHash:FIGHT_POOL_SHA256};break;}
  }
 }
 throw new DomainError('FIGHT_PLAN_RETRY','Combat preparation needs a retry. No wagers have been settled.');
}
/** Reveals only resolved beats. The future winner and complete private plan stay server-side. */
export function fightSnapshot(plan:FightPlan,elapsedMs:number,fighters:readonly Racer[]){
 const beats=plan.beats.filter(b=>b.atMs<=elapsedMs),last=beats.at(-1),finished=beats.length===plan.beats.length;
 const hp=last?.hp??[100,100];return{hp:[...hp] as [number,number],action:last??null,log:beats.slice(-3).map(b=>b.text),finished,...(finished?{winnerId:plan.winnerId,koText:template('ko',{winner:fighters.find(f=>f.userId===plan.winnerId)!.name,loser:fighters.find(f=>f.userId!==plan.winnerId)!.name})}:{})};
}
