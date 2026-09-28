import test from 'node:test';
import assert from 'node:assert/strict';
import {DiscordChannelGamesCoordinator} from '../../dist/apps/bot/src/discord/channel-games-coordinator.js';
test('Channel games ignore bots, wrong channels, flags and restricted members before writes',async()=>{let calls=0;const repo={counting:async()=>calls++,letter:async()=>calls++},base={guildId:'g',guild:{members:{fetch:async()=>({isCommunicationDisabled:()=>false})}},channelId:'c',author:{id:'a',bot:false},content:'1',id:'m'},config={get:async(_,key)=>key==='features.channel_games'?true:key==='channels.counting_channel'?'c':'l'};await new DiscordChannelGamesCoordinator(repo,config,async()=>true).message({...base,author:{...base.author,bot:true}});await new DiscordChannelGamesCoordinator(repo,config,async()=>true).message({...base,channelId:'wrong'});await new DiscordChannelGamesCoordinator(repo,{get:async()=>false},async()=>true).message(base);await new DiscordChannelGamesCoordinator(repo,config,async()=>false).message(base);assert.equal(calls,0);await new DiscordChannelGamesCoordinator(repo,config,async()=>true).message(base);assert.equal(calls,1);});
test('Counting restore enforces configured staff capability rather than trusting button visibility',async()=>{let writes=0,payload;const i={guildId:'g',channelId:'c',guild:{ownerId:'owner',members:{fetch:async()=>({roles:{cache:new Map()}})}},user:{id:'a'},id:'i',customId:'channelgame:restore:1',deferred:false,deferReply:async()=>{i.deferred=true;},editReply:async p=>payload=p,reply:async p=>payload=p};const repo={restore:async(_c,_v,authorized)=>{assert.equal(authorized,false);writes++;throw Object.assign(new Error('staff required'),{code:'denied'});}};await new DiscordChannelGamesCoordinator(repo,{get:async(_,key)=>key==='features.channel_games'?true:key==='channels.counting_channel'?'c':null},async()=>true).handle(i);assert.equal(writes,1);assert.match(payload.content,/could not be restored/);});
test('valid Counting and Last Letter turns react after persistence; reaction failure never cancels a turn',async()=>{
 const calls=[],reactions=[],repo={counting:async()=>{calls.push('counting');return{valid:true};},letter:async()=>{calls.push('letter');return{valid:true};}};
 const config={get:async(_,key)=>key==='features.channel_games'?true:key==='channels.counting_channel'?'count':'letter'};
 const base={guildId:'g',guild:{members:{fetch:async()=>({isCommunicationDisabled:()=>false})}},author:{id:'a',bot:false},id:'m',content:'1',react:async emoji=>{assert.equal(calls.length,reactions.length+1);reactions.push(emoji);}};
 const coordinator=new DiscordChannelGamesCoordinator(repo,config,async()=>true);
 await coordinator.message({...base,channelId:'count'});await coordinator.message({...base,channelId:'letter',content:'chair'});
 assert.deepEqual(calls,['counting','letter']);assert.deepEqual(reactions,['✅','✅']);
 await coordinator.message({...base,channelId:'count',react:async()=>{throw Error('Discord denied reaction');}});
 assert.equal(calls.length,3);
});
test('invalid turns do not react',async()=>{
 let reactions=0;const repo={counting:async()=>({valid:false})},config={get:async(_,key)=>key==='features.channel_games'?true:key==='channels.counting_channel'?'count':'letter'};
 await new DiscordChannelGamesCoordinator(repo,config,async()=>true).message({guildId:'g',guild:{members:{fetch:async()=>({isCommunicationDisabled:()=>false})}},author:{id:'a',bot:false},id:'m',channelId:'count',content:'3',react:async()=>reactions++});assert.equal(reactions,0);
});
test('Counting card hides delivery marker while keeping a recovery URL and internal restore control',async()=>{
 let sent;const p={guildId:'g',channelId:'c',title:'Counting reset',body:'Next count is 1.',art:false,version:2};
 const repo={announcement:async()=>p,delivery:()=>({read:async()=>({state:'PENDING'}),claim:async()=>true,complete:async()=>{}})};
 const channel={isSendable:()=>true,messages:{fetch:async()=>new Map()},send:async payload=>{sent=payload;return{id:'message'};}};
 await new DiscordChannelGamesCoordinator(repo,{},async()=>true).deliver({channels:{fetch:async()=>channel},user:{id:'bot'}},'job-id');
 const visible=JSON.stringify({title:sent.embeds[0].data.title,description:sent.embeds[0].data.description,footer:sent.embeds[0].data.footer});
 assert.doesNotMatch(visible,/channelgame:/);assert.match(sent.embeds[0].data.url,/aj_delivery=job-id/);assert.match(sent.components[0].components[0].data.custom_id,/^channelgame:restore:/);
});
test('pending delivery reconciles legacy footer markers without posting a duplicate',async()=>{
 let sent=0,completed;const repo={announcement:async()=>({guildId:'g',channelId:'c',title:'Word rejected',body:'Try again.',art:false}),delivery:()=>({read:async()=>({state:'SENDING'}),complete:async id=>{completed=id;}})};
 const channel={isSendable:()=>true,messages:{fetch:async()=>[{id:'old',author:{id:'bot'},embeds:[{footer:{text:'channelgame:job-id'}}]}]},send:async()=>{sent++;return{id:'new'};}};
 await new DiscordChannelGamesCoordinator(repo,{},async()=>true).deliver({channels:{fetch:async()=>channel},user:{id:'bot'}},'job-id');
 assert.equal(completed,'old');assert.equal(sent,0);
});
