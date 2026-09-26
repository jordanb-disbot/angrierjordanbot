import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeServerBootstrapInput,serverBootstrapAudit} from '../../.test-build/packages/core/src/server-bootstrap.js';
const guildId='111111111111111111',memberId='222222222222222222';

test('Server bootstrap projects only the minimum server prerequisite and leaves defaults virtual',()=>{
 const input={guildId,name:'  Chairs  ',source:'bot.startup',features:{music:true},roles:['admin'],config:{enabled:true}},before=structuredClone(input);
 assert.deepEqual(normalizeServerBootstrapInput(input),{guildId,name:'Chairs',source:'bot.startup',requestId:'server-bootstrap:'+guildId});assert.deepEqual(input,before);
 assert.equal(normalizeServerBootstrapInput({guildId,source:'bot.event'}).name,null);
 for(const source of ['bot.startup','bot.guild-create','bot.event','operator.bootstrap'])assert.equal(normalizeServerBootstrapInput({guildId,source}).source,source);
});

test('Bootstrap rejects malformed IDs, sources, names and request identifiers before persistence',()=>{
 const valid={guildId,name:'Chairs',source:'bot.startup'};
 for(const value of [null,undefined,{},...['',123,'server','0'.repeat(18),'1'.repeat(21),'../secret'].map(guildId=>({...valid,guildId}))])assert.throws(()=>normalizeServerBootstrapInput(value),{code:'SERVER_BOOTSTRAP_ID'});
 for(const source of ['seed','',null,'bot.startup\n'])assert.throws(()=>normalizeServerBootstrapInput({...valid,source}),{code:'SERVER_BOOTSTRAP_SOURCE'});
 for(const name of ['', ' '.repeat(3),'a'.repeat(101),'Chairs\0hidden',123])assert.throws(()=>normalizeServerBootstrapInput({...valid,name}),{code:'SERVER_BOOTSTRAP_NAME'});
 for(const requestId of ['', 'a'.repeat(161),'secret?token=x','request\nother'])assert.throws(()=>normalizeServerBootstrapInput({...valid,requestId}),{code:'SERVER_BOOTSTRAP_REQUEST'});
 assert.throws(()=>normalizeServerBootstrapInput({...valid,actorUserId:'invalid'}),{code:'SERVER_BOOTSTRAP_ACTOR'});
});

test('The creation audit uses the committed server identity and contains no feature provisioning',()=>{
 const input=normalizeServerBootstrapInput({guildId,name:'Chairs',source:'operator.bootstrap',actorUserId:memberId,requestId:'operator:first'}),guild={id:guildId,name:'Chairs',createdAt:new Date('2026-09-26T00:00:00Z')};
 const audit=serverBootstrapAudit(input,guild);assert.deepEqual(audit,{guildId,source:'operator.bootstrap',action:'server.bootstrap.created',targetType:'server',targetId:guildId,after:{id:guildId,name:'Chairs'},requestId:'operator:first',createdAt:guild.createdAt,actorUserId:memberId});
 assert.notEqual(audit.createdAt,guild.createdAt);assert.equal('before' in audit,false);assert.doesNotMatch(JSON.stringify(audit),/feature|config|balance|role|member\./);
 const system=serverBootstrapAudit(normalizeServerBootstrapInput({guildId,source:'bot.startup'}),guild);assert.equal('actorUserId' in system,false);
});
