import test from 'node:test';
import assert from 'node:assert/strict';
import {inspect} from 'node:util';
import {ActionRowBuilder,ButtonBuilder,ButtonStyle,ChannelType,Collection,EmbedBuilder,PermissionsBitField,PermissionFlagsBits} from 'discord.js';
import {DiscordMusicCoordinator} from '../../dist/apps/bot/src/discord/music-coordinator.js';
import {createMusicState} from '../../dist/packages/features-music/src/domain.js';
import {DiscordMusicPublication} from '../../dist/apps/bot/src/discord/music-publication.js';
const guildId='111111111111111111',channelId='222222222222222222',otherId='333333333333333333',botId='444444444444444444';
const clone=value=>structuredClone(value),error=code=>Object.assign(Error('PRIVATE_DISCORD_TOKEN'),{code});
function fixture(){
 const f={enabled:true,sendError:false,pinFailures:0,unpinFailures:0,fetchError:null,onSend:null,onEdit:null,onRender:null,counts:{sends:0,edits:0,pins:0,unpins:0,claims:0,completes:0,finalizes:0},state:{guildId,textChannelId:channelId,voiceChannelId:channelId,revision:1,generation:1},pointer:null,jobs:new Map(),cleanups:new Map(),channels:new Map(),messages:new Map(),reservations:[],factoryPayloads:[],edits:[]};
 const addJob=(id='job-1',channel=channelId)=>{const p={job:{id,guildId},payload:{channelId:channel,expectedMessageId:null,superseded:false,deliveryState:'PENDING'}};f.jobs.set(id,p);return p;};addJob();
 f.move=()=>{const old=f.pointer;for(const p of f.jobs.values())p.payload.superseded=true;if(old)f.cleanups.set('cleanup-'+old,{job:{guildId},payload:{channelId:f.state.textChannelId,messageId:old}});f.state={...f.state,textChannelId:otherId,voiceChannelId:otherId,revision:f.state.revision+1};f.pointer=null;};
 f.repo={
  releaseUnsentController:async id=>{const p=f.jobs.get(id).payload;if(p.deliveryState==='SENDING'&&!p.deliveryMessageId)p.deliveryState='PENDING';},
  read:async()=>({state:clone(f.state),controllerMessageId:f.pointer}),
  reserveController:async(_guild,revision,expected=null)=>{f.reservations.push({revision,expected});assert.equal(revision,f.state.revision);if(expected!==null){assert.equal(f.pointer,expected);for(const p of f.jobs.values())p.payload.superseded=true;f.cleanups.set('cleanup-'+expected,{job:{guildId},payload:{channelId:f.state.textChannelId,messageId:expected}});f.pointer=null;}else if(f.pointer)return{kind:'linked',channelId:f.state.textChannelId,messageId:f.pointer};let p=[...f.jobs.values()].find(p=>!p.payload.superseded);if(!p)p=addJob('job-'+(f.jobs.size+1),f.state.textChannelId);return{kind:'publication',jobId:p.job.id,channelId:p.payload.channelId,marker:'music-controller:'+p.job.id};},
  controllerPublication:async id=>{const p=f.jobs.get(id);if(!p)throw error('PRIVATE_JOB');return{...clone(p),state:clone(f.state),marker:'music-controller:'+id,obsolete:p.payload.superseded||p.payload.channelId!==f.state.textChannelId||f.pointer!==null&&f.pointer!==p.payload.deliveryMessageId};},
  finalizeController:async(id,messageId)=>{f.counts.finalizes++;const p=f.jobs.get(id);assert.equal(p.payload.deliveryState,'SENT');assert.equal(p.payload.deliveryMessageId,messageId);const linked=!p.payload.superseded&&p.payload.channelId===f.state.textChannelId&&(!f.pointer||f.pointer===messageId);if(linked)f.pointer=messageId;else f.cleanups.set('cleanup-'+messageId,{job:{guildId},payload:{channelId:p.payload.channelId,messageId}});return{linked,channelId:p.payload.channelId,messageId};},
  controllerCleanupIntent:async id=>{const p=f.cleanups.get(id);if(!p)throw error('PRIVATE_JOB');return{...clone(p),obsolete:f.pointer===p.payload.messageId&&f.state.textChannelId===p.payload.channelId};}
 };
 f.delivery=id=>({read:async()=>{const p=f.jobs.get(id).payload;return{state:p.deliveryState,...(p.deliveryMessageId?{messageId:p.deliveryMessageId}:{})};},claim:async()=>{f.counts.claims++;const p=f.jobs.get(id).payload;if(p.deliveryState!=='PENDING')return false;p.deliveryState='SENDING';return true;},complete:async messageId=>{f.counts.completes++;Object.assign(f.jobs.get(id).payload,{deliveryState:'SENT',deliveryMessageId:messageId});}});
 f.makeMessage=(id,channel,marker='music-controller:job-1')=>{const m={id,guildId,channelId:channel,author:{id:botId},pinned:false,embeds:[{footer:{text:marker}}],components:[{type:1}],edit:async payload=>{f.counts.edits++;f.edits.push(payload);if(f.onEdit)await f.onEdit(m);if(payload.embeds)m.embeds=payload.embeds.map(e=>e.toJSON?e.toJSON():e);if(payload.components)m.components=payload.components;return m;},pin:async()=>{f.counts.pins++;if(f.pinFailures-->0)throw error(50013);m.pinned=true;return m;},unpin:async()=>{f.counts.unpins++;if(f.unpinFailures-->0)throw error(50013);m.pinned=false;return m;}};f.messages.set(id,m);return m;};
 const guild={id:guildId,members:{fetchMe:async options=>{assert.equal(options.force,true);return{id:botId};}},channels:{fetch:async(id,options)=>{assert.equal(options.force,true);return f.channels.get(id);}}};
 for(const id of [channelId,otherId]){const channel={id,guildId,guild,type:ChannelType.GuildVoice,name:'Lounge',mask:PermissionsBitField.All&~PermissionFlagsBits.Administrator,isSendable:()=>true,permissionsFor:()=>new PermissionsBitField(channel.mask),messages:{fetch:async options=>{if(f.fetchError)throw f.fetchError;if(options.message){assert.equal(options.force,true);const m=f.messages.get(options.message);if(!m)throw error(10008);return m;}assert.equal(options.cache,false);return new Collection([...f.messages].filter(([,m])=>m.channelId===id));}},send:async payload=>{f.counts.sends++;const m=f.makeMessage(String(555555555555555550n+BigInt(f.counts.sends)),id);m.embeds=payload.embeds.map(e=>e.toJSON());m.components=payload.components;if(f.onSend)await f.onSend(m);if(f.sendError)throw error(500);return m;}};f.channels.set(id,channel);}
 f.client={user:{id:botId},guilds:{fetch:async options=>{assert.deepEqual(options,{guild:guildId,force:true});return guild;}}};
 const payloadFactory=async(state,options)=>{assert.equal(options.voiceChannelName,'Lounge');const payload={embeds:[new EmbedBuilder().setTitle('The Jukebox').setFooter({text:'original'})],files:[{attachment:Buffer.from('approved fixture'),name:'music-controller.png'}],components:[new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('music:control:'+guildId+':'+state.revision+':1:pause:public').setLabel('Pause').setStyle(ButtonStyle.Primary))],attachments:[],allowedMentions:{parse:[]}};f.factoryPayloads.push(payload);if(f.onRender)await f.onRender();return payload;};
 f.publisher=new DiscordMusicPublication(f.repo,f.delivery,payloadFactory,async()=>f.enabled);f.link=()=>{const m=f.makeMessage('555555555555555559',channelId);Object.assign(f.jobs.get('job-1').payload,{deliveryState:'SENT',deliveryMessageId:m.id});f.pointer=m.id;return m;};return f;
}
const rejects=(work,code)=>assert.rejects(work,{code});

