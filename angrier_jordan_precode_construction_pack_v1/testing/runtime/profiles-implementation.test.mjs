import test from 'node:test';
import assert from 'node:assert/strict';
import {qualifyMessage,qualifyingVoice,spotlightWinners,learnedSpotlightHour,earnedAchievements} from '../../.test-build/packages/features-profiles/src/domain.js';
const message=content=>({content,bot:false,command:false,excludedChannel:false});
test('message qualification excludes links, mentions, emoji, bots and commands',()=>{for(const content of ['https://example.com','<@123456>','😀 <:chair:123456>','!race','/profile'])assert.equal(qualifyMessage(message(content)),null);assert.equal(qualifyMessage({...message('hello'),bot:true}),null);assert.equal(qualifyMessage({...message('hello'),excludedChannel:true}),null);});
test('natural words count stop words but exclude them only from most-used-word histogram',()=>{const q=qualifyMessage(message('The chair and the lounge https://example.com <@123456> 😀'));assert.equal(q.words,5);assert.deepEqual({...q.wordCounts},{chair:1,lounge:1});});
test('voice qualification requires another human and excludes AFK/self-muted/deafened members',()=>{const a={userId:'a',bot:false,selfMuted:false,selfDeafened:false};assert.deepEqual(qualifyingVoice([a],false),[]);assert.deepEqual(qualifyingVoice([a,{...a,userId:'bot',bot:true}],false),[]);assert.deepEqual(qualifyingVoice([a,{...a,userId:'b',selfMuted:true}],false),['a']);assert.deepEqual(qualifyingVoice([a,{...a,userId:'b'}],true),[]);});
test('weekly ties award each co-winner and qualify permanent Triple Threat',()=>{const result=spotlightWinners([{userId:'a',messages:20,words:100,vcSeconds:400},{userId:'b',messages:20,words:100,vcSeconds:400}]);assert.deepEqual(result.tripleThreat,['a','b']);for(const w of result.winners)assert.deepEqual(w.userIds,['a','b']);});
test('an inactive week gives no titles or Triple Threat',()=>{const result=spotlightWinners([{userId:'a',messages:0,words:0,vcSeconds:0}]);assert.deepEqual(result.tripleThreat,[]);assert.ok(result.winners.every(w=>!w.userIds.length));});
test('learned announcement stays in Monday evening bounds and smooths shifts',()=>{assert.equal(learnedSpotlightHour({22:10}),19);assert.equal(learnedSpotlightHour({22:100},19),20);assert.equal(learnedSpotlightHour({2:500,17:100},19),18);});
test('achievement/mastery/legacy dependencies resolve idempotently without cyclic awards',()=>{const rules=[{id:'legacy',class:'Legacy',criteria:{requires:['mastery']}},{id:'mastery',class:'Mastery',criteria:{requires:['first']}},{id:'first',class:'Achievement',criteria:{metric:'crafts',atLeast:1}},{id:'cycleA',class:'Mastery',criteria:{requires:['cycleB']}},{id:'cycleB',class:'Mastery',criteria:{requires:['cycleA']}}];const first=earnedAchievements(rules,{crafts:1},new Set());assert.deepEqual(new Set(first),new Set(['first','mastery','legacy']));assert.deepEqual(earnedAchievements(rules,{crafts:1},new Set(first)),[]);});

import {recordMonth,compareRecord} from '../../.test-build/packages/features-profiles/src/domain.js';
test('monthly records reset at 4 AM Mountain on the first across daylight and standard time',()=>{
 assert.equal(recordMonth(new Date('2026-10-01T09:59:59Z')),'2026-09');
 assert.equal(recordMonth(new Date('2026-10-01T10:00:00Z')),'2026-10');
 assert.equal(recordMonth(new Date('2026-12-01T10:59:59Z')),'2026-11');
 assert.equal(recordMonth(new Date('2026-12-01T11:00:00Z')),'2026-12');
});
test('record comparisons retain exact Ottoman integers, hold time, and ignore ties',()=>{
 const old={value:'9007199254740993',achievedAt:'2026-09-24T12:00:00Z'},at=new Date('2026-09-25T12:00:00Z');
 assert.equal(compareRecord(9007199254740993n,old,at),null);
 assert.equal(compareRecord(9007199254740992n,old,at),null);
 assert.deepEqual(compareRecord(9007199254740994n,old,at),{oldValue:old.value,newValue:'9007199254740994',heldMs:86400000,achievedAt:at.toISOString()});
});

test('learned Spotlight consumes configured fallback and window while smoothing from prior timing',()=>{
 const settings={fallbackHour:21,startHour:8,endHour:12};
 assert.equal(learnedSpotlightHour({12:29,22:500},19,settings),21);
 assert.equal(learnedSpotlightHour({8:100,22:500},undefined,settings),11);
 assert.equal(learnedSpotlightHour({8:100},10,settings),9);
 assert.equal(learnedSpotlightHour({12:100},19,settings),12);
 assert.equal(learnedSpotlightHour({8:30,12:30},10,settings),9);
});
test('invalid Spotlight posting configuration fails before selecting a schedule',()=>{
 for(const settings of [{fallbackHour:16,startHour:17,endHour:22},{fallbackHour:19,startHour:22,endHour:17},{fallbackHour:19,startHour:17,endHour:17},{fallbackHour:19,startHour:-1,endHour:22},{fallbackHour:19,startHour:17,endHour:24},{fallbackHour:19,startHour:17.5,endHour:22}])assert.throws(()=>learnedSpotlightHour({},undefined,settings),{code:'SPOTLIGHT_POSTING_CONFIG'});
});
