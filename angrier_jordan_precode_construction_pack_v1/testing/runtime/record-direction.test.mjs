import test from 'node:test';
import assert from 'node:assert/strict';
import {compareRecord,recordDirection} from '../../.test-build/packages/features-profiles/src/domain.js';
test('solo fastest and fewest records improve downward, cumulative wins improve upward, ties do not replace holders',()=>{
 const at=new Date('2026-09-25T20:00:00Z'),old={value:'100',achievedAt:'2026-09-24T20:00:00Z'};
 for(const key of ['solo.wordscramble.fastest_ms','solo.minesweeper.4.fastest_ms','solo.minesweeper.5.fastest_ms','solo.mastermind.fewest_guesses']){
  const direction=recordDirection(key);assert.equal(direction,'min');assert.equal(compareRecord(90n,old,at,direction).newValue,'90');assert.equal(compareRecord(100n,old,at,direction),null);assert.equal(compareRecord(110n,old,at,direction),null);assert.equal(compareRecord(90n,null,at,direction).newValue,'90');
 }
 assert.equal(recordDirection('solo.hangman.wins'),'max');assert.equal(compareRecord(90n,old,at),null);assert.equal(compareRecord(110n,old,at).newValue,'110');
});
