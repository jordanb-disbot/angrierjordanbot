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
   const p=await repo.profile('profiles','a',at);assert.equal(p.activity.allTime.messages,1);assert.equal(p.activity.day.messages,1);assert.equal(p.activity.day.words,4);assert.equal(p.activity.week.messages,1);assert.equal(p.activity.week.words,4);assert.equal(p.activity.allTime.words,4);assert.equal(p.activity.mostCommand,'profile');assert.deepEqual(p.activity.topWords,[{word:'chair',count:1},{word:'lounge',count:1}]);
  });
  await t.test('activity privacy hides all routine activity while retaining stored counts',async()=>{await repo.privacy('profiles','a','activity',false);assert.equal((await repo.profile('profiles','a',at)).activity,null);await repo.privacy('profiles','a','roast',false);assert.equal((await repo.profile('profiles','a',at)).state.roastEnabled,false);await repo.privacy('profiles','a','activity',true);assert.equal((await repo.profile('profiles','a',at)).activity.allTime.messages,1);});
  await t.test('weekly co-winners and Triple Threat survive duplicate freeze and restart',async()=>{
   await repo.message('profiles','b','msg-b',at,input);
   const members=['a','b'].map(userId=>({userId,channelId:'voice',qualified:true}));
   await repo.voice('profiles',members,at);await repo.voice('profiles',members,new Date(at.getTime()+30000));
   const frozenAt=new Date('2026-09-21T10:00:00Z'),restarted=new PrismaProfilesRepository(db);
   await Promise.all([repo,restarted,new PrismaProfilesRepository(db),new PrismaProfilesRepository(db)].map(worker=>worker.freeze('profiles',frozenAt)));
   assert.equal(await db.weeklySpotlight.count({where:{guildId:'profiles'}}),6,'one three-category award set per co-winner');assert.equal(await db.spotlightFreeze.count({where:{guildId:'profiles'}}),1,'concurrent workers share one immutable weekly freeze');assert.equal(await db.scheduledJob.count({where:{guildId:'profiles',jobType:'spotlight.announce'}}),1,'concurrent workers schedule one announcement');assert.equal(await db.memberAchievement.count({where:{guildId:'profiles',achievementId:'spotlight.triple_threat'}}),0,'Triple Threat waits for completed Spotlight publication');
   await restarted.freeze('profiles',frozenAt);
   assert.equal(await repo.claimAnnouncement('profiles','2026-09-14'),true);assert.equal(await restarted.claimAnnouncement('profiles','2026-09-14'),false);
   await repo.delivered('profiles','2026-09-14','discord-test-message');assert.equal((await repo.announcement('profiles','2026-09-14')).deliveryState,'SENT');
   await restarted.delivered('profiles','2026-09-14','discord-test-message');assert.equal(await db.memberAchievement.count({where:{guildId:'profiles',achievementId:'spotlight.triple_threat'}}),2,'completion and retry grant each permanent award exactly once');
   for(const userId of ['a','b']){const p=await repo.profile('profiles',userId,new Date('2026-09-22T12:00:00Z'));assert.equal(p.state.tripleThreatAt?.toISOString(),frozenAt.toISOString(),'Triple Threat date is permanent across publication replay');assert.equal(p.spotlight.length,3);}
  });
  await t.test('missed weeks reconcile without stale badges or loss of permanent Triple Threat',async()=>{
   await repo.reconcile('profiles',new Date('2026-10-06T12:00:00Z'));
   assert.equal(await db.spotlightFreeze.count({where:{guildId:'profiles'}}),3);
   const p=await repo.profile('profiles','a',new Date('2026-10-06T12:00:00Z'));assert.ok(p.state.tripleThreatAt);assert.equal(p.spotlight.length,0);
   await assert.rejects(()=>repo.showcase('profiles','a',['not-earned'],undefined),{code:'SHOWCASE_OWNERSHIP'});
  });
  await t.test('posting settings persist once per freeze, smooth history and survive recovery',async()=>{
   const guildId='profiles-posting',settings={fallbackHour:21,startHour:8,endHour:12};await db.guild.create({data:{id:guildId,name:'Posting test'}});
   await repo.freeze(guildId,new Date('2026-09-21T10:00:00Z'),settings);
   const first=await repo.announcement(guildId,'2026-09-14');assert.equal(first.announceAt.toISOString(),'2026-09-22T03:00:00.000Z');
   await new PrismaProfilesRepository(db).freeze(guildId,new Date('2026-09-21T10:00:00Z'),{fallbackHour:17,startHour:17,endHour:22});
   assert.equal((await repo.announcement(guildId,'2026-09-14')).announceAt.toISOString(),first.announceAt.toISOString());
   await db.activityObservation.createMany({data:Array.from({length:30},(_,n)=>({id:'posting-history-'+n,guildId,userId:'observer',kind:'message',occurredAt:new Date('2026-09-21T14:00:00Z'),hourMt:8}))});
   await new PrismaProfilesRepository(db).reconcile(guildId,new Date('2026-09-28T10:00:00Z'),settings);
   assert.equal((await repo.announcement(guildId,'2026-09-21')).announceAt.toISOString(),'2026-09-28T17:00:00.000Z');
   const jobs=await db.scheduledJob.findMany({where:{guildId,jobType:'spotlight.announce'},orderBy:{dueAt:'asc'}});assert.equal(jobs.length,2);assert.equal(jobs[1].dueAt.toISOString(),'2026-09-28T17:00:00.000Z');
   await assert.rejects(()=>repo.freeze(guildId,new Date('2026-10-05T10:00:00Z'),{fallbackHour:19,startHour:22,endHour:17}),{code:'SPOTLIGHT_POSTING_CONFIG'});
   assert.equal(await db.spotlightFreeze.count({where:{guildId}}),2);assert.equal(await db.scheduledJob.count({where:{guildId,jobType:'spotlight.announce'}}),2);
  });
  await t.test('overall wins count individual games without double-counting category aggregates',async()=>{
   for(const [gameKey,wins] of [['tictactoe',2],['connectfour',1],['skill_games',3],['wwyd',4],['party_games',4]])await db.memberGameStats.create({data:{guildId:'profiles',userId:'a',gameKey,wins}});
   assert.equal((await repo.leaderboard('profiles','wins')).find(row=>row.userId==='a').value,7);
  });
  await t.test('record improvements serialize, preserve exact integers and separate monthly periods',async()=>{
   await Promise.all([repo.record('profiles','a','casino.biggest_win',9007199254740993n,'record-a',at),repo.record('profiles','b','casino.biggest_win',9007199254740994n,'record-b',at)]);
   assert.equal((await repo.records('profiles','alltime',at))[0].value.amount,'9007199254740994');assert.equal((await repo.records('profiles','monthly',new Date('2026-10-01T10:00:00Z'))).length,0);
   const before=await db.scheduledJob.count({where:{jobType:'record.announce'}});await repo.record('profiles','b','casino.biggest_win',9007199254740994n,'record-b',at);assert.equal(await db.scheduledJob.count({where:{jobType:'record.announce'}}),before);
  });
 }finally{assert.match(schema,/^aj_profiles_test_[0-9a-f]{32}$/);try{if(connected)await db.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);}finally{await db.$disconnect();}}
});
