import test from 'node:test';
import assert from 'node:assert/strict';
import {Collection,PermissionFlagsBits as P,PermissionsBitField,ChannelType} from 'discord.js';
import {DiscordActivityLogger} from '../../dist/apps/bot/src/discord/activity-logger.js';

const GUILD='1524964384642957432',LOG='1538321358310867104',OTHER='1538321358310867105';
function fixture({publicView=false,nonAdminView=false,missing=false}={}){
 const sends=[],config={get:async(_guild,key)=>key==='channels.staff_log'?LOG:null};
 const botRole={id:'bot',name:'The Chairman',permissions:new PermissionsBitField(0n)},visitor={id:'visitor',name:'Visitor',permissions:new PermissionsBitField(0n)};
 const everyone={id:GUILD,name:'@everyone',permissions:new PermissionsBitField(0n)};
 const me={id:'bot-member',roles:{cache:new Collection([['bot',botRole]])}};
 const overwrites=new Collection([['bot',{id:'bot',allow:new PermissionsBitField(P.ViewChannel)}],...(nonAdminView?[['visitor',{id:'visitor',allow:new PermissionsBitField(P.ViewChannel)}]]:[])]);
 const parent={id:'parent',permissionOverwrites:{cache:overwrites}};
 const channel={id:LOG,type:ChannelType.GuildText,parent,permissionOverwrites:{cache:new Collection()},permissionsFor:target=>new PermissionsBitField(target===everyone?(publicView?P.ViewChannel:0n):P.ViewChannel|P.SendMessages),send:async payload=>{sends.push(payload);}};
 const guild={id:GUILD,roles:{everyone,cache:new Collection([[GUILD,everyone],['bot',botRole],['visitor',visitor]])},members:{me},channels:{cache:new Collection(missing?[]:[[LOG,channel]]),fetch:async id=>missing?null:id===LOG?channel:null}};
 const logger=new DiscordActivityLogger(config,GUILD,()=>Date.UTC(2026,8,28));
 const message=(id,content,channelId=OTHER)=>({id,content,channelId,guild,author:{id:'person',bot:false},url:`https://discord.com/channels/${GUILD}/${channelId}/${id}`});
 return{logger,guild,channel,sends,message};
}
const text=f=>f.sends.map(row=>JSON.stringify(row.embeds[0].toJSON())).join('\n');

test('preflight accepts only a private, writable staff channel',async()=>{
 await fixture().logger.preflight(fixture().guild);
 for(const [options,error] of [[{publicView:true},'PUBLIC'],[{nonAdminView:true},'NOT_ADMIN_ONLY'],[{missing:true},'MISSING']]){
  const f=fixture(options);await assert.rejects(f.logger.preflight(f.guild),new RegExp(error));
 }
});

test('edits and deletes include available text, location, and no live mentions',async()=>{
 const f=fixture(),original=f.message('m1','Original text'),edited=f.message('m1','Updated text');
 await f.logger.messageCreate(original);await f.logger.messageUpdate({...original,content:null},edited);await f.logger.messageDelete({...edited,content:null,author:null});
 assert.equal(f.sends.length,2);assert.match(text(f),/Original text/);assert.match(text(f),/Updated text/);
 assert.match(text(f),/MESSAGE DELETED/);assert.match(text(f),/<#1538321358310867105>/);
 assert.deepEqual(f.sends[0].allowedMentions,{parse:[]});
});

test('log channel and bot messages do not recurse into activity log',async()=>{
 const f=fixture();await f.logger.messageCreate(f.message('m1','Staff text',LOG));
 await f.logger.messageUpdate(f.message('m1','A',LOG),f.message('m1','B',LOG));
 await f.logger.messageDelete(f.message('m1','B',LOG));
 await f.logger.messageDelete({...f.message('m2','Bot message'),author:{id:'bot',bot:true}});
 assert.equal(f.sends.length,0);
});

test('bulk delete includes cached excerpts and clears them',async()=>{
 const f=fixture(),message=f.message('m1','Bulk text');await f.logger.messageCreate(message);
 await f.logger.messageDeleteBulk(new Map([['m1',{...message,content:null,author:null}]]));
 assert.match(text(f),/Bulk text/);await f.logger.messageDelete({...message,content:null,author:null});
 assert.match(text(f),/text unavailable/);
});

test('member and voice transitions produce restrained staff cards',async()=>{
 const f=fixture(),member={guild:f.guild,id:'person',user:{bot:false},roles:{cache:new Collection()},nickname:null,premiumSince:null};
 await f.logger.memberJoin(member);await f.logger.memberLeave(member);
 await f.logger.voiceUpdate({channelId:null},{guild:f.guild,id:'person',channelId:OTHER});
 assert.equal(f.sends.length,3);assert.match(text(f),/MEMBER JOINED/);assert.match(text(f),/MEMBER LEFT/);assert.match(text(f),/VOICE ACTIVITY/);
});

test('role, channel, ban, and audit events reach the admin-only feed',async()=>{
 const f=fixture(),role={id:'role1',name:'Chair',guild:f.guild,permissions:new PermissionsBitField(0n),position:1};
 await f.logger.roleCreated(role);await f.logger.roleUpdated(role,{...role,name:'New Chair'});await f.logger.roleDeleted(role);
 const channel={id:OTHER,name:'room',guild:f.guild,parentId:null,permissionOverwrites:{cache:new Collection()}};
 await f.logger.channelCreated(channel);await f.logger.channelUpdated(channel,{...channel,name:'new-room'});await f.logger.channelDeleted(channel);
 await f.logger.banAdded({guild:f.guild,user:{id:'person'}});await f.logger.banRemoved({guild:f.guild,user:{id:'person'}});
 await f.logger.auditEntry({id:'audit1',action:22,executorId:'admin',targetId:'person'},f.guild);
 assert.equal(f.sends.length,9);for(const title of ['ROLE CREATED','ROLE UPDATED','ROLE DELETED','CHANNEL CREATED','CHANNEL UPDATED','CHANNEL DELETED','MEMBER BANNED','MEMBER UNBANNED','SERVER AUDIT'])assert.match(text(f),new RegExp(title));
});

test('uncached deletion reports unavailable text without fabricating content',async()=>{
 const f=fixture();await f.logger.messageDelete({...f.message('missing',null),author:null});
 assert.match(text(f),/text unavailable/);assert.doesNotMatch(text(f),/undefined|null/);
});