test('Controller ensure uses one shared delivery, authoritative pointer and pin with stable marker; payload is cloned',async()=>{
 const f=fixture();const result=await f.publisher.ensure(f.client,guildId);assert.equal(result.kind,'published');assert.equal(f.pointer,result.messageId);assert.equal(f.counts.sends,1);assert.equal(f.counts.claims,1);assert.equal(f.counts.completes,1);assert.equal(f.counts.pins,1);
 await f.publisher.refresh(f.client,guildId);assert.equal(f.counts.sends,1);assert.equal(f.messages.get(f.pointer).embeds[0].footer,undefined);assert.match(f.messages.get(f.pointer).components[0].components[0].custom_id,/:p=job-1$/);assert.ok(f.factoryPayloads.every(p=>p.embeds[0].data.footer.text==='original'));assert.ok(f.edits.every(p=>p.allowedMentions.parse.length===0));
});
test('Ambiguous send is recovered by bot author, destination and durable marker without another send',async()=>{
 const f=fixture();f.sendError=true;await rejects(f.publisher.publish(f.client,'job-1'),'MUSIC_PUBLICATION');assert.equal(f.jobs.get('job-1').payload.deliveryState,'SENDING');assert.equal(f.pointer,null);f.sendError=false;
 const result=await f.publisher.publish(f.client,'job-1');assert.equal(result.kind,'published');assert.equal(f.counts.sends,1);assert.equal(f.counts.claims,1);assert.equal(f.counts.pins,1);assert.equal(f.pointer,result.messageId);
});
test('Uncertain delivery never blindly resends and a foreign marker does not satisfy recovery',async()=>{
 for(const foreign of [false,true]){const f=fixture();f.jobs.get('job-1').payload.deliveryState='SENDING';if(foreign)f.makeMessage('555555555555555559',channelId).author.id='999999999999999999';await rejects(f.publisher.publish(f.client,'job-1'),'DELIVERY_UNCERTAIN');assert.equal(f.counts.sends,0);assert.equal(f.counts.finalizes,0);}
});
test('Pin failure retries the same confirmed message before any new edit or send',async()=>{
 const f=fixture();f.pinFailures=1;await rejects(f.publisher.publish(f.client,'job-1'),'MUSIC_PUBLICATION');const id=f.pointer;assert.ok(id);assert.equal(f.counts.sends,1);assert.equal(f.counts.edits,0);assert.equal(f.counts.pins,1);
 await f.publisher.publish(f.client,'job-1');assert.equal(f.pointer,id);assert.equal(f.counts.sends,1);assert.equal(f.counts.pins,2);assert.equal(f.counts.edits,1);
});
test('Refresh rejects foreign authors, wrong channels, forged markers and obsolete publication linkage',async()=>{
 for(const change of [(f,m)=>{m.author.id='999999999999999999';},(f,m)=>{m.channelId=otherId;},(f,m)=>{m.embeds[0].footer.text='music-controller:forged';},f=>{f.jobs.get('job-1').payload.deliveryMessageId='666666666666666666';}]){const f=fixture(),m=f.link();change(f,m);await assert.rejects(f.publisher.refresh(f.client,guildId));assert.equal(f.counts.edits,0);assert.equal(f.counts.pins,0);assert.equal(f.counts.sends,0);}
});
test('Refresh discards a rendered payload if state changes before editing the authoritative message',async()=>{
 const f=fixture();f.link();f.onRender=()=>{f.state.revision++;};await rejects(f.publisher.refresh(f.client,guildId),'MUSIC_STALE');assert.equal(f.counts.edits,0);assert.equal(f.counts.pins,0);assert.equal(f.counts.sends,0);
});
test('Only confirmed UnknownMessage reserves a replacement for the exact old pointer',async()=>{
 const f=fixture(),old=f.link();f.messages.delete(old.id);const result=await f.publisher.refresh(f.client,guildId);assert.equal(result.kind,'published');assert.equal(f.counts.sends,1);assert.equal(f.reservations[0].expected,old.id);assert.notEqual(f.pointer,old.id);assert.ok(f.cleanups.has('cleanup-'+old.id));assert.equal(f.messages.get(f.pointer).embeds[0].footer,undefined);assert.match(f.messages.get(f.pointer).components[0].components[0].custom_id,/:p=job-2$/);
 const denied=fixture();denied.link();denied.fetchError=error(50013);await rejects(denied.publisher.refresh(denied.client,guildId),'MUSIC_PUBLICATION');assert.equal(denied.reservations.length,0);assert.equal(denied.counts.sends,0);
});
test('Confirmed delivery deleted before finalization is replaced through expected-message CAS instead of retrying forever',async()=>{
 const f=fixture(),old=f.link();f.pointer=null;f.messages.delete(old.id);const result=await f.publisher.publish(f.client,'job-1');assert.equal(result.kind,'published');assert.equal(f.counts.sends,1);assert.notEqual(f.pointer,old.id);assert.equal(f.reservations[0].expected,old.id);assert.equal(f.jobs.get('job-1').payload.superseded,true);
});
test('Relocation during final enable checks cannot send or pin in the retired destination',async()=>{
 const f=fixture();let checks=0;const publisher=new DiscordMusicPublication(f.repo,f.delivery,async()=>({embeds:[new EmbedBuilder().setTitle('Controller')],files:[],components:[new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('music:control:test').setLabel('Pause').setStyle(ButtonStyle.Primary))],attachments:[],allowedMentions:{parse:[]}}),async()=>{if(++checks===3)f.move();return true;});
 await rejects(publisher.publish(f.client,'job-1'),'MUSIC_STALE');assert.equal(f.counts.sends,0);assert.equal(f.counts.pins,0);
 const pin=fixture();const m=pin.link();pin.pointer=null;let pinChecks=0;const retry=new DiscordMusicPublication(pin.repo,pin.delivery,async()=>{throw error('SHOULD_NOT_RENDER');},async()=>{if(++pinChecks===2)pin.move();return true;});const result=await retry.publish(pin.client,'job-1');assert.equal(result.kind,'obsolete');assert.equal(pin.counts.pins,0);assert.ok(pin.cleanups.has('cleanup-'+m.id));
});
test('Late send after relocation is finalized only for durable cleanup and never pinned as the new controller',async()=>{
 const f=fixture();f.onSend=()=>f.move();const result=await f.publisher.publish(f.client,'job-1');assert.equal(result.kind,'obsolete');assert.equal(f.pointer,null);assert.equal(f.counts.pins,0);assert.equal(f.counts.edits,0);assert.ok(f.cleanups.has('cleanup-'+result.messageId));
 await f.publisher.cleanup(f.client,'cleanup-'+result.messageId);assert.deepEqual(f.messages.get(result.messageId).components,[]);assert.equal(f.counts.sends,1);
});
test('Relocation during an edit avoids a late pin and cleanup retires controls without deleting approved content',async()=>{
 const f=fixture(),m=f.link();m.pinned=true;f.onEdit=()=>{f.onEdit=null;f.move();};const result=await f.publisher.refresh(f.client,guildId);assert.equal(result.kind,'obsolete');assert.equal(f.counts.pins,0);const before=clone(m.embeds);
 await f.publisher.cleanup(f.client,'cleanup-'+m.id);assert.deepEqual(m.components,[]);assert.ok(m.embeds.every(embed=>!embed.footer));assert.equal(m.pinned,false);assert.equal(f.counts.unpins,1);assert.deepEqual(Object.keys(f.edits.at(-1)).sort(),['allowedMentions','components','content','embeds']);
});
test('Disabled or permission-denied fresh publication makes no send or delivery claim',async()=>{
 const disabled=fixture();disabled.enabled=false;await rejects(disabled.publisher.publish(disabled.client,'job-1'),'MUSIC_DISABLED');assert.equal(disabled.counts.claims,0);assert.equal(disabled.counts.sends,0);
 for(const bit of [PermissionFlagsBits.ViewChannel,PermissionFlagsBits.ReadMessageHistory,PermissionFlagsBits.SendMessages,PermissionFlagsBits.AttachFiles,PermissionFlagsBits.EmbedLinks,PermissionFlagsBits.PinMessages]){const f=fixture();f.channels.get(channelId).mask&=~bit;await rejects(f.publisher.publish(f.client,'job-1'),'MUSIC_PERMISSIONS');assert.equal(f.counts.claims,0);assert.equal(f.counts.sends,0);}
});
test('Disabled recovery finalizes an already-sent message without any new send, pin or edit',async()=>{
 const f=fixture();f.jobs.get('job-1').payload.deliveryState='SENDING';const m=f.makeMessage('555555555555555559',channelId);f.enabled=false;const result=await f.publisher.publish(f.client,'job-1');assert.equal(result.messageId,m.id);assert.equal(f.pointer,m.id);assert.equal(f.counts.completes,1);assert.equal(f.counts.sends+f.counts.edits+f.counts.pins,0);
});
test('Obsolete pending publication skips; obsolete ambiguous send still recovers and schedules cleanup',async()=>{
 const pending=fixture();pending.move();assert.equal((await pending.publisher.publish(pending.client,'job-1')).kind,'obsolete');assert.equal(pending.counts.claims,0);
 const f=fixture();f.jobs.get('job-1').payload.deliveryState='SENDING';const m=f.makeMessage('555555555555555559',channelId);f.move();const result=await f.publisher.publish(f.client,'job-1');assert.equal(result.kind,'obsolete');assert.ok(f.cleanups.has('cleanup-'+m.id));assert.equal(f.counts.sends+f.counts.edits+f.counts.pins,0);
});
test('Cleanup refuses active or foreign posts and tolerates confirmed missing retired posts',async()=>{
 const active=fixture(),m=active.link();active.cleanups.set('cleanup',{job:{guildId},payload:{channelId,messageId:m.id}});assert.equal((await active.publisher.cleanup(active.client,'cleanup')).kind,'obsolete');assert.equal(active.counts.edits,0);
 const foreign=fixture(),other=foreign.link();foreign.move();other.author.id='999999999999999999';await rejects(foreign.publisher.cleanup(foreign.client,'cleanup-'+other.id),'MUSIC_AUTHOR');assert.equal(foreign.counts.edits,0);
 const missing=fixture(),gone=missing.link();missing.move();missing.messages.delete(gone.id);assert.equal((await missing.publisher.cleanup(missing.client,'cleanup-'+gone.id)).kind,'missing');
});
test('Unpin failure is retryable with no duplicate publication or destructive delete',async()=>{
 const f=fixture(),m=f.link();m.pinned=true;f.move();f.unpinFailures=1;await rejects(f.publisher.cleanup(f.client,'cleanup-'+m.id),'MUSIC_PUBLICATION');assert.deepEqual(m.components,[]);assert.equal(m.pinned,true);await f.publisher.cleanup(f.client,'cleanup-'+m.id);assert.equal(m.pinned,false);assert.equal(f.counts.unpins,2);assert.equal(f.counts.sends,0);assert.ok(f.messages.has(m.id));
});
test('Same-server concurrent ensure calls retain one durable controller and fixed errors do not reveal provider details',async()=>{
 const f=fixture();await Promise.all([f.publisher.ensure(f.client,guildId),f.publisher.ensure(f.client,guildId)]);assert.equal(f.counts.sends,1);assert.equal(f.counts.claims,1);
 const failed=fixture();failed.repo.read=async()=>{throw error('PRIVATE_ERROR_CODE');};await assert.rejects(failed.publisher.ensure(failed.client,guildId),e=>{assert.equal(e.code,'MUSIC_PUBLICATION');assert.ok(!inspect(e).includes('PRIVATE'));assert.equal(e.cause,undefined);return true;});
});


