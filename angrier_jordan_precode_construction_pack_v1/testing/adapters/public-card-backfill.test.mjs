import test from 'node:test';
import assert from 'node:assert/strict';
import {backfillPublicCards,createRestClient} from '../../scripts/backfill-production-public-cards.mjs';
const guildId='1524964384642957432';
test('public card backfill edits stored messages in place and skips deleted cards without stopping',async()=>{const edits=[],messages=new Map([['suggestion',{author:{id:'bot'},edit:async payload=>edits.push(['suggestion',payload])}],['intro',{author:{id:'bot'},edit:async payload=>edits.push(['intro',payload])}]]),client={user:{id:'bot'},channels:{fetch:async()=>({isTextBased:()=>true,messages:{fetch:async id=>{if(!messages.has(id))throw Object.assign(Error('missing'),{code:10008});return messages.get(id);}}})}},db={gameSession:{findMany:async()=>[{id:'s',channelId:'c',messageId:'suggestion'}]},introductionSubmission:{findMany:async()=>[{userId:'u',outputChannelId:'c',outputMessageId:'intro',publishedRevision:1,answers:{name:'Member'}}]},},community={repo:{publicView:async()=>({id:'s'})},coordinator:{payload:async()=>({kind:'suggestion'})}},introductions={repo:{configuration:async()=>({config:{},form:{}})},coordinator:{cardPayload:async()=>({kind:'intro'})}},counts=await backfillPublicCards({db,client,community,introductions,createDisplay:x=>x,delay:async()=>{},write:()=>{}});assert.deepEqual(counts,{suggestions:{updated:1,skipped:0},introductions:{updated:1,skipped:0}});assert.deepEqual(edits.map(x=>x[0]),['suggestion','intro']);messages.delete('intro');const resumed=await backfillPublicCards({db,client,community,introductions,createDisplay:x=>x,delay:async()=>{},write:()=>{}});assert.equal(resumed.introductions.skipped,1);assert.equal(resumed.suggestions.updated,1);});

test('REST-only backfill adapter fetches and edits a stored message without a gateway client',async()=>{
 const calls=[],Routes={user:id=>`/users/${id}`,channelMessage:(channel,id)=>`/channels/${channel}/messages/${id}`,guildMember:(guild,id)=>`/guilds/${guild}/members/${id}`};
 class Rest{setToken(){return this;}async get(route){calls.push(['get',route]);if(route==='/users/@me')return{id:'bot',username:'Bot'};if(route==='/channels/c/messages/m')return{author:{id:'bot'}};throw Error('unexpected get');}async patch(route,data){calls.push(['patch',route,data]);}}
 const client=await createRestClient('token',{Rest,Routes}),message=await (await client.channels.fetch('c')).messages.fetch('m');
 await message.edit({components:[{toJSON:()=>({type:1})}],files:[{attachment:Buffer.from('x'),name:'card.png',description:'Card'}]});
 assert.deepEqual(calls.map(([kind,route])=>[kind,route]),[['get','/users/@me'],['get','/channels/c/messages/m'],['patch','/channels/c/messages/m']]);
 assert.equal(calls[2][2].files[0].name,'card.png');
});
