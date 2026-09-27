import test from 'node:test';
import assert from 'node:assert/strict';
import {renderRace} from '../../dist/packages/features-events/src/render.js';
import {renderLine} from '../../dist/packages/features-special/src/render.js';
import {reviewMembers} from '../../scripts/event-review-fixtures.mjs';
const base={id:'entry',state:'OPEN',racers:reviewMembers,pool:'1200',expiresAt:new Date('2100-01-01T12:34:56Z'),extensionUsed:false};
test('Race static entry preserves its deadline and six wheelchairs without a frozen countdown',()=>{
 const svg=renderRace(base,'wide',{waitingMs:60000});
 assert.match(svg,/Closes 12:34:56 UTC/);assert.doesNotMatch(svg,/STARTS IN|data-waiting-seconds/);
 for(let i=1;i<=6;i++)assert.ok(svg.includes('LANE 0'+i));
 assert.match(svg,/6 racers/);assert.match(svg,/1200 Ottomans/);
 assert.equal(svg,renderRace(base,'wide',{waitingMs:1000}));
});
test('Line readiness separates saved statuses, escapes names and handles overflow without claiming automatic start',()=>{
 const members=Array.from({length:13},(_,i)=>({userId:String(i),name:i===0?'<Morgan & Co>':'Member '+i,status:i<7?'ready':'waiting'}));
 const view={...base,ownerId:'0',members,remainingMs:60000,elapsedMs:0};
 const svg=renderLine(view,0,'wide');
 assert.match(svg,/Closes 12:34:56 UTC/);assert.doesNotMatch(svg,/STARTS IN|<Morgan/);
 assert.match(svg,/&lt;Morgan &amp; Co&gt;/);assert.match(svg,/READY TO GO/);assert.match(svg,/NEED A SECOND/);assert.match(svg,/\+2 more/);assert.match(svg,/\+1 more/);
 const locked=renderLine({...view,state:'LOCKED'},0,'wide');assert.match(locked,/Waiting for the host/);assert.doesNotMatch(locked,/Closes 12:34:56/);
});
