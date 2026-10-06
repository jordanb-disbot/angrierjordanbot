import {readFileSync} from 'node:fs';
import {parseEnv} from 'node:util';
import {spawnSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {randomUUID} from 'node:crypto';
import test from 'node:test';
import assert from 'node:assert/strict';
import {PrismaClient} from '@prisma/client';
import {PrismaServerBootstrapRepository} from '../../.test-build/packages/database/src/prisma-server-bootstrap.js';
import {testServerTarget,runTestServer} from '../../scripts/test-server.mjs';

const require=createRequire(import.meta.url),schema='aj_bootstrap_test_'+randomUUID().replaceAll('-','');
// Never use process.env.DATABASE_URL. Only the ignored dedicated test credential is a source.
const value=parseEnv(readFileSync(new URL('../../.env.test.local',import.meta.url),'utf8')).TEST_DATABASE_URL;
assert.ok(value&&!value.includes('${'),'A resolved dedicated TEST_DATABASE_URL is required.');
let url;try{url=new URL(value);if(!['postgres:','postgresql:'].includes(url.protocol))throw new Error();}catch{throw new Error('The dedicated test database URL is malformed; its value is not displayed.');}
assert.match(schema,/^aj_bootstrap_test_[0-9a-f]{32}$/);url.searchParams.set('schema',schema);
const db=new PrismaClient({datasourceUrl:url.toString()}),peer=new PrismaClient({datasourceUrl:url.toString()}),restarted=new PrismaClient({datasourceUrl:url.toString()});
const ids={fresh:'111111111111111111',existing:'222222222222222222',rollback:'333333333333333333',other:'444444444444444444',member:'555555555555555555'};
const input=(guildId,overrides={})=>({guildId,name:'Chairs fixture',source:'bot.startup',...overrides});

async function tableCounts(){
 const tables=await db.$queryRawUnsafe('SELECT tablename FROM pg_tables WHERE schemaname=$1 AND tablename <> $2 ORDER BY tablename',schema,'_prisma_migrations');
 for(const table of tables)assert.match(table.tablename,/^[A-Za-z][A-Za-z0-9_]*$/);
 const counts=await db.$queryRawUnsafe(tables.map(({tablename})=>`SELECT '${tablename}' AS name, count(*)::text AS count FROM "${schema}"."${tablename}"`).join(' UNION ALL '));
 return Object.fromEntries(counts.map(row=>[row.name,Number(row.count)]));
}

test('Server bootstrap PostgreSQL creates only a server and atomic audit across concurrency and restart',async t=>{
 let connected=false;
 try{
  await db.$connect();connected=true;
  const migration=spawnSync(process.execPath,[require.resolve('prisma/build/index.js'),'migrate','deploy','--schema','packages/database/prisma/schema.prisma'],{env:{...process.env,DATABASE_URL:url.toString()},encoding:'utf8'});
  assert.equal(migration.status,0,'Disposable server-bootstrap schema migration must succeed.');
  assert.equal((await db.$queryRawUnsafe('SELECT current_schema() AS schema'))[0].schema,schema);
  const repo=new PrismaServerBootstrapRepository(db);

  await t.test('separate concurrent clients insert exactly one server and one creation audit without provisioning any other table',async()=>{
   const before=await tableCounts();
   const results=await Promise.all(Array.from({length:8},(_,i)=>new PrismaServerBootstrapRepository(i%2?peer:db).ensure(input(ids.fresh,{name:'Creator '+i,source:i%2?'operator.bootstrap':'bot.startup',requestId:'attempt:'+i}))));
   assert.equal(results.filter(result=>result.created).length,1);
   const winner=results.find(result=>result.created);assert.ok(winner);assert.ok(results.every(result=>result.guild.name===winner.guild.name));
   const saved=await db.guild.findUniqueOrThrow({where:{id:ids.fresh}});assert.deepEqual(winner.guild,saved);
   const audits=await db.auditEvent.findMany({where:{guildId:ids.fresh}});assert.equal(audits.length,1);
   assert.equal(audits[0].action,'server.bootstrap.created');assert.equal(audits[0].targetType,'server');assert.equal(audits[0].targetId,ids.fresh);assert.deepEqual(audits[0].after,{id:ids.fresh,name:saved.name});assert.equal(audits[0].createdAt.getTime(),saved.createdAt.getTime());
   const after=await tableCounts();assert.deepEqual(after,{...before,Guild:before.Guild+1,AuditEvent:before.AuditEvent+1});
   assert.equal(await db.configValue.count({where:{guildId:ids.fresh}}),0);assert.equal(await db.member.count({where:{guildId:ids.fresh}}),0);assert.equal(await db.economyAccount.count({where:{guildId:ids.fresh}}),0);assert.equal(await db.selfRoleSelection.count({where:{guildId:ids.fresh}}),0);
  });

  await t.test('retry after a new repository and a new database client never renames the server or repeats its audit',async()=>{
   const before=await db.guild.findUniqueOrThrow({where:{id:ids.fresh}}),counts=await tableCounts();
   const result=await new PrismaServerBootstrapRepository(restarted).ensure(input(ids.fresh,{name:'Do not replace the saved name',source:'bot.guild-create',requestId:'new-process'}));
   assert.equal(result.created,false);assert.deepEqual(result.guild,before);assert.deepEqual(await tableCounts(),counts);
  });

  await t.test('preexisting server, config overrides, member balances and roles are preserved exactly without synthetic audits',async()=>{
   const guild=await db.guild.create({data:{id:ids.existing,name:null,createdAt:new Date('2020-01-01T00:00:00Z')}});
   await db.configValue.createMany({data:[{guildId:ids.existing,key:'music.enabled',value:false,source:'owner',version:7,updatedBy:ids.member},{guildId:ids.existing,key:'fixture.preserved',value:{nested:['saved']},source:'owner',version:3}]});
   await db.member.create({data:{guildId:ids.existing,userId:ids.member,alias:'Original member',dmsEnabled:false}});
   await db.economyAccount.create({data:{guildId:ids.existing,userId:ids.member,wallet:123n,bank:456n,version:4}});
   await db.selfRoleSelection.create({data:{guildId:ids.existing,userId:ids.member,roleId:'666666666666666666',categoryKey:'fixture',active:true}});
   const snapshot=async()=>({guild:await db.guild.findUnique({where:{id:ids.existing}}),configs:await db.configValue.findMany({where:{guildId:ids.existing},orderBy:{key:'asc'}}),members:await db.member.findMany({where:{guildId:ids.existing}}),accounts:await db.economyAccount.findMany({where:{guildId:ids.existing}}),roles:await db.selfRoleSelection.findMany({where:{guildId:ids.existing}})});
   const before=await snapshot(),counts=await tableCounts();
   const results=await Promise.all([repo.ensure(input(ids.existing)),new PrismaServerBootstrapRepository(peer).ensure(input(ids.existing,{source:'operator.bootstrap',actorUserId:ids.member}))]);
   for(const result of results){assert.equal(result.created,false);assert.deepEqual(result.guild,guild);}
   assert.deepEqual(await snapshot(),before);assert.deepEqual(await tableCounts(),counts);assert.equal(await db.auditEvent.count({where:{guildId:ids.existing}}),0);
  });

  await t.test('an audit failure rolls the real insertion back and a later process can create and audit once',async()=>{
   let sawInserted=false;
   const failing={
    $transaction:(work,options)=>db.$transaction(tx=>work({guild:tx.guild,auditEvent:{create:async()=>{sawInserted=!!await tx.guild.findUnique({where:{id:ids.rollback}});throw new Error('Injected audit failure');}}}),options)
   };
   const before=await tableCounts();await assert.rejects(new PrismaServerBootstrapRepository(failing).ensure(input(ids.rollback)),/Injected audit failure/);
   assert.equal(sawInserted,true);assert.equal(await db.guild.findUnique({where:{id:ids.rollback}}),null);assert.deepEqual(await tableCounts(),before);
   const result=await new PrismaServerBootstrapRepository(peer).ensure(input(ids.rollback,{source:'operator.bootstrap',actorUserId:ids.member,requestId:'retry-after-rollback'}));
   assert.equal(result.created,true);const audit=await db.auditEvent.findFirstOrThrow({where:{guildId:ids.rollback}});assert.equal(audit.actorUserId,ids.member);assert.equal(audit.source,'operator.bootstrap');assert.equal(audit.requestId,'retry-after-rollback');
   assert.equal((await repo.ensure(input(ids.rollback))).created,false);assert.equal(await db.auditEvent.count({where:{guildId:ids.rollback}}),1);
  });

  await t.test('independent server bootstrap stays scoped and invalid input does not write',async()=>{
   const before=await tableCounts();await assert.rejects(repo.ensure(input('not-a-discord-id')),{code:'SERVER_BOOTSTRAP_ID'});await assert.rejects(repo.ensure(input(ids.other,{name:'bad\0name'})),{code:'SERVER_BOOTSTRAP_NAME'});assert.deepEqual(await tableCounts(),before);
   const result=await repo.ensure({guildId:ids.other,source:'bot.event'});assert.equal(result.created,true);assert.equal(result.guild.name,null);assert.equal(await db.auditEvent.count({where:{guildId:ids.other}}),1);assert.equal(await db.auditEvent.count({where:{guildId:ids.fresh}}),1);
   const after=await tableCounts();assert.deepEqual(after,{...before,Guild:before.Guild+1,AuditEvent:before.AuditEvent+1});
  });

  await t.test('supported test-server CLI bootstraps the selected fixture server without mutating retired Music settings',async()=>{
   // Only the parser sees this fake URL. All persistence remains injected into this UUID test schema.
   // No owner .env.music.local file is read and no connection is made using fixture credentials.
   const target=testServerTarget('NODE_ENV=development\nDISCORD_GUILD_ID=777777777777777777','TEST_DATABASE_URL=postgresql://fixture:fixture@ballast.proxy.rlwy.net:14970/railway');
   const guildId=target.guildId,output=[],dependencies={guildId,db,bootstrap:repo,write:message=>output.push(message)};
   const before=await tableCounts();await runTestServer('bootstrap',dependencies);
   assert.ok(await db.guild.findUnique({where:{id:guildId}}));assert.equal(await db.configValue.count({where:{guildId}}),0);assert.equal(await db.configRevision.count({where:{guildId}}),0);
   const bootstrapAudit=await db.auditEvent.findMany({where:{guildId}});assert.equal(bootstrapAudit.length,1);assert.equal(bootstrapAudit[0].action,'server.bootstrap.created');assert.equal(bootstrapAudit[0].source,'operator.bootstrap');
   const bootstrapped=await tableCounts();assert.deepEqual(bootstrapped,{...before,Guild:before.Guild+1,AuditEvent:before.AuditEvent+1});
   await runTestServer('bootstrap',dependencies);await runTestServer('status',dependencies);
   assert.deepEqual(await tableCounts(),bootstrapped);assert.ok(output.includes('PASS: Test server exists. EAJ Music is configured by its dedicated runtime, not a server setting.'));
  });
 }finally{
  await Promise.all([peer.$disconnect(),restarted.$disconnect()]);
  assert.match(schema,/^aj_bootstrap_test_[0-9a-f]{32}$/);
  try{if(connected)await db.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);}finally{await db.$disconnect();}
 }
});
