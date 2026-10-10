import test from 'node:test';
import assert from 'node:assert/strict';
import {renderRace} from '../../dist/packages/features-events/src/render.js';
import {raceSnapshot} from '../../dist/packages/features-events/src/domain.js';
import {renderLine} from '../../dist/packages/features-special/src/render.js';
import {reviewMembers,reviewPlans} from '../../scripts/event-review-fixtures.mjs';
const base={id:'entry',state:'OPEN',racers:reviewMembers,pool:'1200',expiresAt:new Date('2100-01-01T12:34:56Z'),extensionUsed:false};
test('Race waiting art reserves a live timer region and shows the full grid without a frozen countdown',()=>{
 const svg=renderRace(base,'wide',{waitingMs:60000});
 assert.match(svg,/LIVE COUNTDOWN/);assert.match(svg,/Time remaining updates below/);assert.doesNotMatch(svg,/Closes |12:34:56 UTC|STARTS IN|data-waiting-seconds/);
 for(let i=1;i<=6;i++)assert.ok(svg.includes('LANE 0'+i));
 assert.match(svg,/6 racers · 0 open/);assert.match(svg,/Ready to start/);assert.match(svg,/1200 Ottomans/);
 assert.equal(svg,renderRace(base,'wide',{waitingMs:1000}));
});
test('Race waiting art shows open seats and the minimum-player readiness state',()=>{
 const svg=renderRace({...base,racers:reviewMembers.slice(0,1)},'wide',{waitingMs:1000});
 assert.match(svg,/1 racer · 5 open/);assert.match(svg,/Need 2 racers/);assert.match(svg,/An open seat awaits/);
 assert.ok(svg.includes('fill="#041923" fill-opacity=".82"'));
});
test('Line readiness separates saved statuses, escapes names and handles overflow without claiming automatic start',()=>{
 const members=Array.from({length:13},(_,i)=>({userId:String(i),name:i===0?'<Morgan & Co>':'Member '+i,status:i<7?'ready':'waiting'}));
 const view={...base,ownerId:'0',members,remainingMs:60000,elapsedMs:0};
 const svg=renderLine(view,0,'wide');
 assert.match(svg,/READINESS OPEN/);assert.match(svg,/Timer updates live/);assert.doesNotMatch(svg,/Closes |12:34:56 UTC|<Morgan/);
 assert.match(svg,/&lt;Morgan &amp; Co&gt;/);
 assert.notEqual(svg,renderLine({...view,remainingMs:1000},0,'wide'));
});
test('Race and Line waiting, live and finale art use the full-width 1200 by 640 frame',()=>{
 const motion=raceSnapshot(reviewPlans.race,reviewPlans.race.durationMs*.58);
 const race=[base,{...base,state:'LOCKED',motion},{...base,state:'CLOSED',motion,winnerId:reviewPlans.race.winnerId,result:{pool:'1200',rake:'60',refunded:false}}];
 const lineBase={...base,ownerId:'fixture-0',members:reviewMembers.map((m,i)=>({...m,status:i<4?'ready':'waiting'})),remainingMs:60000,elapsedMs:0,durationMs:5000};
 const line=[lineBase,{...lineBase,state:'SETTLING',elapsedMs:2000},{...lineBase,state:'CLOSED',elapsedMs:5000}];
 for(const view of race)assert.match(renderRace(view,'wide'),/width="1200" height="640"/);
 for(const view of line)assert.match(renderLine(view,view.elapsedMs,'wide'),/width="1200" height="640"/);
});
