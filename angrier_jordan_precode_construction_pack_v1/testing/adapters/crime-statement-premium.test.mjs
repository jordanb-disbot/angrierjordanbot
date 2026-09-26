import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import {renderCrimeIncident,renderCrimeWanted,renderCrimeNotice} from '../../dist/packages/features-crime/src/premium-render.js';
import {renderStatement} from '../../dist/packages/features-economy/src/statement-render.js';
import {DiscordEconomyCoordinator} from '../../dist/apps/bot/src/discord/economy-coordinator.js';
import {DiscordCrimeCoordinator} from '../../dist/apps/bot/src/discord/crime-coordinator.js';
const now=new Date('2026-09-26T12:00:00Z');
const view={id:'HIDDEN_INCIDENT',guildId:'g',channelId:'bot',state:'OPEN',version:1,createdAt:now,robber:{userId:'HIDDEN_ROBBER',name:'Jordan'},victim:{userId:'HIDDEN_VICTIM',name:'Morgan'},success:true,stolen:'100',returned:false,reports:1,caught:false,fightBackEndsAt:new Date(+now+60000).toISOString(),reportEndsAt:new Date(+now+180000).toISOString()};
const statement={account:{wallet:1234n,bank:5678n,bankTier:2},liquidNetWorth:6912n,entries:Array.from({length:10},(_,n)=>({amount:BigInt(n%2?-25:250),reason:'daily_reward_'+n,createdAt:now}))};
test('Crime incidents show both identities, exact windows and no internal IDs across public states',async()=>{
 for(const v of [view,{...view,success:false,stolen:'0',state:'CLOSED'},{...view,returned:true,fightBack:'won'},{...view,caught:true,returned:true,state:'CLOSED',bail:'340',sentenceId:'HIDDEN_SENTENCE'}]){
  const svg=renderCrimeIncident(v,undefined,undefined,now);assert.doesNotMatch(svg,/HIDDEN_/);assert.match(svg,/Jordan/);assert.match(svg,/Morgan/);assert.match(svg,/ROBBER/);assert.match(svg,/VICTIM/);assert.match(svg,/Poppins/);assert.match(svg,/Cinzel/);
 }
 const svg=renderCrimeIncident(view,undefined,undefined,now);assert.match(svg,/60 seconds remaining/);assert.match(svg,/180 seconds remaining/);
 const p=await new DiscordCrimeCoordinator({}, {},async()=>true).payload(view);
 assert.equal(p.embeds[0].data.footer,undefined);assert.equal(p.embeds[0].data.description,undefined);assert.equal(p.components[0].components[2].data.custom_id,'crime:rules:HIDDEN_INCIDENT');
});
test('Wanted and long bail/rules copy use adaptive centered bounds without clipping',()=>{
 for(const svg of [renderCrimeWanted({name:'W'.repeat(40),level:'PUBLIC_ENEMY',heat:100,successfulRobs:200,failedRobs:50,decay:10}),renderCrimeNotice({title:'Confirm Bail Payment',name:'Long name '.repeat(12),amount:'9223372036854775807',message:'Wallet first, then bank. '.repeat(25)})]){
  const height=Number(svg.match(/height="(\d+)"/)[1]);for(const t of svg.matchAll(/<text([^>]+)>/g)){assert.match(t[1],/text-anchor="middle"/);assert.ok(Number(t[1].match(/y="([\d.]+)"/)[1])<height-15);}
 }
});
test('Statement renders balances, tier and complete selected transaction rows in-frame',()=>{
 const svg=renderStatement({...statement,entries:statement.entries.slice(0,4)},0,3);
 for(const s of ['Wallet','Bank','Liquid net worth','1,234','5,678','6,912','BANK TIER 2','Recent Transactions','daily reward 3','2026-09-26 12:00 UTC'])assert.ok(svg.includes(s),s);
 assert.match(svg,/width="1200"/);assert.doesNotMatch(svg,/<t:/);assert.match(renderStatement({...statement,entries:[]}),/No transactions yet/);
 const huge=renderStatement({...statement,account:{...statement.account,wallet:9223372036854775807n},entries:[]});assert.ok(huge.includes('9,223,372'));
});
test('Statement pages acknowledge before reads, remove duplicate embed text and retain all ten transactions',async()=>{
 let reads=0,acked=false;const sent=[],service={statement:async()=>{assert.equal(acked,true);reads++;return statement;}},c=new DiscordEconomyCoordinator(service,{});
 for(let page=0;page<3;page++){
  acked=false;const i={guildId:'g',user:{id:'owner'},customId:'economy:statement:owner:'+page,deferUpdate:async()=>{acked=true;},editReply:async p=>sent.push(p)};
  await c.handleButton(i);
  const p=sent.at(-1),e=p.embeds[0].data;assert.equal(e.title,undefined);assert.equal(e.fields,undefined);assert.equal(e.description,undefined);assert.equal(e.footer,undefined);assert.equal(p.content,null);assert.equal(p.components.length,1);
  assert.match(p.files[0].description,new RegExp('daily_reward_'+page*4));
 }
 assert.equal(reads,3);assert.equal(sent[2].components[0].components[1].data.disabled,true);
 const before=reads;let error;await c.handleButton({guildId:'g',user:{id:'other'},customId:'economy:statement:owner:1',reply:async p=>{error=p;}});assert.equal(reads,before);assert.match(error.content,/own \/statement/);assert.equal(error.ephemeral,true);
 const m=await sharp(sent[0].files[0].attachment).metadata();assert.equal(m.width,1200);assert.ok(m.height<1100);
});
const eligibleMember={user:{bot:false},isCommunicationDisabled:()=>false,permissionsIn:()=>({has:()=>true})};
function crimeInteraction(action,extras={}){const sent=[];return {sent,guildId:'g',channelId:'bot',guild:{id:'g',members:{fetch:async()=>eligibleMember}},client:{},user:{id:'witness',displayName:'Witness'},id:'request',commandName:'crime',options:{getSubcommand:()=>action},isChatInputCommand:()=>true,isButton:()=>false,isUserSelectMenu:()=>false,isStringSelectMenu:()=>false,deferReply:async function(){this.deferred=true;},editReply:async p=>sent.push(p),...extras};}
const config={get:async(g,k)=>k==='features.crime'?true:'bot'};
test('Witness selector hides incident IDs while retaining internal report routing',async()=>{
 const i=crimeInteraction('911'),repo={isJailed:async()=>false,active:async()=>[{id:view.id,expiresAt:new Date(Date.now()+180000)}],publicView:async()=>view};await new DiscordCrimeCoordinator(repo,config,async()=>true).handle(i);
 const option=i.sent[0].components[0].components[0].options[0].data;
 assert.equal(option.value,view.id);assert.doesNotMatch(option.label+option.description,/HIDDEN/);assert.equal(i.sent[0].embeds[0].data.description,undefined);
});
test('Bail quote stays private, actor-bound and explicit about wallet-first payment without paying',async()=>{
 let reads=0;const i=crimeInteraction('bailself',{isChatInputCommand:()=>false,isButton:()=>true,customId:'crime:bailself:witness'}),repo={bailQuote:async()=>{reads++;return {sentenceId:'HIDDEN_SENTENCE',userId:'witness',name:'Jordan',amount:'340'};}};
 await new DiscordCrimeCoordinator(repo,config,async()=>true).handle(i);assert.equal(reads,1);assert.equal(i.deferred,true);assert.match(i.sent[0].files[0].description,/wallet funds first, then bank/);assert.equal(i.sent[0].components[0].components[0].data.custom_id,'crime:bailconfirm:HIDDEN_SENTENCE:witness:340');assert.doesNotMatch(i.sent[0].files[0].description,/HIDDEN/);
});
