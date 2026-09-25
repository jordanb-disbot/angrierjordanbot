import {planRace} from '../dist/packages/features-events/src/domain.js';
import {planFight} from '../dist/packages/features-events/src/fight.js';
const seeded=initial=>{let seed=initial;return max=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return Math.floor(seed/4294967296*max);};};
export const reviewMembers=['Jordan','Alex','Sam','Morgan','Taylor','Casey'].map((name,i)=>({userId:'fixture-'+i,name,chair:i+1}));
export const reviewPlans={race:planRace(reviewMembers,seeded(42)),fight:planFight(reviewMembers.slice(0,2),[],seeded(42))};
