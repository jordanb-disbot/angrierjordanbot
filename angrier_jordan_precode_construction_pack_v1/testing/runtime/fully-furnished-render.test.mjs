import test from 'node:test';
import assert from 'node:assert/strict';
import {renderPremiumAchievements} from '../../dist/packages/features-profiles/src/premium-render.js';
test('achievement cabinet renders event progress without marking it earned',()=>{const svg=renderPremiumAchievements({name:'Morgan',rows:[{name:'House Regular',class:'casino',earnedAt:null,progress:'7 / 10 rounds'}],page:0,pages:1});assert.match(svg,/7 \/ 10 rounds/);assert.match(svg,/LOCKED/);});
