import test from 'node:test';
import assert from 'node:assert/strict';
import {planRace,raceSnapshot,eventPayouts} from '../../.test-build/packages/features-events/src/domain.js';
const racers=Array.from({length:6},(_,i)=>({userId:String(i),name:'Member '+i,chair:i+1}));
test('each equally indexed fair draw selects its racer before motion is planned',()=>{
 for(let winner=0;winner<6;winner++){let first=true;const plan=planRace(racers,max=>{if(first){first=false;assert.equal(max,6);return winner;}return 0;});assert.equal(plan.winnerId,String(winner));assert.equal(plan.durationMs,30000);}
});
test('one monotonic progress snapshot drives standings and only the selected racer finishes',()=>{
 for(let seed=1;seed<=30;seed++){let state=seed;const rng=max=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state%max;};const plan=planRace(racers,rng),last=new Map();
  for(let elapsed=0;elapsed<plan.durationMs;elapsed+=250){const frame=raceSnapshot(plan,elapsed);assert.equal(frame.finished,false);assert.equal(frame.winnerId,undefined);for(const row of frame.rows){assert.ok(row.progress>=0&&row.progress<100);assert.ok(row.progress>=(last.get(row.userId)??0));last.set(row.userId,row.progress);}for(let i=1;i<frame.rows.length;i++)assert.ok(frame.rows[i-1].progress>=frame.rows[i].progress);}
  const final=raceSnapshot(plan,plan.durationMs);assert.equal(final.rows[0].userId,plan.winnerId);assert.equal(final.rows[0].progress,100);assert.equal(final.rows.filter(r=>r.progress===100).length,1);assert.deepEqual(final,raceSnapshot(JSON.parse(JSON.stringify(plan)),plan.durationMs+10000));
 }
});
test('whole Ottoman proportional settlement distributes all 95 percent with stable remainder allocation',()=>{
 const wagers=[{userId:'a',selectionKey:'winner',amount:10n},{userId:'b',selectionKey:'winner',amount:20n},{userId:'c',selectionKey:'other',amount:71n}],result=eventPayouts(wagers,'winner');assert.equal(result.total,101n);assert.equal(result.rake,6n);assert.equal([...result.payouts.values()].reduce((a,b)=>a+b,0n),95n);assert.equal(result.payouts.get('a'),32n);assert.equal(result.payouts.get('b'),63n);assert.equal(result.refund,false);
});
test('owner policy refunds all wagers without rake when nobody backed the winner',()=>{
 const result=eventPayouts([{userId:'a',selectionKey:'loser',amount:123n}],'winner');assert.equal(result.refund,true);assert.equal(result.rake,0n);assert.equal(result.total,123n);assert.equal(result.payouts.size,0);assert.equal(eventPayouts([],'winner').refund,false);
});
