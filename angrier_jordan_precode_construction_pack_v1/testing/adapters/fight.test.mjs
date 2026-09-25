import test from 'node:test';import assert from 'node:assert/strict';
import {DiscordEventsCoordinator} from '../../dist/apps/bot/src/discord/events-coordinator.js';
import {planFight,fightSnapshot} from '../../dist/packages/features-events/src/fight.js';
import {renderFight} from '../../dist/packages/features-events/src/fight-render.js';
const config={get:async(_g,k)=>k==='features.fight'?true:k==='channels.main_chat'?'main':false};
const forbidden=new Proxy({},{get:()=>()=>{throw Error('Mutation must not be reached');}});
test('Fight requires another eligible human and honors its independent flag',async()=>{
 for(const kind of ['self','bot','restricted','disabled']){const calls=[],target={id:kind==='self'?'host':'target',bot:kind==='bot'},i={guildId:'g',guild:{},channelId:'main',user:{id:'host'},options:{getUser:(name,required)=>{assert.equal(name,'member');assert.equal(required,true);return target;}},reply:async p=>calls.push(p)};
  await new DiscordEventsCoordinator(forbidden,kind==='disabled'?{get:async()=>false}:config,async()=>kind!=='restricted').startFight(i);assert.equal(calls.length,1);assert.equal(calls[0].ephemeral,true);assert.match(calls[0].content,/eligible|restricted|not enabled|cannot participate/);
 }
});
test('Fight betting has two private wager choices and no accept, join or replay state',async()=>{
 const view={id:'f',type:'fight',guildId:'g',channelId:'main',ownerId:'host',state:'OPEN',expiresAt:new Date(Date.now()+30000),extensionUsed:false,racers:[{userId:'host',name:'Jordan',chair:1},{userId:'target',name:'Alex',chair:2}],pool:'200',bets:[]};const coordinator=new DiscordEventsCoordinator({},config,async()=>true),payload=await coordinator.payload(view),controls=payload.components.flatMap(r=>r.toJSON().components);assert.equal(controls.filter(c=>c.custom_id.startsWith('fight:bet:')).length,2);assert.ok(controls.every(c=>!/(Accept|Decline|Join|Again|Rematch)/i.test(c.label)));
 let seed=7654;const plan=planFight(view.racers,[],max=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return Math.floor(seed/4294967296*max);});const combat=fightSnapshot(plan,12000,view.racers),svg=renderFight({...view,state:'LOCKED',combat});for(const hp of combat.hp){assert.ok(svg.includes('>'+hp+' HP<'));assert.ok(svg.includes('width="'+162*hp/100+'"'));}
 const result=await coordinator.payload({...view,state:'CLOSED',winnerId:plan.winnerId,combat:fightSnapshot(plan,plan.durationMs,view.racers),result:{pool:'200',rake:'10',payouts:{},refunded:false}});assert.equal(result.components.length,0);
 const calls=[],i={guildId:'g',guild:{},channelId:'main',user:{id:'a'},customId:'fight:bet:f:target',isButton:()=>true,isModalSubmit:()=>false,showModal:async m=>calls.push(m.toJSON())};await new DiscordEventsCoordinator({publicView:async()=>view},config,async()=>true).handle(i);assert.equal(calls[0].custom_id,'fight:wager:a:f:target');
});
test('fighter absence cancels but provider failures retain the event for safe retry',async()=>{
 for(const code of [10007,500]){const calls=[],repo={publicView:async()=>({id:'f',type:'fight',state:'LOCKED',guildId:'g',racers:[{userId:'host'}]}),memberLeft:async(...args)=>calls.push(args)},client={guilds:{fetch:async()=>({members:{fetch:async()=>{throw{code};}}})}},coordinator=new DiscordEventsCoordinator(repo,config,async()=>true);
  if(code===10007){await coordinator.verifyFighters(client,'f');assert.equal(calls.length,1);}else{await assert.rejects(()=>coordinator.verifyFighters(client,'f'));assert.equal(calls.length,0);}
 }
});
test('restart detects a fighter who left and rejoined while the bot was offline',async()=>{
 const calls=[],repo={publicView:async()=>({id:'f',type:'fight',state:'LOCKED',guildId:'g',racers:[{userId:'host',joinedAt:'2026-09-01T00:00:00.000Z'}]}),cancel:async(...args)=>calls.push(args)},client={guilds:{fetch:async()=>({members:{fetch:async()=>({joinedAt:new Date('2026-09-25T00:00:00Z')})}})}};await new DiscordEventsCoordinator(repo,config,async()=>true).verifyFighters(client,'f');assert.equal(calls.length,1);assert.match(calls[0][2],/left and rejoined/);
});
