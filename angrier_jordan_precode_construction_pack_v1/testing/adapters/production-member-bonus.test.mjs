import test from 'node:test';
import assert from 'node:assert/strict';
import {GUILD} from '../../scripts/audit-production-race-line.mjs';
import {MEMBER_BONUS,currentHumanMembers,grantProductionMemberBonus,memberBonusKey} from '../../scripts/grant-production-member-bonus.mjs';

test('member listing paginates, excludes bots, and rejects malformed members',async()=>{
 const a='1432212068785721424',b='1537333882846842930',bot='1524964384642957432',calls=[];
 const members=await currentHumanMembers(async path=>{calls.push(path);return [{user:{id:a,bot:false}},{user:{id:b,bot:false}},{user:{id:bot,bot:true}}];});
 assert.deepEqual(members,[a,b].sort());
 assert.equal(calls.length,1);
 await assert.rejects(()=>currentHumanMembers(async()=>[{user:{id:'invalid',bot:false}}]),/DISCORD_MEMBER_INVALID/);
});

function fixture(existing=[]){
 const a='1432212068785721424',b='1537333882846842930',writes=[],messages=[];
 const db={guild:{findUnique:async()=>({id:GUILD})},operationReceipt:{findMany:async()=>existing.map(key=>({key}))}};
 const atomic={run:async(guildId,key,fingerprint,operation)=>{assert.equal(guildId,GUILD);assert.equal(fingerprint,'chairs-member-bonus-40000:v1');let lines;await operation({}, {apply:async tx=>{lines=tx.lines;return 'applied';}});writes.push({key,lines});return{};}};
 const get=async()=>[{user:{id:a,bot:false}},{user:{id:b,bot:false}},{user:{id:'1524964384642957432',bot:true}}];
 return {a,b,writes,messages,run:()=>grantProductionMemberBonus({db,get,atomic,write:line=>messages.push(line)})};
}

test('one-time member bonus pays every current human through balanced ledger entries',async()=>{
 const f=fixture(),result=await f.run();assert.equal(result.granted,2);assert.equal(result.alreadyGranted,0);assert.equal(result.amount,MEMBER_BONUS);
 assert.equal(f.writes.length,2);for(const write of f.writes){assert.equal(write.lines[0].amount,MEMBER_BONUS);assert.equal(write.lines[1].amount,-MEMBER_BONUS);assert.equal(write.lines[0].bucket,'wallet');assert.equal(write.lines[1].bucket,'system');}
 assert.ok(f.messages.every(line=>line.startsWith('PASS:')));
});

test('rerun skips members with durable campaign receipts',async()=>{
 const f=fixture([memberBonusKey('1432212068785721424'),memberBonusKey('1537333882846842930')]),result=await f.run();assert.equal(result.granted,0);assert.equal(result.alreadyGranted,2);assert.equal(f.writes.length,0);
});
