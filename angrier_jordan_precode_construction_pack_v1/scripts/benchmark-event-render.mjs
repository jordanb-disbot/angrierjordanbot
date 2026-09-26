// Offline fixtures only: reports CPU/publication-path overhead, never claims network latency.
import {performance} from 'node:perf_hooks';
import {setTimeout} from 'node:timers/promises';
import {DiscordEventsCoordinator} from '../dist/apps/bot/src/discord/events-coordinator.js';
import {DiscordSpecialCoordinator} from '../dist/apps/bot/src/discord/special-coordinator.js';
import {reviewMembers,reviewPlans} from './event-review-fixtures.mjs';
for(const type of ['fight','race']){
 let view={id:'fixture',type,guildId:'fixture',channelId:'fixture',messageId:'fixture',state:'OPEN',expiresAt:new Date(Date.now()+60000),racers:type==='fight'?reviewMembers.slice(0,2):reviewMembers,pool:'100',bets:[],extensionUsed:false};
 let data={racers:view.racers,[type==='fight'?'fightPlan':'plan']:reviewPlans[type]};
 const c=new DiscordEventsCoordinator({prepareClose:async()=>({data}),publicView:async()=>view,get:async()=>({state:'LOCKED',data})},{},async()=>true);
 const preparation=performance.now();c.prepare(view);while(c.preparing.size)await setTimeout(25);
 const preparationMs=Math.round(performance.now()-preparation);if(!c.prepared.get('fixture')?.payload)throw Error('Preparation failed');
 view={...view,state:'LOCKED'};data={...data,startedAt:new Date().toISOString()};
 const client={user:{id:'fixture'},channels:{fetch:async()=>({isTextBased:()=>true,messages:{fetch:async()=>({author:{id:'fixture'},edit:async()=>{}})}})}};
 const start=performance.now();await c.refresh(client,'fixture');console.log(JSON.stringify({type,preparationMs,preparedTransitionMs:Math.round((performance.now()-start)*100)/100,network:'excluded'}));
}
const line=new DiscordSpecialCoordinator({}, {},async()=>true),view={id:'line',state:'OPEN',ownerId:'fixture-0',members:reviewMembers.map(m=>({...m,status:'ready'})),elapsedMs:0,durationMs:9000,remainingMs:60000};
const start=performance.now();line.prepareFinale(view);while(line.preparing.size)await setTimeout(25);
const preparationMs=Math.round(performance.now()-start),lookup=performance.now();if(!line.readyFinale(view))throw Error('Line preparation failed');
console.log(JSON.stringify({type:'line',preparationMs,preparedLookupMs:Math.round((performance.now()-lookup)*100)/100,network:'excluded'}));
