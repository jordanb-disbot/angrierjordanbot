import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import sharp from 'sharp';
import {renderCasinoResult} from '../../dist/packages/features-casino/src/render.js';
import {DiscordCasinoCoordinator} from '../../dist/apps/bot/src/discord/casino-coordinator.js';
import {displayFrames} from '../../dist/apps/bot/src/discord/wide-display.js';
const table=JSON.parse(fs.readFileSync('reference/acceleration/registries/master_settings_schema.json','utf8')).settings.find(s=>s.key==='casino.chair_symbols').default;
const input={title:'Casino',subtitle:'Settled',memberName:'Jordan',amount:'200',amountLabel:'Returned',wager:'100',net:'+100',details:[]};
const render=visual=>renderCasinoResult({...input,visual});
for(const [name,symbols,jackpot,expected] of [
 ['win',['folding_chair','folding_chair','folding_chair'],false,'4× wager returned'],
 ['loss',['barstool','recliner','throne'],false,'NO PAYING LINE'],
 ['jackpot',['throne','throne','throne'],true,'THE FULL CHAIR POT']
])test('Slots '+name+' renders three actual chair reels and truthful line status',()=>{
 const svg=render({kind:'slots',symbols,table,jackpot});assert.equal((svg.match(/data-art="chair-symbol"/g)??[]).length,3);assert.ok(svg.includes(expected));for(const id of symbols)assert.ok(svg.includes(table.find(s=>s.id===id).name));assert.match(svg,/data-game="slots"/);
});
test('Slots rules use current configured multipliers and jackpot flags, including changes from defaults',()=>{
 const configured=table.map(s=>({...s,multiplier:s.id==='barstool'?13:s.multiplier}));
 const svg=render({kind:'rules',game:'slots',table:configured});assert.match(svg,/>13×</);assert.doesNotMatch(svg,/>8×</);assert.match(svg,/>Chair Pot</);assert.equal((svg.match(/data-art="chair-symbol"/g)??[]).length,5);
});
test('Blackjack conceals hole card and renders split hands, exact total, stake and vector suits',()=>{
 const v={kind:'blackjack',dealer:[0,25],hands:[{cards:[12,9],stake:'200',status:'STOOD'},{cards:[6,17],stake:'100',status:'PLAYING'}],active:1,closed:false};
 const svg=render(v);assert.equal((svg.match(/data-art="hidden-card"/g)??[]).length,1);assert.equal((svg.match(/data-art="card-face"/g)??[]).length,5);assert.match(svg,/HAND 1 · 20/);assert.match(svg,/HAND 2 · 12 · YOUR MOVE/);assert.match(svg,/200 Ottomans · STOOD/);assert.doesNotMatch(svg,/[♣♦♥♠]/);
 const closed=render({...v,closed:true});assert.doesNotMatch(closed,/hidden-card|YOUR MOVE|HOLE CARD/);assert.match(closed,/DEALER · 21/);assert.equal((closed.match(/data-art="card-face"/g)??[]).length,6);
});
test('Active Blackjack stays in one contiguous 1200 by 720 attachment',async()=>{
 const svg=render({kind:'blackjack',dealer:[0,25],hands:[{cards:[12,9],stake:'100',status:'PLAYING'}],active:0,closed:false});
 const frames=await displayFrames(svg,'blackjack-review','Blackjack');
 assert.equal(frames.length,1);const metadata=await sharp(frames[0].data).metadata();assert.equal(metadata.width,1200);assert.equal(metadata.height,720);
});
for(const [v,art,copy] of [
 [{kind:'roulette',number:0,color:'green',selection:'red'},'roulette-wheel','GREEN'],
 [{kind:'dice',player:2,house:6,selection:'high'},'die-2','HOUSE ROLL'],
 [{kind:'coinflip',landed:'tails',selection:'heads'},'coin-tails','HEADS'],
 [{kind:'lottery',tickets:7,price:'125',drawAt:'2026-10-02 20:00 UTC'},'lottery-ticket','125 OTTOMANS / TICKET'],
 [{kind:'lottery',tickets:0,drawAt:'',winner:true},'lottery-ticket','WINNER'],
 [{kind:'jackpot'},'chair-symbol','THE CHAIR POT IS YOURS']
])test(v.kind+(v.winner?' winner':'')+' renders recognizable game components at full landscape width',async()=>{
 const svg=render(v);assert.ok(svg.includes(`data-art="${art}"`));assert.ok(svg.includes(copy));assert.equal(svg,render(v));assert.doesNotMatch(svg,/NaN|undefined|casino:|session:/);
 const frames=await displayFrames(svg,'game-review','Game');assert.equal(frames.length,1);const m=await sharp(frames[0].data).metadata();assert.equal(m.width,1200);assert.equal(m.height,720);
});
test('Blackjack presentation shows all committed split/double stakes and exact net without changing repository data',async()=>{
 const round={guildId:'g',ownerUserId:'m',state:'CLOSED',version:2,data:{game:'blackjack',stake:'100',selection:'',payout:'450',outcome:'Win',blackjack:{dealer:[9,5],hands:[{cards:[9,8],stake:'200',status:'STOOD'},{cards:[0,12],stake:'100',status:'STOOD'}],active:1}}};
 const config={get:async(_g,k)=>({'casino.min_bet':1,'casino.max_bet':10000,'casino.chair_pot_contribution_percent':1,'casino.chair_symbols':table,'casino.slots_wagers':[100],'casino.roulette_choices':['red'],'casino.dice_choices':['high']}[k])};
 const c=new DiscordCasinoCoordinator({get:async()=>round},{},config,async()=>true);let projection;c.presentation=async data=>{projection=data;return{};};
 await c.roundPayload('private-id');assert.equal(projection.wager,'300');assert.equal(projection.net,'+150');assert.equal(projection.amount,'450');assert.equal(round.data.stake,'100');assert.equal(projection.visual.hands.length,2);
});
test('Casino rules read current table limits and contribution instead of inventing payout data',async()=>{
 const settings={'features.casino':true,'channels.bot_channel':'bot','casino.min_bet':11,'casino.max_bet':900,'casino.chair_pot_contribution_percent':3,'casino.chair_symbols':table,'casino.slots_wagers':[25,75],'casino.roulette_choices':['red'],'casino.dice_choices':['high']};
 const c=new DiscordCasinoCoordinator({},{},{get:async(_g,k)=>settings[k]},async()=>true);let projected,edits=0;c.presentation=async data=>{projected=data;return{};};
 const i={guildId:'g',guild:{},channelId:'bot',user:{id:'m'},customId:'casino:help:m:slots',deferred:false,isChatInputCommand:()=>false,isButton:()=>true,isModalSubmit:()=>false,deferReply:async()=>{i.deferred=true;},editReply:async()=>{edits++;}};
 await c.handle(i);assert.equal(edits,1);assert.match(projected.details[0].value,/25, 75 Ottomans/);assert.match(projected.details[1].value,/3%/);assert.deepEqual(projected.visual.table,table);
});
