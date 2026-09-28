import test from 'node:test';
import assert from 'node:assert/strict';
import {DiscordProfilesCoordinator} from '../../dist/apps/bot/src/discord/profiles-coordinator.js';
import {renderPremiumProfile,renderPremiumProfilePages,renderPremiumLeaderboard,renderPremiumRecords,renderPremiumShowcase} from '../../dist/packages/features-profiles/src/premium-render.js';
const config={get:async()=>true};
function interaction(commandName='leaderboard',customId,values=[]){const calls=[];return{calls,commandName,customId,values,user:{id:'member'},guildId:'g',guild:{members:{fetch:async()=>null}},client:{users:{fetch:async()=>null}},deferred:false,isChatInputCommand:()=>!customId,isButton:()=>!!customId&&!values.length,isStringSelectMenu:()=>values.length>0,options:{getUser:()=>null},deferReply:async function(p){this.deferred=true;this.private=p.ephemeral},editReply:async p=>calls.push(p),reply:async p=>calls.push(p)};}
const imageOnly=p=>{assert.equal(p.content,undefined);assert.equal(p.embeds[0].data.title,undefined);assert.equal(p.embeds[0].data.description,undefined);assert.ok(p.files[0].attachment.length>0);};
test('premium typography and safe portraits retain exact values and escaped identities',()=>{
 const svg=renderPremiumLeaderboard({category:'wealth',page:0,pages:1,rows:[{rank:1,name:'<Chair & Member>',value:'9223372036854775807',avatarData:'https://invalid.test/avatar'}]});
 assert.match(svg,/Inter/);assert.match(svg,/Space Grotesk/);assert.doesNotMatch(svg,/Poppins|Cinzel/);assert.match(svg,/&lt;Chair &amp; Member&gt;/);assert.match(svg,/9223372036854775807/);assert.doesNotMatch(svg,/href="https:/);
});
test('hidden activity, empty records and empty showcase are intentional branded states',()=>{
 assert.match(renderPremiumProfile({name:'Jordan',sections:[{label:'Activity',value:'Activity statistics are private.'}]}),/statistics are private/);
 assert.match(renderPremiumRecords({scope:'All time',records:[],page:0,pages:1}),/No records yet/);
 const svg=renderPremiumShowcase({page:0,pages:1,badges:[],items:[]});assert.match(svg,/Earn achievements/);assert.match(svg,/Discover a collectible/);
});
test('profile tiles center labels and complete values without wrapping or splitting across gallery pages',()=>{
 const pages=renderPremiumProfilePages({name:'Morgan',highlights:[{label:'OTTOMANS',value:'33,420'}],sections:[{label:'Activity',value:'Messages: 482 / 2,410\nTop word 1: chairs · 128\nTop word 2: jordan · 94\nTop word 3: game · 78\nMost-used command: profile'}]});
 assert.ok(pages.length>1&&pages.length<=10);assert.match(pages[0],/text-anchor="middle"[^>]*>OTTOMANS/);
 for(const page of pages){assert.doesNotMatch(page,/<tspan/);assert.match(page,/width="1200"/);}
 assert.ok(pages.some(page=>/text-anchor="middle"[^>]*>Top word 1/.test(page)));for(const value of ['chairs · 128','jordan · 94','game · 78'])assert.ok(pages.some(page=>page.includes(value)),value+' is preserved');
});
test('leaderboard uses image-only output and preserves ranks across pages',async()=>{
 const repo={leaderboard:async()=>Array.from({length:8},(_,n)=>({userId:'m'+n,value:100-n}))},c=new DiscordProfilesCoordinator(repo,config,async()=>true);
 const first=interaction();await c.handle(first);imageOnly(first.calls[0]);assert.equal(first.private,true);assert.match(first.calls[0].files[0].description,/1\. Member: 100/);
 const next=interaction('', 'profile:leaderpage:member:wealth:1');await c.handle(next);imageOnly(next.calls[0]);assert.match(next.calls[0].files[0].description,/7\. Member: 94/);
});
test('record period is retained in page controls and no native details repeat the art',async()=>{
 let scope;const repo={records:async(_g,s)=>{scope=s;return Array.from({length:7},(_,n)=>({recordKey:'game.win',userId:null,value:{amount:String(n)},achievedAt:new Date('2026-09-26')}));}};
 const i=interaction('','profile:recordpage:member:monthly:1');await new DiscordProfilesCoordinator(repo,config,async()=>true).handle(i);assert.equal(scope,'monthly');imageOnly(i.calls[0]);assert.match(i.calls[0].files[0].description,/This month/);
});
test('empty showcase renders artwork without fabricated selectable awards',async()=>{
 const i=interaction('','profile:edit:member');await new DiscordProfilesCoordinator({showcaseOptions:async()=>({badges:[],items:[],state:null})},config,async()=>true).handle(i);imageOnly(i.calls[0]);assert.equal(i.calls[0].components.length,1);assert.ok(i.calls[0].components[0].components.every(x=>x.data.disabled));
});
test('foreign pagination cannot access another members controls',async()=>{
 const i=interaction('','profile:leaderpage:other:wealth:1');await new DiscordProfilesCoordinator({leaderboard:async()=>{throw Error('must not read')}},config,async()=>true).handle(i);assert.match(i.calls[0].content,/own profile/);
});
test('public profile retains privacy and Edit Showcase without duplicated external text',async()=>{
 const i=interaction('profile');i.guild.members.fetch=async()=>({displayName:'Jordan',displayAvatarURL:()=>undefined});
 const repo={refreshAchievements:async()=>{},profile:async()=>({activity:null,economy:[],games:[],state:{featuredAchievements:[],featuredItems:[]},spotlight:[],giftsSent:0,giftsReceived:0,activeMarriages:0}),showcaseOptions:async()=>({badges:[],items:[]})};
 await new DiscordProfilesCoordinator(repo,config,async()=>true).handle(i);const payload=i.calls[0];assert.equal(payload.content,null);assert.deepEqual(payload.embeds,[]);assert.equal(i.private,false);assert.match(payload.files[0].description,/Activity statistics are private/);assert.ok(payload.files.length>1);assert.ok(payload.components.slice(0,-1).every(c=>c.toJSON().type===12));assert.equal(payload.components.at(-1).components[0].data.label,'Edit Showcase');
});
