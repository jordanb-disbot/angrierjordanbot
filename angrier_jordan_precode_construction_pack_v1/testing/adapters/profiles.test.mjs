import test from 'node:test';
import assert from 'node:assert/strict';
import {DiscordProfilesCoordinator} from '../../dist/apps/bot/src/discord/profiles-coordinator.js';
const forbidden=new Proxy({},{get:()=>()=>{throw new Error('Repository must not be reached');}});
const config=enabled=>({get:async()=>enabled});
function interaction(){return{guildId:'g',guild:{},user:{id:'member'},customId:'profile:edit:member',calls:[],deferred:false,isChatInputCommand:()=>false,isButton:()=>true,isStringSelectMenu:()=>false,reply:async function(p){this.calls.push(p)},editReply:async function(p){this.calls.push(p)},deferReply:async function(){this.deferred=true}};}
test('disabled profiles reject stale showcase buttons',async()=>{const i=interaction();await new DiscordProfilesCoordinator(forbidden,config(false),async()=>true).handle(i);assert.match(i.calls[0].content,/not enabled/)});
test('profile controls enforce containment',async()=>{const i=interaction();await new DiscordProfilesCoordinator(forbidden,config(true),async()=>false).handle(i);assert.match(i.calls[0].content,/restricted/)});
test('showcase controls cannot edit another member',async()=>{const i=interaction();i.customId='profile:badges:other';await new DiscordProfilesCoordinator(forbidden,config(true),async()=>true).handle(i);assert.match(i.calls[0].content,/own profile/)});
test('records use current scoped record storage rather than wealth rankings',async()=>{const i=interaction();i.isButton=()=>false;i.isChatInputCommand=()=>true;i.commandName='records';let scope;const repo={records:async(_g,s)=>{scope=s;return[]}};await new DiscordProfilesCoordinator(repo,config(true),async()=>true).handle(i);assert.equal(scope,'alltime');assert.equal(i.calls[0].embeds[0].data.title,'Server Records · All time');});
