import test from 'node:test';
import assert from 'node:assert/strict';
import {DiscordProfilesCoordinator} from '../../dist/apps/bot/src/discord/profiles-coordinator.js';
const forbidden=new Proxy({},{get:()=>()=>{throw new Error('Repository must not be reached');}});
const config=enabled=>({get:async()=>enabled});
function interaction(){return{guildId:'g',guild:{},user:{id:'member'},customId:'profile:edit:member',calls:[],deferred:false,isChatInputCommand:()=>false,isButton:()=>true,isStringSelectMenu:()=>false,reply:async function(p){this.calls.push(p)},editReply:async function(p){this.calls.push(p)},deferReply:async function(){this.deferred=true}};}
test('disabled profiles reject stale showcase buttons',async()=>{const i=interaction();await new DiscordProfilesCoordinator(forbidden,config(false),async()=>true).handle(i);assert.match(i.calls[0].content,/not enabled/)});
test('profile controls enforce containment',async()=>{const i=interaction();await new DiscordProfilesCoordinator(forbidden,config(true),async()=>false).handle(i);assert.match(i.calls[0].content,/restricted/)});
test('showcase controls cannot edit another member',async()=>{const i=interaction();i.customId='profile:badges:other';await new DiscordProfilesCoordinator(forbidden,config(true),async()=>true).handle(i);assert.match(i.calls[0].content,/own profile/)});
test('records use current scoped record storage rather than wealth rankings',async()=>{const i=interaction();i.isButton=()=>false;i.isChatInputCommand=()=>true;i.commandName='records';let scope;const repo={records:async(_g,s)=>{scope=s;return[]}};await new DiscordProfilesCoordinator(repo,config(true),async()=>true).handle(i);assert.equal(scope,'alltime');assert.equal(i.calls[0].embeds[0].data.title,undefined);assert.match(i.calls[0].files[0].description,/All time records/);});

import {IdempotentScheduler} from '../../dist/packages/core/src/scheduler.js';
test('disabled Spotlight announcement and freeze preserve retriable scheduler obligations',async()=>{
 const coordinator=new DiscordProfilesCoordinator(forbidden,config(false),async()=>true),failed=[],completed=[];
 const jobs=['announce','freeze'].map(kind=>({id:kind,guildId:'g',jobType:kind,executionKey:kind,dueAt:new Date(),status:'PENDING',attempts:0}));
 const scheduler=new IdempotentScheduler({claimDue:async()=>jobs,wasExecuted:async()=>false,complete:async id=>completed.push(id),fail:async(id,error)=>failed.push({id,error})},{announce:()=>coordinator.announce({},'g','2026-09-14'),freeze:()=>coordinator.freeze({},'g')});
 await scheduler.tick();assert.deepEqual(completed,[]);assert.deepEqual(failed.map(f=>f.id),['announce','freeze']);for(const f of failed)assert.match(f.error,/disabled; retain scheduled work/);
});
const settingsConfig=overrides=>({get:async(_g,key)=>({'features.activity':false,'features.spotlight':true,'spotlight.fallback_post_hour':21,'spotlight.learned_post_window_start_hour':8,'spotlight.learned_post_window_end_hour':12,...overrides})[key]});
test('scheduled and recovered Spotlight freezes receive current posting settings',async()=>{
 const calls=[],repo={freeze:async(...args)=>calls.push(['freeze',...args]),schedule:async()=>{},reconcile:async(...args)=>calls.push(['reconcile',...args])};
 const coordinator=new DiscordProfilesCoordinator(repo,settingsConfig({}),async()=>true),at=new Date('2026-09-21T10:00:00Z');
 await coordinator.freeze({},'g',at);await coordinator.reconcile('g');
 assert.deepEqual(calls[0],['freeze','g',at,{fallbackHour:21,startHour:8,endHour:12}]);assert.equal(calls[1][0],'reconcile');assert.deepEqual(calls[1][3],{fallbackHour:21,startHour:8,endHour:12});
});
test('activity channel exclusions honor each configurable toggle and retain Hotseat exclusion',async()=>{
 const channels={'channels.bot_channel':'bots','channels.games_channel':'games','channels.staff_log':'staff','channels.hotseat_channel':'hotseat'},toggles={'activity.exclude_bot_channel':true,'activity.exclude_games_channel':true,'activity.exclude_staff_channel':true},observed=[];
 const message={guildId:'g',author:{id:'member',bot:false},id:'message',createdAt:new Date(),content:'A qualifying message'};
 for(const [toggle,channel] of [['activity.exclude_bot_channel','bots'],['activity.exclude_games_channel','games'],['activity.exclude_staff_channel','staff']])for(const enabled of [true,false]){
  const coordinator=new DiscordProfilesCoordinator({message:async(...args)=>observed.push(args.at(-1))},settingsConfig({...channels,...toggles,'features.activity':true,[toggle]:enabled}),async()=>true);
  await coordinator.message({...message,channelId:channel});assert.equal(observed.at(-1).excludedChannel,enabled);
 }
 const coordinator=new DiscordProfilesCoordinator({message:async(...args)=>observed.push(args.at(-1))},settingsConfig({...channels,...Object.fromEntries(Object.keys(toggles).map(k=>[k,false])),'features.activity':true}),async()=>true);
 await coordinator.message({...message,channelId:'hotseat'});assert.equal(observed.at(-1).excludedChannel,true);
 await coordinator.message({...message,channelId:'main'});assert.equal(observed.at(-1).excludedChannel,false);
});
