import test from 'node:test';
import assert from 'node:assert/strict';
import {validateRuntimeEnvironment} from '../../.test-build/packages/core/src/runtime-environment.js';
import {RuntimeLifecycle} from '../../.test-build/packages/core/src/runtime-lifecycle.js';
import {SchedulerWorker} from '../../.test-build/packages/core/src/scheduler-worker.js';
import {PermissionEngine} from '../../.test-build/packages/core/src/permissions.js';

const base={NODE_ENV:'production',DATABASE_URL:'postgresql://fixture:secret@chairs-db.railway.internal:5432/chairs',AJ_DATABASE_PURPOSE:'production',DISCORD_TOKEN:'fake-only',DISCORD_APPLICATION_ID:'123456789012345678',DISCORD_GUILD_ID:'223456789012345678'};
test('production refuses test/public/unresolved database configurations without disclosing values',()=>{
  assert.equal(validateRuntimeEnvironment(base,'worker').port,8080);
  for(const change of [{TEST_DATABASE_URL:'postgresql://x:private-secret@proxy.rlwy.net:1234/test'},{AJ_DATABASE_PURPOSE:'test'},{RAILWAY_PROJECT_NAME:'upbeat-kindness'},{DATABASE_URL:'postgresql://x:private-secret@proxy.rlwy.net:1234/test'},{DATABASE_URL:'${RAILWAY_TEMPLATE}'},{PORT:'abc'},{ENABLE_EVENTS_SMOKE:'yes'}]){
    assert.throws(()=>validateRuntimeEnvironment({...base,...change},'worker'),error=>{assert.doesNotMatch(error.message,/private-secret|proxy\.rlwy|fake-only|RAILWAY_TEMPLATE/);return true;});
  }
});
test('dashboard requires strong secret and matching public HTTPS OAuth callback',()=>{
  const env={...base,DISCORD_OAUTH_CLIENT_ID:'123456789012345678',DISCORD_OAUTH_CLIENT_SECRET:'fake-client-secret',DASHBOARD_SESSION_SECRET:'x'.repeat(32),PUBLIC_DASHBOARD_URL:'https://chairs.example',DISCORD_OAUTH_CALLBACK_URL:'https://chairs.example/api/auth/discord/callback'};
  assert.equal(validateRuntimeEnvironment(env,'dashboard').dashboardBaseUrl,'https://chairs.example');
  for(const change of [{PUBLIC_DASHBOARD_URL:'http://chairs.example'},{DASHBOARD_SESSION_SECRET:'short'},{DISCORD_OAUTH_CALLBACK_URL:'https://other.example/api/auth/discord/callback'},{DISCORD_OAUTH_CALLBACK_URL:'https://chairs.example/api/auth/discord/callback?evil=1'}])assert.throws(()=>validateRuntimeEnvironment({...env,...change},'dashboard'));
});
test('production migration requires explicit approved release',()=>{
  assert.throws(()=>validateRuntimeEnvironment(base,'migrate'));
  assert.equal(validateRuntimeEnvironment({...base,AJ_PRODUCTION_MIGRATIONS_APPROVED:'true',AJ_MIGRATION_RELEASE:'a'.repeat(40)},'migrate').production,true);
});

test('family requires a stable secret only when enabled and never includes its value in validation errors',()=>{
  assert.equal(validateRuntimeEnvironment({...base,ENABLE_FAMILY_SMOKE:'false'},'worker').port,8080);
  for(const secret of [undefined,'short-private-value','${UNRESOLVED_PRIVATE_FAMILY_SECRET}'])assert.throws(()=>validateRuntimeEnvironment({...base,ENABLE_FAMILY_SMOKE:'true',FAMILY_COMPATIBILITY_SECRET:secret},'worker'),error=>{assert.match(error.message,/FAMILY_COMPATIBILITY_SECRET/);assert.doesNotMatch(error.message,/short-private-value|UNRESOLVED_PRIVATE/);return true;});
  assert.equal(validateRuntimeEnvironment({...base,ENABLE_FAMILY_SMOKE:'true',FAMILY_COMPATIBILITY_SECRET:'test-only-stable-family-secret-not-production'},'worker').port,8080);
  assert.throws(()=>validateRuntimeEnvironment({...base,NODE_ENV:'development',ENABLE_FAMILY_SMOKE:'true'},'worker'),/FAMILY_COMPATIBILITY_SECRET/);
});
test('shutdown rejects new work and drains work already admitted',async()=>{
  const life=new RuntimeLifecycle();let release;let completed=false;let rejectedWork=false;
  life.run(async()=>{await new Promise(r=>{release=r});completed=true;});await Promise.resolve();
  const drain=life.drain(500);life.run(()=>{rejectedWork=true;});assert.equal(completed,false);release();
  assert.equal(await drain,true);assert.equal(completed,true);assert.equal(rejectedWork,false);assert.equal(life.pendingCount,0);
});
test('shutdown timeout reports incomplete drain without pretending work completed',async()=>{
  const life=new RuntimeLifecycle();let release;life.run(()=>new Promise(r=>{release=r}));await Promise.resolve();assert.equal(await life.drain(10),false);release();
});
test('scheduler drain waits for current durable tick and suppresses overlapping ticks',async()=>{
  let release,calls=0;const worker=new SchedulerWorker({tick:async()=>{calls++;await new Promise(r=>{release=r;});}});
  const tick=worker.runOnce();await worker.runOnce();let drained=false;const stop=worker.stopAndDrain().then(()=>{drained=true;});await Promise.resolve();assert.equal(calls,1);assert.equal(drained,false);release();await Promise.all([tick,stop]);assert.equal(drained,true);
});
test('dashboard access depends on current Discord authority, never Chairs staff rank',()=>{
  const p=new PermissionEngine({'dashboard.access':['guild_owner','discord_administrator'],'owner.takeover':['guild_owner']});
  assert.equal(p.can('throne','dashboard.access'),false);assert.equal(p.canDashboard({isGuildOwner:false,administrator:false},'dashboard.access'),false);
  assert.equal(p.canDashboard({isGuildOwner:true,administrator:false},'dashboard.access'),true);assert.equal(p.canDashboard({isGuildOwner:false,administrator:true},'dashboard.access'),true);
  assert.equal(p.canDashboard({isGuildOwner:false,administrator:true},'owner.takeover'),false);assert.equal(p.canDashboard({isGuildOwner:true,administrator:true},'unknown'),false);
});
