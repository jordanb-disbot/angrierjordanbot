import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {raceWheelchair,art} from '../../dist/packages/features-events/src/visual.js';
import {renderRace} from '../../dist/packages/features-events/src/render.js';
test('all six wheelchair skins persist through compact and wide race states',()=>{
 const sprites=Array.from({length:6},(_,i)=>'data:image/png;base64,'+fs.readFileSync(`production/event_art/v6/wheelchair-${i+1}-runtime.png`).toString('base64'));
 assert.equal(new Set(sprites).size,6);
 for(let n=1;n<=6;n++){
  assert.equal(raceWheelchair(n),sprites[n-1]);assert.equal(art('race_chair',n),sprites[n-1]);
  const base={state:'OPEN',racers:[{userId:'member',name:'Member',chair:n}],pool:'0',winnerId:'member',result:{pool:'0',rake:'0',refunded:false},motion:{rows:[{userId:'member',place:1,progress:70}]}};
  for(const layout of ['compact','wide'])for(const state of ['OPEN','LOCKED','CLOSED'])assert.ok(renderRace({...base,state},layout).includes(sprites[n-1]),`${layout} ${state} wheelchair ${n}`);
 }
});
