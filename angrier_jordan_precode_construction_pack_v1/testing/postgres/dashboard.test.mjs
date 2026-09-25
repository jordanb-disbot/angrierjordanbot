import {readFileSync} from 'node:fs';
import {parseEnv} from 'node:util';
import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {PrismaClient} from '@prisma/client';
import {ConfigDraftService} from '../../.test-build/packages/core/src/config-draft.js';
import {PermissionEngine} from '../../.test-build/packages/core/src/permissions.js';
import {ConfigService} from '../../.test-build/packages/core/src/config-service.js';
import {AuditService} from '../../.test-build/packages/core/src/audit.js';
import {PrismaConfigRepository,PrismaAuditSink} from '../../.test-build/packages/database/src/prisma-adapters.js';
import {PrismaConfigDraftRepository} from '../../.test-build/packages/features-dashboard/src/prisma-drafts.js';
const require=createRequire(import.meta.url);
const base=parseEnv(readFileSync(new URL('../../.env.test.local',import.meta.url),'utf8')).TEST_DATABASE_URL;
if(!base)throw new Error('TEST_DATABASE_URL is required from ignored .env.test.local.');
const schema='aj_dashboard_test_'+randomUUID().replaceAll('-',''),url=new URL(base);url.searchParams.set('schema',schema);
const db=new PrismaClient({datasourceUrl:url.toString()});
const definitions=[{key:'safe',type:'boolean',default:true,mutable:true,risk:'normal',dashboard_write:'live'},
  {key:'nullable.channel',type:'discord_channel',default:'11111111111111111',mutable:true,risk:'high',dashboard_write:'draft'},
  {key:'high.a',type:'integer',default:1,mutable:true,min:0,max:10,risk:'financial',dashboard_write:'draft'},
  {key:'high.b',type:'integer',default:2,mutable:true,min:0,max:10,risk:'financial',dashboard_write:'draft'}];
