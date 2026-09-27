import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {inspect} from 'node:util';
import {Events} from 'discord.js';
import {DiscordServerBootstrap} from '../../dist/apps/bot/src/discord/server-bootstrap.js';
const a={id:'111111111111111111',name:'Chairs'},b={id:'222222222222222222',name:'Second server'},c={id:'333333333333333333',name:'Third server'};
const tick=()=>new Promise(resolve=>setImmediate(resolve));
const repository=work=>({ensure:async input=>{await work(input);return{created:true,guild:{id:input.guildId,name:input.name??null,createdAt:new Date(0)}};}});

test('Startup census is a full committed prerequisite before config, music, recovery and jobs',async()=>{
 const releases=new Map(),order=[];const gate=new DiscordServerBootstrap(repository(async input=>{order.push('begin:'+input.guildId);await new Promise(resolve=>releases.set(input.guildId,resolve));order.push('committed:'+input.guildId);}));
 const startup=(async()=>{await gate.census([a,b,a]);order.push('config','music','recovery','jobs');})();await tick();assert.equal(releases.size,2);assert.ok(!order.includes('config'));releases.get(a.id)();await tick();assert.ok(!order.includes('music'));releases.get(b.id)();await startup;
 assert.deepEqual(order.slice(-4),['config','music','recovery','jobs']);assert.equal(order.filter(row=>row==='begin:'+a.id).length,1);
});
test('GuildCreate and overlapping events share one commit before any feature side effects',async()=>{
 let release;const calls=[],writes=[];const gate=new DiscordServerBootstrap(repository(async input=>{calls.push(input);await new Promise(resolve=>release=resolve);}));
 const create=gate.run(Events.GuildCreate,[a],()=>writes.push('create')),message=gate.run(Events.MessageCreate,[{guild:a,guildId:a.id}],()=>writes.push('message')),join=gate.run(Events.GuildMemberAdd,[{guild:a}],()=>writes.push('join'));await tick();assert.equal(calls.length,1);assert.deepEqual(writes,[]);assert.equal(calls[0].source,'bot.guild-create');release();await Promise.all([create,message,join]);assert.equal(writes.length,3);
});
test('Every server-writing event shape commits its observed server first, including direct membership listeners',async()=>{
 const shapes=[[Events.GuildCreate,[a],'bot.guild-create'],[Events.GuildMemberAdd,[{guild:a}],'bot.event'],[Events.GuildMemberRemove,[{guild:a}],'bot.event'],[Events.GuildBanAdd,[{guild:a}],'bot.event'],[Events.ChannelCreate,[{guild:a}],'bot.event'],[Events.MessageCreate,[{guild:a}],'bot.event'],[Events.InteractionCreate,[{guildId:a.id,guild:null}],'bot.event'],[Events.GuildAuditLogEntryCreate,[{id:'entry'},a],'bot.event'],[Events.VoiceStateUpdate,[{guild:b},{guild:a}],'bot.event']];
 for(const [event,args,source] of shapes){const order=[];const gate=new DiscordServerBootstrap(repository(async input=>{assert.equal(input.guildId,a.id);assert.equal(input.source,source);order.push('committed');}));const result=await gate.run(event,args,()=>{order.push('feature');return'handled';});assert.equal(result,'handled');assert.deepEqual(order,['committed','feature']);}
});
test('Failed creation/audit blocks all waiting events, leaks no details and is retried on the next event',async()=>{
 let attempts=0,writes=0;const gate=new DiscordServerBootstrap(repository(async()=>{if(++attempts===1)throw Error('PRIVATE_DATABASE_CREDENTIAL');}));
 const results=await Promise.allSettled([gate.run(Events.MessageCreate,[{guild:a}],()=>writes++),gate.run(Events.GuildMemberAdd,[{guild:a}],()=>writes++)]);assert.ok(results.every(result=>result.status==='rejected'));for(const result of results){assert.ok(!inspect(result.reason).includes('PRIVATE'));assert.equal(result.reason.cause,undefined);}assert.equal(attempts,1);assert.equal(writes,0);
 await gate.run(Events.GuildMemberAdd,[{guild:a}],()=>writes++);assert.equal(attempts,2);assert.equal(writes,1);
});
test('Failed census waits for other in-flight prerequisites and can be retried without poisoning successful servers',async()=>{
 let release,failed=true,finished=false;const calls=[];const gate=new DiscordServerBootstrap(repository(async input=>{calls.push(input.guildId);if(input.guildId===a.id&&failed)throw Error('unavailable');if(input.guildId===b.id)await new Promise(resolve=>release=resolve);}));
 const attempt=gate.census([a,b]).finally(()=>{finished=true;});const checked=assert.rejects(attempt);await tick();assert.equal(finished,false);release();await checked;failed=false;await gate.census([a,b]);assert.equal(calls.filter(id=>id===a.id).length,2);assert.equal(calls.filter(id=>id===b.id).length,1);
});
test('Successful cache is bounded by LRU and time; evicted/expired servers are safely checked again',async()=>{
 let now=100;const calls=[];const gate=new DiscordServerBootstrap(repository(async input=>calls.push(input.guildId)),{maxCachedServers:2,cacheTtlMs:20,now:()=>now});
 await gate.ensure(a);await gate.ensure(b);await gate.ensure(a);await gate.ensure(c);await gate.ensure(b);assert.deepEqual(calls,[a.id,b.id,c.id,b.id]);now=121;await gate.ensure(b);assert.equal(calls.at(-1),b.id);assert.equal(calls.length,5);
});
test('DM and unrelated non-server events never create a default or fabricated server',async()=>{
 let calls=0,writes=0;const gate=new DiscordServerBootstrap(repository(async()=>calls++));for(const [event,args] of [[Events.MessageCreate,[{guild:null,guildId:null}]],[Events.InteractionCreate,[{guild:null,guildId:null}]],[Events.Debug,['gateway debug']]])await gate.run(event,args,()=>writes++);assert.equal(calls,0);assert.equal(writes,3);
});
test('Malformed server events fail closed without repository or feature work',async()=>{
 let calls=0,writes=0;const gate=new DiscordServerBootstrap(repository(async()=>calls++));for(const [event,args] of [[Events.GuildMemberAdd,[{}]],[Events.GuildBanAdd,[{guild:{id:'default'}}]],[Events.InteractionCreate,[{guildId:'../../server'}]],[Events.VoiceStateUpdate,[{guild:a},{}]]])await assert.rejects(gate.run(event,args,()=>writes++));assert.equal(calls,0);assert.equal(writes,0);
});
test('Observed metadata is snapshotted and only server bootstrap fields reach the repository',async()=>{
 const calls=[],observed={...a,features:{music:true},roles:['fake']};const gate=new DiscordServerBootstrap(repository(async input=>calls.push(input)));const pending=gate.ensure(observed,'bot.startup');observed.id=b.id;observed.name='Changed after dispatch';await pending;assert.equal(calls[0].guildId,a.id);assert.equal(calls[0].name,a.name);assert.equal(calls[0].source,'bot.startup');assert.deepEqual(Object.keys(calls[0]).sort(),['guildId','name','requestId','source']);
});
test('Production wiring places census before startup work and protects direct membership queues',()=>{
 const source=fs.readFileSync(new URL('../../apps/bot/src/production.ts',import.meta.url),'utf8');
 assert.ok(source.includes('serverBootstrap.run(event,args,()=>listener(...args))'));assert.ok(source.includes('on(Events.GuildCreate,'));
 const ready=source.indexOf('client.once(Events.ClientReady'),census=source.indexOf('serverBootstrap.census',ready);assert.ok(census>ready);for(const dependent of ["config.get(guildId,'music.enabled')",'seedPartyContent(db)','introductions.sweep(ready)','ensureFamilyMembership()','worker.runOnce()'])assert.ok(source.indexOf(dependent,ready)>census,dependent);
 for(const [event,argument] of [['GuildMemberAdd','member'],['GuildMemberRemove','member'],['GuildBanAdd','ban']]){const begin=source.indexOf('client.on(Events.'+event),end=source.indexOf('\n  });',begin),body=source.slice(begin,end),queue=body.indexOf('familyMembership.live(async()=>{'),prerequisite=body.indexOf('await serverBootstrap.beforeEvent(Events.'+event+',['+argument+'])');assert.ok(queue>=0&&prerequisite>queue,event);assert.ok(prerequisite<body.indexOf(event==='GuildMemberAdd'?'const familyActive':event==='GuildMemberRemove'?'if(member.guild.id':'if(!ban.user.bot'),event);}
 assert.ok(!source.includes('serverBootstrap.ensure({id:job.guildId'));
});