test('retired verified bot players are deleted when possible; forbidden deletion disables and labels the post',async()=>{
 for(const denied of [false,true]){const f=fixture(),m=f.link();f.move();let deleted=0;m.delete=async()=>{if(denied)throw error(50013);deleted++;f.messages.delete(m.id);};await f.publisher.cleanup(f.client,'cleanup-'+m.id);assert.equal(deleted,denied?0:1);if(denied){assert.deepEqual(m.components,[]);assert.match(f.edits.at(-1).content,/retired/);assert.ok(m.embeds.every(embed=>!embed.footer));}else assert.equal(f.counts.edits,0);}
});


test('voice-chat pin rejection retains one authoritative editable player without repeated failed pins',async()=>{
 const f=fixture();f.onSend=message=>{message.pin=async()=>{f.counts.pins++;throw error(50019);};};const result=await f.publisher.ensure(f.client,guildId);assert.equal(result.kind,'published');assert.equal(f.pointer,result.messageId);await f.publisher.refresh(f.client,guildId);assert.equal(f.counts.sends,1);assert.equal(f.counts.pins,1);assert.equal(f.counts.edits,2);assert.equal(f.messages.get(f.pointer).embeds[0].footer,undefined);
});


test('definite pre-send state changes release the claim; the next attempt publishes all control rows',async()=>{
 const f=fixture();f.onRender=()=>{f.state.revision++;};await rejects(f.publisher.ensure(f.client,guildId),'MUSIC_STALE');assert.equal(f.counts.sends,0);assert.equal(f.jobs.get('job-1').payload.deliveryState,'PENDING');f.onRender=null;await f.publisher.ensure(f.client,guildId);assert.equal(f.counts.sends,1);assert.equal(f.messages.get(f.pointer).components.length,1);assert.equal(f.messages.get(f.pointer).components[0].components[0].label,'Pause');await f.publisher.refresh(f.client,guildId);assert.equal(f.messages.get(f.pointer).components[0].components[0].label,'Pause');
});


