import test from 'node:test';
import assert from 'node:assert/strict';
import {DiscordCasinoAnnouncements} from '../../dist/apps/bot/src/discord/casino-announcements.js';

test('disabled casino and lottery announcements reject before Discord or persistence so delivery can retry',async()=>{
 const forbidden=new Proxy({},{get(){throw Error('No external effects allowed');}});
 for(const [jobType,feature] of [['casino.jackpot_announce','features.casino'],['lottery.announce','features.lottery']]){
  const keys=[];
  const announcements=new DiscordCasinoAnnouncements(forbidden,{get:async(_server,key)=>{keys.push(key);return false;}});
  await assert.rejects(()=>announcements.deliver(forbidden,{id:'job',guildId:'server',jobType,payload:{userId:'member',amount:'100'}}),/retain pending delivery/);
  assert.deepEqual(keys,[feature]);
 }
});

test('lottery publication is independent of the ordinary casino feature switch',async()=>{
 const keys=[];
 const announcements=new DiscordCasinoAnnouncements({}, {get:async(_server,key)=>{keys.push(key);return key==='features.lottery';}});
 await assert.rejects(()=>announcements.deliver({}, {id:'job',guildId:'server',jobType:'lottery.announce',payload:{userId:'member',amount:'100'}}),/channel is not configured/);
 assert.deepEqual(keys,['features.lottery','channels.bot_channel']);
});
import {createHash} from 'node:crypto';
import {Collection} from 'discord.js';
function announcementFixture(existing){let payload={userId:'member',amount:'500',deliveryState:existing?'SENDING':'PENDING'},sent;const db={scheduledJob:{findUniqueOrThrow:async()=>({payload}),updateMany:async({data})=>{payload=data.payload;return{count:1}}}},member={displayName:'Member',user:{displayName:'Member'},displayAvatarURL:()=>undefined},channel={isTextBased:()=>true,messages:{fetch:async()=>new Collection(existing?[[existing.id,existing]]:[])},send:async p=>{sent=p;return{id:'new-message'}}},client={user:{id:'bot'},guilds:{fetch:async()=>({members:{fetch:async()=>member}})},channels:{fetch:async()=>channel}};return{a:new DiscordCasinoAnnouncements(db,{get:async(_g,k)=>k.startsWith('features.')?true:'channel'}),client,job:{id:'job',guildId:'g',jobType:'casino.jackpot_announce',payload},state:()=>({payload,sent})};}
test('Casino award starts an editable public digest with no visible technical marker',async()=>{const f=announcementFixture();await f.a.deliver(f.client,f.job);const {sent,payload}=f.state();assert.equal(payload.deliveryState,'SENT');assert.equal(sent.embeds[0].data.title,'Casino Awards Digest');assert.match(sent.embeds[0].data.description,/Chair Pot/);assert.doesNotMatch(sent.embeds[0].data.description,/casino-event:job/);assert.match(sent.embeds[0].data.footer.text,/^casino-digest:/);});
test('Casino uncertain delivery recovers both legacy footer and new attachment identity without another send',async()=>{for(const legacy of [true,false]){const marker='casino-event:job',key='casino-award-'+createHash('sha256').update(marker).digest('hex').slice(0,24),old={id:'old-message',author:{id:'bot'},embeds:legacy?[{footer:{text:marker}}]:[],attachments:new Collection(legacy?[]:[['a',{name:key+'-1.png'}]])};const f=announcementFixture(old);await f.a.deliver(f.client,f.job);assert.equal(f.state().sent,undefined);assert.equal(f.state().payload.deliveryMessageId,'old-message');}});