const permissions=new PermissionEngine({'dashboard.access':['guild_owner','discord_administrator'],'dashboard.force_draft_unlock':['guild_owner']});
const actor={userId:'admin',isGuildOwner:false,administrator:true};
const service=()=>new ConfigDraftService(definitions,new PrismaConfigDraftRepository(db,definitions),permissions);
const execute=(command,requestId=randomUUID(),who=actor)=>service().execute({guildId:'g',actor:who,requestId},command);
async function prepare(){
  let draft=await service().view('g',actor);
  draft=await execute({action:'acquire',expectedVersion:draft.version});
  for(const key of ['high.a','high.b']){
    const live=await db.configValue.findUnique({where:{guildId_key:{guildId:'g',key}}});
    draft=await execute({action:'stage',expectedVersion:draft.version,key,value:5,baseVersion:live?.version??0});
  }
  return execute({action:'preview',expectedVersion:draft.version});
}
test('dashboard PostgreSQL atomic audit, publish concurrency, restart and rollback',async t=>{
  let connected=false;
  try{
    await db.$connect();connected=true;
    const migrated=spawnSync(process.execPath,[require.resolve('prisma/build/index.js'),'migrate','deploy','--schema','packages/database/prisma/schema.prisma'],{env:{...process.env,DATABASE_URL:url.toString()},encoding:'utf8'});
    assert.equal(migrated.status,0,'Migration failed in isolated dashboard test schema.');
    await db.guild.create({data:{id:'g',name:'Dashboard test Chairs'}});
    await t.test('concurrent same-request low-risk writes commit once and replay after restart',async()=>{
      const request=randomUUID(),command={action:'save',key:'safe',value:false,baseVersion:0};
      const results=await Promise.all(Array.from({length:6},()=>execute(command,request)));
      assert.ok(results.every(result=>result.version===1));
      assert.equal((await execute(command,request)).version,1);
      assert.equal(await db.configRevision.count({where:{guildId:'g',key:'safe'}}),1);
      assert.equal(await db.auditEvent.count({where:{guildId:'g',requestId:request,action:'config.set'}}),1);
      await assert.rejects(execute({...command,value:true},request),{code:'REPLAY_MISMATCH'});
    });
    await t.test('distinct concurrent live writes reject stale versions',async()=>{
      const results=await Promise.allSettled([execute({action:'save',key:'safe',value:true,baseVersion:1}),execute({action:'save',key:'safe',value:true,baseVersion:1})]);
      assert.equal(results.filter(result=>result.status==='fulfilled').length,1);
      assert.equal((await db.configValue.findUniqueOrThrow({where:{guildId_key:{guildId:'g',key:'safe'}}})).version,2);
    });
    await t.test('multi-setting publish commits exactly once under duplicate/concurrent requests',async()=>{
      const draft=await prepare(),request=randomUUID(),command={action:'publish',expectedVersion:draft.version,fingerprint:draft.preview.fingerprint};
      const results=await Promise.all(Array.from({length:5},()=>execute(command,request)));
      assert.ok(results.every(result=>Object.keys(result.changes).length===0));
      assert.equal(await db.configRevision.count({where:{guildId:'g',key:{in:['high.a','high.b']}}}),2);
      assert.equal(await db.auditEvent.count({where:{guildId:'g',requestId:request,action:'config.set'}}),2);
      assert.equal(await db.auditEvent.count({where:{guildId:'g',requestId:request,action:'dashboard.draft.publish'}}),1);
      await assert.rejects(execute(command),{code:'DRAFT_CONFLICT'});
    });
    await t.test('database audit failure rolls back all settings, revisions, draft and receipt',async()=>{
      const draft=await prepare(),request=randomUUID();
      await db.$executeRawUnsafe(`CREATE FUNCTION "${schema}".reject_dashboard_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.action = 'dashboard.draft.publish' THEN RAISE EXCEPTION 'injected audit failure'; END IF; RETURN NEW; END $$`);
      await db.$executeRawUnsafe(`CREATE TRIGGER reject_dashboard_audit BEFORE INSERT ON "${schema}"."AuditEvent" FOR EACH ROW EXECUTE FUNCTION "${schema}".reject_dashboard_audit()`);
      const before=await db.configValue.findMany({where:{guildId:'g'},orderBy:{key:'asc'}}),revisions=await db.configRevision.count({where:{guildId:'g'}});
      await assert.rejects(execute({action:'publish',expectedVersion:draft.version,fingerprint:draft.preview.fingerprint},request));
      assert.deepEqual(await db.configValue.findMany({where:{guildId:'g'},orderBy:{key:'asc'}}),before);
      assert.equal(await db.configRevision.count({where:{guildId:'g'}}),revisions);
      assert.equal((await service().view('g',actor)).version,draft.version);
      assert.equal(await db.operationReceipt.findUnique({where:{guildId_key:{guildId:'g',key:`dashboard:${request}`}}}),null);
      await db.$executeRawUnsafe(`DROP TRIGGER reject_dashboard_audit ON "${schema}"."AuditEvent"`);
    });
    await t.test('shared ConfigService also makes non-dashboard settings and audit atomic',async()=>{
      const config=new ConfigService(definitions,new PrismaConfigRepository(db),new AuditService(new PrismaAuditSink(db)));
      const before=await db.configValue.findUniqueOrThrow({where:{guildId_key:{guildId:'g',key:'safe'}}});
      await db.$executeRawUnsafe(`CREATE FUNCTION "${schema}".reject_config_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.action = 'config.set' THEN RAISE EXCEPTION 'injected audit failure'; END IF; RETURN NEW; END $$`);
      await db.$executeRawUnsafe(`CREATE TRIGGER reject_config_audit BEFORE INSERT ON "${schema}"."AuditEvent" FOR EACH ROW EXECUTE FUNCTION "${schema}".reject_config_audit()`);
      await assert.rejects(config.set({guildId:'g',key:'safe',value:false,expectedVersion:before.version,requestId:randomUUID(),source:'bot'}));
      assert.deepEqual(await db.configValue.findUniqueOrThrow({where:{guildId_key:{guildId:'g',key:'safe'}}}),before);
      await db.$executeRawUnsafe(`DROP TRIGGER reject_config_audit ON "${schema}"."AuditEvent"`);
    });
    await t.test('owner takeover is audited and safe rollback publishes as a new revision',async()=>{
      const owner={userId:'owner',isGuildOwner:true,administrator:false};
      let draft=await service().view('g',owner);
      draft=await execute({action:'takeover',expectedVersion:draft.version},randomUUID(),owner);
      draft=await execute({action:'discard',expectedVersion:draft.version},randomUUID(),owner);
      draft=await execute({action:'acquire',expectedVersion:draft.version});
      draft=await execute({action:'rollback',expectedVersion:draft.version,key:'safe',toVersion:1,baseVersion:2});
      draft=await execute({action:'preview',expectedVersion:draft.version});
      await execute({action:'publish',expectedVersion:draft.version,fingerprint:draft.preview.fingerprint});
      const row=await db.configValue.findUniqueOrThrow({where:{guildId_key:{guildId:'g',key:'safe'}}});
      assert.equal(row.version,3);assert.equal(row.value,false);assert.equal(row.source,'dashboard.rollback');
      assert.equal(await db.auditEvent.count({where:{guildId:'g',action:'dashboard.draft.takeover'}}),1);
    });
    await t.test('explicit null configuration is JSON null and does not silently restore the default',async()=>{
      let draft=await service().view('g',actor);
      draft=await execute({action:'acquire',expectedVersion:draft.version});
      draft=await execute({action:'stage',expectedVersion:draft.version,key:'nullable.channel',value:null,baseVersion:0});
      draft=await execute({action:'preview',expectedVersion:draft.version});
      assert.equal(draft.preview.valid,true);
      await execute({action:'publish',expectedVersion:draft.version,fingerprint:draft.preview.fingerprint});
      const config=new ConfigService(definitions,new PrismaConfigRepository(db),new AuditService(new PrismaAuditSink(db)));
      assert.equal(await config.get('g','nullable.channel'),null);
    });
  }finally{
    assert.match(schema,/^aj_dashboard_test_[0-9a-f]{32}$/);
    try{if(connected)await db.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);}finally{await db.$disconnect();}
  }
});
