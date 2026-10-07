import test from 'node:test';
import assert from 'node:assert/strict';
import {MemberDirectoryService,directoryMatches,directoryRecord,effectiveDisplayName,nextDirectoryReconciliation} from '../../.test-build/packages/database/src/member-directory.js';

const now=new Date('2026-10-06T12:00:00.000Z');
const input=(overrides={})=>({guildId:'chairs',userId:'100000000000000001',nickname:null,displayName:'Jordan Display',username:'notjordan',...overrides});

class Store {
  rows=new Map();
  async upsert(row){this.rows.set(`${row.guildId}:${row.userId}`,structuredClone(row));}
  async archive(guildId,userId,archivedAt){const row=this.rows.get(`${guildId}:${userId}`);if(row&&!row.archivedAt)row.archivedAt=new Date(archivedAt);}
  async active(guildId){return [...this.rows.values()].filter(row=>row.guildId===guildId&&!row.archivedAt).map(row=>structuredClone(row));}
}

test('member directory uses nickname then Discord display name then username as the effective display name',()=>{
  assert.equal(effectiveDisplayName(input({nickname:'Seat Captain'})),'Seat Captain');
  assert.equal(effectiveDisplayName(input()),'Jordan Display');
  assert.equal(effectiveDisplayName(input({displayName:null,username:'chairperson'})),'chairperson');
  const row=directoryRecord(input({nickname:'Seat Captain'}),now);
  assert.deepEqual(row.normalizedAliases.sort(),['jordan display','notjordan','seat captain']);
});

test('directory searching supports partial aliases but never treats duplicate display names as identity',()=>{
  const first=directoryRecord(input({userId:'100000000000000001',nickname:'Jordan'}),now);
  const second=directoryRecord(input({userId:'100000000000000002',nickname:'Jordan',username:'otherjordan'}),now);
  assert.equal(directoryMatches(first,'jor'),true);
  assert.equal(directoryMatches(second,'Jordan'),true);
  assert.notEqual(first.userId,second.userId);
  assert.equal(directoryMatches(first,'100000000000000001'),true);
});

test('join/profile/nickname observations update one canonical directory record',async()=>{
  const store=new Store(),service=new MemberDirectoryService(store,()=>now);
  await service.memberObserved(input({nickname:'Old Seat'}));
  await service.memberObserved(input({nickname:'New Seat',username:'newname'}));
  const [row]=await store.active('chairs');
  assert.equal(row.displayName,'New Seat');assert.equal(row.username,'newname');assert.deepEqual(row.normalizedAliases,['new seat','jordan display','newname']);
});

test('daily reconciliation upserts current guild members and archives departed entries without deleting history',async()=>{
  const store=new Store(),service=new MemberDirectoryService(store,()=>now);
  await service.memberObserved(input({userId:'100000000000000001',nickname:'Still Here'}));
  await service.memberObserved(input({userId:'100000000000000002',nickname:'Left Chair'}));
  const result=await service.reconcile('chairs',[input({userId:'100000000000000001',nickname:'Renamed'})]);
  assert.deepEqual(result,{synced:1,archived:1});
  const active=await store.active('chairs');assert.equal(active.length,1);assert.equal(active[0].displayName,'Renamed');
  assert.ok(store.rows.get('chairs:100000000000000002').archivedAt);
});

test('daily reconciliation schedule remains a future Mountain-time boundary across the DST offset',()=>{
  const beforeDst=nextDirectoryReconciliation(new Date('2026-11-01T10:30:00.000Z'));
  const afterDst=nextDirectoryReconciliation(new Date('2026-11-01T13:30:00.000Z'));
  assert.ok(beforeDst.getTime()>Date.parse('2026-11-01T10:30:00.000Z'));
  assert.ok(afterDst.getTime()>Date.parse('2026-11-01T13:30:00.000Z'));
});
