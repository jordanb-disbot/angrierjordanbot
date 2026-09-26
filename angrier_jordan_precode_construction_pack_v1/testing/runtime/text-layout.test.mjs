import test from 'node:test';import assert from 'node:assert/strict';
import {wrapText,truncateText,textWidth} from '../../.test-build/packages/renderer/src/text-layout.js';
test('UI wrapping preserves long unbroken names, currency and grapheme clusters without shrinking type',()=>{
 for(const value of ['W'.repeat(80),'9223372036854775807 Ottomans','👨‍👩‍👧‍👦'.repeat(12),'e\u0301'.repeat(80),'椅子'.repeat(25)]){
  const lines=wrapText(value,280,20);assert.ok(lines.every(line=>textWidth(line,20)<=280));assert.equal(lines.join('').replaceAll(' ',''),value.replaceAll(' ',''));
 }
 assert.ok(wrapText('👨‍👩‍👧‍👦'.repeat(12),100,20).every(line=>!line.startsWith('\u200d')&&!line.endsWith('\u200d')));
});
test('UI truncation keeps short labels and marks omitted content; explicit paragraphs survive',()=>{
 assert.equal(truncateText('Won',200,20),'Won');assert.match(truncateText('W'.repeat(50),180,20),/…$/);assert.ok(textWidth(truncateText('W'.repeat(50),180,20),20)<=180);
 assert.deepEqual(wrapText('First\n\nSecond',200,20),['First','','Second']);assert.throws(()=>wrapText('text',0,20),RangeError);
});
