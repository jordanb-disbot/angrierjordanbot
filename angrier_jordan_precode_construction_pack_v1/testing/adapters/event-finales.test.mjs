import test from 'node:test';import assert from 'node:assert/strict';
import {renderRace} from '../../dist/packages/features-events/src/render.js';
import {renderFight} from '../../dist/packages/features-events/src/fight-render.js';
import {renderLine,lineSequence} from '../../dist/packages/features-special/src/render.js';
const racers=[{userId:'winner',name:'Winner <&> '+ 'long '.repeat(10),chair:1},{userId:'loser',name:'Opponent',chair:2}],base={id:'fixture',state:'CLOSED',racers,winnerId:'winner',pool:'0',result:{pool:'0',refunded:false},combat:{hp:[61,0]},motion:{rows:[{userId:'winner',place:1},{userId:'loser',place:2}]}};
test('Race and Fight get distinct deterministic grand finale scenes with clear winner identity',()=>{for(const[kind,render]of [['race',v=>renderRace(v,'wide')],['fight',v=>renderFight(v,{},'wide')]]){const svg=render(base);assert.ok(svg.includes(kind==='race'?'CHAMPION OF THE CHAIRS':'ARENA CHAMPION'));assert.ok(svg.includes('Winner &lt;&amp;&gt;'));assert.ok(!/=["']NaN/.test(svg));assert.equal(svg,render(base));if(kind==='fight'){assert.ok(svg.includes('DEFEATED'));assert.ok(svg.includes('Opponent'));}assert.notEqual(svg,render({...base,state:'OPEN'}));}});
test('Line one-shot ends on the same persistent grand finale as the completed card',()=>{const v={state:'SETTLING',durationMs:9000,elapsedMs:8800,ownerId:'winner',members:racers.map(r=>({...r,status:'ready'})),remainingMs:200};const seq=lineSequence(v,'wide'),final=renderLine({...v,state:'CLOSED'},9000,'wide');assert.equal(seq.frames.at(-1),final);assert.ok(final.includes('LINE COMPLETE'));assert.ok(!final.includes('THE MOMENT IS OURS'));assert.ok(!final.includes('An open seat.'));});

test('Line chair-built numerals and room remain consistent through every state',()=>{
 const v={state:'SETTLING',durationMs:9000,elapsedMs:0,ownerId:'winner',members:racers.map(r=>({...r,status:'ready'})),remainingMs:60000};
 const room=svg=>svg.match(/<g clip-path="url\(#wide\)"><image href="([^"]+)"/)?.[1];
 const stages=[renderLine({...v,state:'OPEN'},0,'wide')];
 for(let second=0;second<5;second++){const svg=renderLine(v,second*1000,'wide');assert.ok(svg.includes('data-countdown-number="'+(5-second)+'"'));stages.push(svg);}
 stages.push(renderLine(v,5500,'wide'),renderLine({...v,state:'CLOSED'},9000,'wide'));
 assert.ok(room(stages[0]));for(const svg of stages)assert.ok(room(svg)===room(stages[0]),'identical lounge backdrop in every phase');
});

test('every chair skin is distinct and the winning skin survives the finale',()=>{
 for(const render of [v=>renderRace(v,'wide'),v=>renderFight(v,{},'wide')]){
  const outputs=Array.from({length:6},(_,i)=>render({...base,racers:[{...racers[0],chair:i+1},racers[1]]}));
  assert.equal(new Set(outputs).size,6);
  outputs.forEach((svg,i)=>assert.ok(svg.includes('data-winner-chair="'+(i+1)+'"')));
 }
});