test('real shared Jukebox creation and refresh retain all native control rows',async()=>{
 const f=fixture();f.state=createMusicState(guildId,{guildId,userId:otherId,voiceChannelId:channelId,textChannelId:channelId,eligible:true,isDj:true},{queueMaxTracks:10,defaultVolume:65,defaultLoop:'off',defaultAutoplay:false}).state;
 const coordinator=new DiscordMusicCoordinator(f.repo,{},null,async()=>({eligible:true,isDj:true}));f.publisher.payloadFactory=coordinator.payload.bind(coordinator);
 await f.publisher.ensure(f.client,guildId);const expected=[['Previous','Pause','Skip','Stop'],['Queue','Shuffle','Loop'],['Volume','Autoplay','Refresh']];assert.deepEqual(f.messages.get(f.pointer).components.map(row=>row.components.map(button=>button.label)),expected);f.state.revision++;await f.publisher.refresh(f.client,guildId);assert.deepEqual(f.messages.get(f.pointer).components.map(row=>row.components.map(button=>button.label)),expected);assert.equal(f.counts.sends,1);
});

test('Disconnected sessions retire the Jukebox without rendering, sending or resurrecting a pending player',async()=>{const f=fixture();f.link();f.state.desiredStatus='DISCONNECTED';let retired=0;f.repo.retireController=async()=>{retired++;f.pointer=null;return{retired:true};};await f.publisher.ensure(f.client,guildId);await f.publisher.refresh(f.client,guildId);assert.equal(retired,2);assert.equal(f.counts.sends,0);assert.equal(f.factoryPayloads.length,0);const pending=fixture();pending.state.desiredStatus='DISCONNECTED';assert.equal((await pending.publisher.publish(pending.client,'job-1')).kind,'obsolete');assert.equal(pending.counts.sends,0);});
