import {readFileSync} from 'node:fs';
import {parseEnv} from 'node:util';
import {spawnSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {randomUUID} from 'node:crypto';
import test from 'node:test';
import assert from 'node:assert/strict';
import {PrismaClient} from '@prisma/client';
import {PrismaProfilesRepository} from '../../.test-build/packages/features-profiles/src/prisma-repository.js';
const require=createRequire(import.meta.url),schema='aj_profiles_test_'+randomUUID().replaceAll('-','');
const value=parseEnv(readFileSync(new URL('../../.env.test.local',import.meta.url),'utf8')).TEST_DATABASE_URL;
const url=new URL(value);url.searchParams.set('schema',schema);
const db=new PrismaClient({datasourceUrl:url.toString()});
test('Phase 10 PostgreSQL privacy, records and Spotlight recovery',async t=>{
 let connected=false;
 try{
  await db.$connect();connected=true;
  const migration=spawnSync(process.execPath,[require.resolve('prisma/build/index.js'),'migrate','deploy','--schema','packages/database/prisma/schema.prisma'],{env:{...process.env,DATABASE_URL:url.toString()},encoding:'utf8'});
  assert.equal(migration.status,0,'Test schema migration must succeed.');await db.guild.create({data:{id:'profiles',name:'Test Chairs'}});
  const repo=new PrismaProfilesRepository(db),at=new Date('2026-09-15T12:00:00Z'),input={content:'The lounge and chair',bot:false,command:false,excludedChannel:false};
  await t.test('duplicate observed messages and commands count exactly once',async()=>{
   await Promise.all(Array.from({length:3},()=>repo.message('profiles','a','msg',at,input)));
   await Promise.all(Array.from({length:3},()=>repo.command('profiles','a','cmd','profile',at)));
   const p=await repo.profile('profiles','a',at);assert.equal(p.activity.allTime.messages,1);assert.equal(p.activity.allTime.words,4);assert.equal(p.activity.mostCommand,'profile');
  });
  await t.test('activity privacy hides all routine activity while retaining stored counts',async()=>{await repo.privacy('profiles','a','activity',false);assert.equal((await repo.profile('profiles','a',at)).activity,null);await repo.privacy('profiles','a','roast',false);assert.equal((await repo.profile('profiles','a',at)).state.roastEnabled,false);await repo.privacy('profiles','a','activity',true);assert.equal((await repo.profile('profiles','a',at)).activity.allTime.messages,1);});
  await t.test('weekly co-winners and Triple Threat survive duplicate freeze and restart',async()=>{
   await repo.message('profiles','b','msg-b',at,input);
   const members=['a','b'].map(userId=>({userId,channelId:'voice',qualified:true}));
   await repo.voice('profiles',members,at);await repo.voice('profiles',members,new Date(at.getTime()+30000));
   await repo.freeze('profiles',new Date('2026-09-21T10:00:00Z'));
   const restarted=new PrismaProfilesRepository(db);await restarted.freeze('profiles',new Date('2026-09-21T10:00:00Z'));
   assert.equal(await db.weeklySpotlight.count({where:{guildId:'profiles'}}),6);assert.equal(await db.spotlightFreeze.count({where:{guildId:'profiles'}}),1);
   for(const userId of ['a','b']){const p=await repo.profile('profiles',userId,new Date('2026-09-22T12:00:00Z'));assert.ok(p.state.tripleThreatAt);assert.equal(p.spotlight.length,3);}
   assert.equal(await repo.claimAnnouncement('profiles','2026-09-14'),true);assert.equal(await restarted.claimAnnouncement('profiles','2026-09-14'),false);
   await repo.delivered('profiles','2026-09-14','discord-test-message');assert.equal((await repo.announcement('profiles','2026-09-14')).deliveryState,'SENT');
  });
  await t.test('missed weeks reconcile without stale badges or loss of permanent Triple Threat',async()=>{
   await repo.reconcile('profiles',new Date('2026-10-06T12:00:00Z'));
   assert.equal(await db.spotlightFreeze.count({where:{guildId:'profiles'}}),3);
   const p=await repo.profile('profiles','a',new Date('2026-10-06T12:00:00Z'));assert.ok(p.state.tripleThreatAt);assert.equal(p.spotlight.length,0);
   await assert.rejects(()=>repo.showcase('profiles','a',['not-earned'],undefined),{code:'SHOWCASE_OWNERSHIP'});
  });
  await t.test('record improvements serialize, preserve exact integers and separate monthly periods',async()=>{
   await Promise.all([repo.record('profiles','a','casino.biggest_win',9007199254740993n,'record-a',at),repo.record('profiles','b','casino.biggest_win',9007199254740994n,'record-b',at)]);
   assert.equal((await repo.records('profiles','alltime',at))[0].value.amount,'9007199254740994');assert.equal((await repo.records('profiles','monthly',new Date('2026-10-01T10:00:00Z'))).length,0);
   const before=await db.scheduledJob.count({where:{jobType:'record.announce'}});await repo.record('profiles','b','casino.biggest_win',9007199254740994n,'record-b',at);assert.equal(await db.scheduledJob.count({where:{jobType:'record.announce'}}),before);
  });
 }finally{assert.match(schema,/^aj_profiles_test_[0-9a-f]{32}$/);try{if(connected)await db.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);}finally{await db.$disconnect();}}
});
