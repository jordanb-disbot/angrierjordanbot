import test from 'node:test';
import assert from 'node:assert/strict';
import {DiscordEconomyCoordinator} from '../../dist/apps/bot/src/discord/economy-coordinator.js';
import {AuditService,FixedClock,InMemoryAuditSink} from '../../dist/packages/core/src/index.js';
import {EconomyService,InMemoryEconomyRepository} from '../../dist/packages/features-economy/src/index.js';

function setup(action){
 const events=[];
 const service=new EconomyService(new InMemoryEconomyRepository(),new AuditService(new InMemoryAuditSink()),new FixedClock(new Date('2026-09-26T18:00:00Z')),{next:()=>0},[{id:'f1',text:'The chair knows.'}]);
 const config={get:async(_g,key)=>{events.push('config');return {'economy.starter_ottomans':0,'server.daily_reset_hour':4,'economy.daily_base':250,'economy.daily_milestones':{},'economy.daily_spin_table':[{kind:'ottomans',weight:1,amount:100}]}[key];}};
 const i={guildId:'g',user:{id:'u'},id:'first',customId:`economy:daily:${action}`,deferred:false,replied:false,
  deferUpdate:async()=>{events.push('ack');i.deferred=true;},editReply:async p=>{events.push('edit');i.payload=p;},followUp:async p=>{events.push('error');i.error=p;}};
 return{events,service,i,coordinator:new DiscordEconomyCoordinator(service,config)};
}
for(const action of ['claim','spin','fortune']){
 test(`${action} acknowledges before reads and edits the existing hub`,async()=>{
  const {events,i,coordinator}=setup(action);await coordinator.handleButton(i);
  assert.equal(events[0],'ack');assert.equal(events.at(-1),'edit');assert.ok(i.payload.files.length);assert.equal(i.error,undefined);
  assert.equal(i.payload.components[0].toJSON().components[['claim','spin','fortune'].indexOf(action)].disabled,true);
 });
 test(`${action} committed before a failed UI update cannot grant twice`,async()=>{
  const {service,i,coordinator}=setup(action);i.editReply=async()=>{throw new Error('Discord edit failed');};await coordinator.handleButton(i);
  const before=(await service.account('g','u')).wallet;assert.equal(i.error.ephemeral,true);
  i.id='retry';i.editReply=async p=>{i.payload=p;};await coordinator.handleButton(i);
  assert.equal((await service.account('g','u')).wallet,before);assert.match(i.payload.embeds[0].toJSON().description,/already used/);
 });
}
test('upstream acknowledgement is not repeated',async()=>{const {events,i,coordinator}=setup('claim');i.deferred=true;await coordinator.handleButton(i);assert.equal(events.includes('ack'),false);assert.ok(i.payload);});
test('acknowledgement failure never performs account or reward work',async()=>{const {events,i,coordinator}=setup('claim');i.deferUpdate=async()=>{throw new Error('expired');};i.reply=async()=>{};await coordinator.handleButton(i);assert.deepEqual(events,[]);});
