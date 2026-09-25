import test from 'node:test';import assert from 'node:assert/strict';
import {planFight,fightSnapshot,fightPool,attackOutcome,FIGHT_POOL_SHA256} from '../../.test-build/packages/features-events/src/fight.js';
const fighters=[{userId:'a',name:'Jordan',chair:1},{userId:'b',name:'Alex',chair:2}];
export const seeded=seed=>max=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return Math.floor(seed/4294967296*max);};
test('approved pool counts and attack probability partition remain exact',()=>{assert.equal(fightPool.attacks.length,100);assert.equal(fightPool.heals.length,36);const count={};for(let i=0;i<100;i++){const outcome=attackOutcome(i);count[outcome]=(count[outcome]??0)+1;}assert.deepEqual(count,{normal:68,miss:10,blocked:12,critical:10});});
test('sampled combat preserves the initial fair winner, alternating turns, authoritative HP and hard timing bounds',()=>{
 const outcomes={a:0,b:0};let sum=0;
 for(let seed=1;seed<=400;seed++){
  const random=seeded(seed*9973),expected=seeded(seed*9973)(2),plan=planFight(fighters,[],random);assert.equal(plan.winnerId,fighters[expected].userId);outcomes[plan.winnerId]++;sum+=plan.durationMs;assert.ok(plan.durationMs>=22000&&plan.durationMs<=28000);assert.equal(plan.poolHash,FIGHT_POOL_SHA256);assert.equal(new Set(plan.usedMoveIds).size,plan.beats.length);
  let hp=[100,100],at=0;for(const [index,beat] of plan.beats.entries()){assert.equal(beat.actor,index%2);assert.ok(beat.atMs-at>=1350&&beat.atMs-at<=1650);assert.ok(beat.amount>=0);const next=[...hp];next[beat.target]+=beat.outcome==='heal'?beat.amount:-beat.amount;assert.deepEqual(beat.hp,next);assert.ok(next.every(v=>v>=0&&v<=100));if(beat.outcome==='heal')assert.ok(hp[beat.actor]<100);if(index<plan.beats.length-1)assert.ok(next.every(v=>v>0));hp=next;at=beat.atMs;}
  assert.ok(hp[expected]>0);assert.equal(hp[1-expected],0);assert.equal(plan.beats.at(-1).ko,true);const before=fightSnapshot(plan,plan.durationMs-1,fighters);assert.equal(before.finished,false);assert.equal(before.winnerId,undefined);const final=fightSnapshot(plan,plan.durationMs,fighters);assert.deepEqual(final.hp,hp);assert.equal(final.winnerId,plan.winnerId);assert.ok(final.log.length<=3);assert.deepEqual(final,fightSnapshot(JSON.parse(JSON.stringify(plan)),plan.durationMs+1,fighters));
 }
 assert.ok(outcomes.a>150&&outcomes.b>150);assert.ok(sum/400>=22000&&sum/400<=28000);
});
test('moves from the previous three fights are suppressed without changing the approved pool',()=>{
 const previous=[];for(let i=0;i<8;i++){const recent=previous.slice(-3).flat(),plan=planFight(fighters,recent,seeded(76543+i*4567));assert.ok(plan.usedMoveIds.every(id=>!recent.includes(id)));previous.push(plan.usedMoveIds);}
});
