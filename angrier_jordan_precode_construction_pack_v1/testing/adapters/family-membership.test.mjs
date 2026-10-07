import test from 'node:test';
import assert from 'node:assert/strict';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {DiscordAPIError} from 'discord.js';
const file=process.env.FAMILY_MEMBERSHIP_SOURCE==='true'?'apps/bot/src/discord/family-membership.ts':'dist/apps/bot/src/discord/family-membership.js';
const {reconcileFamilyMembership,applyFamilyGatewayReturn,discordFamilyMembershipCensus,FamilyMembershipRecovery}=await import(pathToFileURL(resolve(file)));
const now=new Date('2026-09-25T12:00:00Z'),joined=new Date('2026-09-20T12:00:00Z');
function fixture(ids=['a']){
  const rows=ids.map(userId=>({userId,presence:{userId,joinedAt:joined,leftAt:null}})),estates=[],calls=[],receipts=new Map(),members=new Map([['bot',{bot:true}]]);
  let writes=0,failDepart=false;
  const store={tracked:async()=>structuredClone(rows),estates:async()=>structuredClone(estates),markAbsent:async(_g,u,at)=>{writes++;const row=rows.find(row=>row.userId===u);row.presence??={userId:u,joinedAt:null,leftAt:null};row.presence.leftAt??=at;return structuredClone(row.presence);},markPresent:async(_g,u,_prior,at)=>{writes++;rows.find(row=>row.userId===u).presence={userId:u,joinedAt:at,leftAt:null};}};
  const repository={depart:async(c)=>{calls.push(['depart',c]);if(failDepart)throw Error('process stopped after snapshot');if(receipts.has(c.requestKey))return receipts.get(c.requestKey);const row={id:'estate'+estates.length,ownerUserId:c.userId,state:'OPEN',createdAt:now};estates.push(row);const result={sessionId:row.id};receipts.set(c.requestKey,result);return result;},rejoin:async(c,joinedAt,currentPresence=false)=>{calls.push(['rejoin',c,joinedAt,currentPresence]);if(joinedAt)await store.markPresent(c.guildId,c.userId,null,joinedAt);for(const row of estates.filter(row=>row.ownerUserId===c.userId&&row.state==='OPEN'&&(!joinedAt||currentPresence||row.createdAt<=joinedAt)))row.state='CANCELLED';return{canceled:1,staleReturn:false};}};
  const census={guildId:'g',fetch:async()=>({available:true,expectedCount:members.size,members}),lookup:async u=>({present:members.has(u),bot:members.get(u)?.bot??false,joinedAt:members.has(u)?joined:null})};
  return{rows,estates,calls,receipts,members,store,repository,census,input:{guildId:'g',channelId:'channel',store,repository,census,now:()=>now},writes:()=>writes,failDepart:value=>{failDepart=value;}};
}
test('failed, unavailable, incomplete or empty census makes no mutations',async()=>{
  for(const fetch of [async()=>{throw Error('Discord outage');},async()=>({available:false,expectedCount:1,members:new Map()}),async()=>({available:true,expectedCount:2,members:new Map([['bot',{bot:true}]])}),async()=>({available:true,expectedCount:0,members:new Map()})]){const f=fixture();f.census.fetch=fetch;await assert.rejects(reconcileFamilyMembership(f.input));assert.equal(f.writes(),0);assert.equal(f.calls.length,0);}
});
test('all fresh checks finish before any writes when an individual lookup fails',async()=>{const f=fixture(['a','b']);f.census.lookup=async u=>{if(u==='b')throw Error('network timeout');return{present:false,bot:false,joinedAt:null};};await assert.rejects(reconcileFamilyMembership(f.input),/timeout/);assert.equal(f.writes(),0);assert.equal(f.calls.length,0);});
test('confirmed absence records detection time and stable actor-specific receipts; duplicate census retains one estate',async()=>{const f=fixture(['a','b']);await reconcileFamilyMembership(f.input);await reconcileFamilyMembership(f.input);assert.equal(f.estates.length,2);assert.equal(f.calls.length,2);assert.equal(f.rows[0].presence.leftAt.toISOString(),now.toISOString());assert.notEqual(f.calls[0][1].requestKey,f.calls[1][1].requestKey);assert.match(f.calls[0][1].requestKey,/membership-absence:a:2026-09-25/);});
test('restart after snapshot but before depart retries the same receipt timestamp',async()=>{const f=fixture();f.failDepart(true);await assert.rejects(reconcileFamilyMembership(f.input));f.failDepart(false);await reconcileFamilyMembership({...f.input,now:()=>new Date('2026-09-26T12:00:00Z')});assert.equal(f.calls[0][1].requestKey,f.calls[1][1].requestKey);assert.equal(f.estates.length,1);});
test('a closed estate remains closed across later censuses of the same absence',async()=>{const f=fixture();f.estates.push({id:'old',ownerUserId:'a',state:'CLOSED',createdAt:new Date('2026-09-24T12:00:00Z')});await reconcileFamilyMembership(f.input);await reconcileFamilyMembership(f.input);assert.equal(f.calls.length,0);assert.equal(f.estates.length,1);});
test('an authoritative return cancels the pending estate and clears only membership snapshot fields',async()=>{const f=fixture();f.members.set('a',{bot:false});f.rows[0].presence.leftAt=new Date('2026-09-24T00:00:00Z');f.estates.push({id:'pending',ownerUserId:'a',state:'OPEN',createdAt:new Date('2026-09-24T00:00:00Z')});f.census.lookup=async()=>({present:true,bot:false,joinedAt:now});await reconcileFamilyMembership(f.input);await reconcileFamilyMembership(f.input);assert.equal(f.calls.length,1);assert.equal(f.calls[0][0],'rejoin');assert.equal(f.estates[0].state,'CANCELLED');assert.equal(f.rows[0].presence.leftAt,null);assert.deepEqual(f.rows[0].presence.joinedAt,now);});
test('a new authoritative membership permits a new estate after its own departure',async()=>{const f=fixture();f.rows[0].presence.joinedAt=now;f.estates.push({id:'old',ownerUserId:'a',state:'CLOSED',createdAt:joined});await reconcileFamilyMembership(f.input);assert.equal(f.estates.length,2);});
test('a missed return after completed inheritance records fresh membership before the next departure',async()=>{const f=fixture();f.members.set('a',{bot:false,joinedAt:now});f.estates.push({id:'old',ownerUserId:'a',state:'CLOSED',createdAt:new Date('2026-09-24T00:00:00Z')});f.census.lookup=async()=>({present:true,bot:false,joinedAt:now});await reconcileFamilyMembership(f.input);assert.deepEqual(f.rows[0].presence.joinedAt,now);f.members.delete('a');f.census.lookup=async()=>({present:false,bot:false,joinedAt:null});await reconcileFamilyMembership(f.input);assert.equal(f.estates.length,2);});
test('unchanged census join timestamps avoid unnecessary per-member REST calls',async()=>{const f=fixture();f.members.set('a',{bot:false,joinedAt:joined});f.census.lookup=async()=>{throw Error('Unnecessary REST call');};await reconcileFamilyMembership(f.input);assert.equal(f.writes(),0);});
test('missing authoritative join timestamps reject the entire plan before writes',async()=>{const f=fixture(['a','b']);f.members.set('b',{bot:false});f.census.lookup=async u=>({present:u==='b',bot:false,joinedAt:null});await assert.rejects(reconcileFamilyMembership(f.input),/join timestamp/);assert.equal(f.writes(),0);});
test('wrong guild and bots cannot create estates',async()=>{const f=fixture();await assert.rejects(reconcileFamilyMembership({...f.input,guildId:'other'}),/mismatch/);f.census.lookup=async()=>({present:false,bot:true,joinedAt:null});await reconcileFamilyMembership(f.input);assert.equal(f.writes(),0);assert.equal(f.calls.length,0);});
test('Discord adapter treats only Unknown Member as absence and verifies user is human',async()=>{const unknown=Object.assign(Object.create(DiscordAPIError.prototype),{code:10007}),guild={id:'g',available:true,memberCount:1,members:{fetch:async()=>{throw unknown;}},client:{users:{fetch:async()=>({bot:false})}}};assert.deepEqual(await discordFamilyMembershipCensus(guild).lookup('a'),{present:false,bot:false,joinedAt:null});guild.members.fetch=async()=>{throw Error('Discord outage');};await assert.rejects(discordFamilyMembershipCensus(guild).lookup('a'),/outage/);guild.members.fetch=async()=>{throw unknown;};guild.client.users.fetch=async()=>{throw Error('user lookup outage');};await assert.rejects(discordFamilyMembershipCensus(guild).lookup('a'),/user lookup/);});

test('Discord adapter accepts two stable complete REST listings when gateway memberCount is stale',async()=>{const joinedAt=new Date('2026-09-25T12:00:00Z'),members=new Map([['a',{user:{bot:false},joinedAt}],['bot',{user:{bot:true},joinedAt}]]),guild={id:'g',available:true,memberCount:99,members:{fetch:async()=>members},client:{users:{fetch:async()=>({bot:false})}}};const snapshot=await discordFamilyMembershipCensus(guild).fetch();assert.equal(snapshot.expectedCount,2);assert.equal(snapshot.members.size,2);assert.equal(snapshot.members.get('a')?.joinedAt,joinedAt);});
test('Discord adapter rejects an unstable REST census without returning a usable snapshot',async()=>{let call=0;const a=new Map([['a',{user:{bot:false},joinedAt:now}]]),b=new Map([['a',{user:{bot:false},joinedAt:now}],['b',{user:{bot:false},joinedAt:now}]]),guild={id:'g',available:true,memberCount:2,members:{fetch:async()=>++call%2?a:b},client:{users:{fetch:async()=>({bot:false})}}};await assert.rejects(discordFamilyMembershipCensus(guild).fetch(),/changed during REST reconciliation/);assert.equal(call,6);});

test('return between the planning lookup and mutation lookup never starts an estate',async()=>{
  const f=fixture();let lookups=0;
  f.census.lookup=async()=>++lookups===1?{present:false,bot:false,joinedAt:null}:{present:true,bot:false,joinedAt:now};
  await reconcileFamilyMembership(f.input);
  assert.equal(f.estates.length,0);assert.equal(f.rows[0].presence.leftAt,null);assert.deepEqual(f.rows[0].presence.joinedAt,now);
});

test('live return during reconciliation invalidates the plan and runs before dependent estate jobs',async()=>{
  const f=fixture(),gate=new FamilyMembershipRecovery();let lookupStarted,releaseLookup;
  const started=new Promise(resolve=>{lookupStarted=resolve;}),blocked=new Promise(resolve=>{releaseLookup=resolve;});
  let first=true;
  f.census.lookup=async()=>{if(first){first=false;lookupStarted();await blocked;return{present:false,bot:false,joinedAt:null};}return{present:true,bot:false,joinedAt:now};};
  const startup=gate.initialize(assertCurrent=>reconcileFamilyMembership({...f.input,assertCurrent}));
  await started;
  f.members.set('a',{bot:false,joinedAt:now});const observation=gate.observe();
  const order=[];
  const live=gate.live(async()=>{order.push('return');await f.repository.rejoin({userId:'a',requestKey:'live-return'});},observation);
  const scheduled=gate.scheduled(async()=>{order.push('estate-job');assert.equal(f.rows[0].presence.leftAt,null);assert.equal(f.estates.length,0);});
  releaseLookup();await Promise.all([startup,live,scheduled]);
  assert.equal(gate.ready,true);assert.deepEqual(order,['return','estate-job']);
});

test('failed or incomplete startup keeps scheduled financial work unavailable',async()=>{
  const f=fixture(),gate=new FamilyMembershipRecovery();f.census.fetch=async()=>({available:true,expectedCount:2,members:new Map([['bot',{bot:true}]])});
  await assert.rejects(gate.initialize(assertCurrent=>reconcileFamilyMembership({...f.input,assertCurrent})),/incomplete/);
  let executions=0;await assert.rejects(gate.scheduled(async()=>{executions++;}),/not ready/);
  assert.equal(executions,0);assert.equal(gate.ready,false);assert.equal(f.writes(),0);
});

test('simultaneous live leave after census is serialized before scheduled work and duplicate recovery adds no estate',async()=>{
  const f=fixture(),gate=new FamilyMembershipRecovery();f.members.set('a',{bot:false,joinedAt:joined});
  await gate.initialize(assertCurrent=>reconcileFamilyMembership({...f.input,assertCurrent}));
  f.members.delete('a');const observation=gate.observe();
  const live=gate.live(()=>reconcileFamilyMembership(f.input),observation);
  const scheduled=gate.scheduled(async()=>{assert.equal(f.estates.length,1);assert.ok(f.rows[0].presence.leftAt);});
  await Promise.all([live,scheduled]);
  await gate.live(()=>reconcileFamilyMembership(f.input));assert.equal(f.estates.length,1);
});

test('restart during a deferred estate retains the same pending session; return cancels it before execution',async()=>{
  const f=fixture();f.rows[0].presence.leftAt=joined;f.estates.push({id:'deferred-estate',ownerUserId:'a',state:'OPEN',createdAt:joined});
  const gate=new FamilyMembershipRecovery();await gate.initialize(assertCurrent=>reconcileFamilyMembership({...f.input,assertCurrent}));
  await gate.scheduled(async()=>{assert.equal(f.estates.length,1);assert.equal(f.estates[0].id,'deferred-estate');});
  f.members.set('a',{bot:false,joinedAt:now});f.census.lookup=async()=>({present:true,bot:false,joinedAt:now});
  const restarted=new FamilyMembershipRecovery();await restarted.initialize(assertCurrent=>reconcileFamilyMembership({...f.input,assertCurrent}));
  await restarted.scheduled(async()=>assert.equal(f.estates[0].state,'CANCELLED'));
  assert.equal(f.estates.length,1);
});

test('continuous membership churn fails closed rather than accepting a stale census',async()=>{
  const gate=new FamilyMembershipRecovery();let attempts=0;
  await assert.rejects(gate.initialize(async assertCurrent=>{attempts++;gate.observe();assertCurrent();}),/changed during reconciliation/);
  assert.equal(attempts,3);assert.equal(gate.ready,false);
});

test('failed live membership processing requires a fresh census before further estate work',async()=>{
  const gate=new FamilyMembershipRecovery();await gate.initialize(async()=>{});
  const observation=gate.observe();await assert.rejects(gate.live(async()=>{throw Error('presence write unavailable');},observation),/unavailable/);
  assert.equal(gate.ready,false);await assert.rejects(gate.scheduled(async()=>{}),/not ready/);
  await gate.initialize(async()=>{});let processed=false;await gate.scheduled(async()=>{processed=true;});assert.equal(processed,true);
});

test('gateway observations change the transaction fence immediately while live writes remain queued',async()=>{
  const gate=new FamilyMembershipRecovery();await gate.initialize(async()=>{});
  let started,release;const entered=new Promise(resolve=>{started=resolve;}),blocked=new Promise(resolve=>{release=resolve;});
  let persisted=false,liveApplied=false;
  const transaction=gate.scheduled(async()=>{const revision=gate.generation;started();await blocked;if(gate.generation!==revision)throw Error('rollback before commit');persisted=true;});
  await entered;const observation=gate.observe();const live=gate.live(async()=>{liveApplied=true;},observation);
  assert.equal(liveApplied,false);release();await assert.rejects(transaction,/rollback/);await live;
  assert.equal(persisted,false);assert.equal(liveApplied,true);
});

test('feature suspension requires reconciliation before deferred jobs can resume',async()=>{
  const f=fixture(),gate=new FamilyMembershipRecovery();f.members.set('a',{bot:false,joinedAt:joined});
  await gate.initialize(assertCurrent=>reconcileFamilyMembership({...f.input,assertCurrent}));
  gate.suspend();f.members.delete('a');await assert.rejects(gate.scheduled(async()=>{}),/not ready/);
  await gate.initialize(assertCurrent=>reconcileFamilyMembership({...f.input,assertCurrent}));
  await gate.scheduled(async()=>assert.equal(f.estates.length,1));
});

test('feature disable while a financial job waits in the membership queue prevents its execution',async()=>{
  const gate=new FamilyMembershipRecovery();await gate.initialize(async()=>{});
  let release,started;const entered=new Promise(resolve=>{started=resolve;}),blocked=new Promise(resolve=>{release=resolve;});
  const live=gate.live(async()=>{started();await blocked;});await entered;
  let enabled=true,executions=0;
  const job=gate.scheduled(async()=>{executions++;},async()=>enabled);
  enabled=false;release();await live;await assert.rejects(job,/runtime disabled/);
  assert.equal(executions,0);assert.equal(gate.ready,false);
  enabled=true;await assert.rejects(gate.scheduled(async()=>{executions++;},async()=>enabled),/not ready/);
  await gate.initialize(async()=>{});await gate.scheduled(async()=>{executions++;},async()=>enabled);assert.equal(executions,1);
});

test('already queued estate cannot overtake observed rapid return and departure or keep the old grace period',async()=>{
  const f=fixture(),gate=new FamilyMembershipRecovery(),returnedAt=new Date('2026-09-25T11:00:00Z');
  f.rows[0].presence.leftAt=joined;f.estates.push({id:'old-due-estate',ownerUserId:'a',state:'OPEN',createdAt:joined});
  await gate.initialize(assertCurrent=>reconcileFamilyMembership({...f.input,assertCurrent}));
  let release,started;const entered=new Promise(resolve=>{started=resolve;}),blocked=new Promise(resolve=>{release=resolve;});
  const busy=gate.live(async()=>{started();await blocked;});await entered;
  let executions=0;const oldJob=gate.scheduled(async()=>{executions++;});
  const returnObservation=gate.observe();assert.equal(gate.ready,false);
  const returnWork=gate.live(async()=>{
    // Current Discord membership is already absent. The authoritative gateway join still counts.
    assert.equal(f.members.has('a'),false);
    await applyFamilyGatewayReturn({...f.input,userId:'a',joinedAt:returnedAt,prior:structuredClone(f.rows[0].presence),estates:structuredClone(f.estates)});
  },returnObservation);
  const departureObservation=gate.observe();
  const departureWork=gate.live(()=>reconcileFamilyMembership(f.input),departureObservation);
  release();await busy;await assert.rejects(oldJob,/not ready/);await Promise.all([returnWork,departureWork]);
  assert.equal(executions,0);assert.equal(f.estates[0].state,'CANCELLED');assert.equal(f.estates.length,2);
  assert.equal(f.estates[1].state,'OPEN');assert.deepEqual(f.rows[0].presence.joinedAt,returnedAt);assert.deepEqual(f.rows[0].presence.leftAt,now);
  const departure=f.calls.filter(([kind])=>kind==='depart').at(-1);assert.match(departure[1].requestKey,/2026-09-25T12:00:00/);
  await gate.scheduled(async()=>{assert.equal(f.estates[1].createdAt.getTime(),now.getTime());});
});

test('replayed older join cannot erase a later departure or cancel its new estate',async()=>{
  const f=fixture(),returnedAt=new Date('2026-09-25T11:00:00Z');
  f.rows[0].presence={userId:'a',joinedAt:returnedAt,leftAt:now};
  f.estates.push({id:'new-estate',ownerUserId:'a',state:'OPEN',createdAt:now});
  const result=await applyFamilyGatewayReturn({...f.input,userId:'a',joinedAt:returnedAt,prior:structuredClone(f.rows[0].presence),estates:structuredClone(f.estates)});
  assert.equal(result,false);assert.equal(f.writes(),0);assert.equal(f.calls.length,0);assert.equal(f.estates[0].state,'OPEN');
});

test('completed census cannot reopen readiness while an observed live transition is still queued',async()=>{
  const gate=new FamilyMembershipRecovery();let release,started;
  const entered=new Promise(resolve=>{started=resolve;}),blocked=new Promise(resolve=>{release=resolve;});
  let first=true;
  const initialization=gate.initialize(async assertCurrent=>{if(first){first=false;started();await blocked;}assertCurrent();});
  await entered;
  let executions=0;const priorJob=gate.scheduled(async()=>{executions++;});
  const observation=gate.observe();const live=gate.live(async()=>{},observation);
  release();await initialization;await assert.rejects(priorJob,/not ready/);await live;
  assert.equal(executions,0);assert.equal(gate.ready,true);
});

test('event observed after job admission but before transaction capture also blocks settlement',async()=>{
  const gate=new FamilyMembershipRecovery();await gate.initialize(async()=>{});
  let release,started;const entered=new Promise(resolve=>{started=resolve;}),blocked=new Promise(resolve=>{release=resolve;});
  let effects=0;
  const job=gate.scheduled(async()=>{started();await blocked;gate.transactionGeneration();effects++;});
  await entered;const observation=gate.observe();const live=gate.live(async()=>{},observation);
  release();await assert.rejects(job,/not ready/);await live;assert.equal(effects,0);
  assert.equal(gate.transactionGeneration(),observation);
});

test('gateway return delegates presence and cancellation together; failed transaction leaves no separate presence write',async()=>{
  const f=fixture(),returnedAt=new Date('2026-09-25T11:00:00Z');f.rows[0].presence.leftAt=joined;
  f.estates.push({id:'old',ownerUserId:'a',state:'OPEN',createdAt:joined});
  f.repository.rejoin=async(_context,timestamp)=>{assert.deepEqual(timestamp,returnedAt);throw Error('atomic return unavailable');};
  await assert.rejects(applyFamilyGatewayReturn({...f.input,userId:'a',joinedAt:returnedAt,prior:structuredClone(f.rows[0].presence),estates:structuredClone(f.estates)}),/unavailable/);
  assert.equal(f.writes(),0);assert.equal(f.estates[0].state,'OPEN');assert.deepEqual(f.rows[0].presence.joinedAt,joined);
});

test('restart after atomic return before later leave processing creates a fresh estate from persisted join evidence',async()=>{
  const f=fixture(),returnedAt=new Date('2026-09-25T11:00:00Z');f.rows[0].presence.leftAt=joined;
  f.estates.push({id:'old',ownerUserId:'a',state:'OPEN',createdAt:joined});
  await applyFamilyGatewayReturn({...f.input,userId:'a',joinedAt:returnedAt,prior:structuredClone(f.rows[0].presence),estates:structuredClone(f.estates)});
  assert.equal(f.estates[0].state,'CANCELLED');assert.deepEqual(f.rows[0].presence.joinedAt,returnedAt);
  await reconcileFamilyMembership(f.input);
  assert.equal(f.estates.length,2);assert.equal(f.estates[1].state,'OPEN');assert.deepEqual(f.rows[0].presence.leftAt,now);
});

test('fresh present census repairs a stale same-epoch leave via atomic current-presence mode',async()=>{
  const f=fixture();f.rows[0].presence.leftAt=now;f.members.set('a',{bot:false,joinedAt:joined});
  await reconcileFamilyMembership(f.input);
  assert.equal(f.rows[0].presence.leftAt,null);assert.equal(f.calls[0][3],true);assert.deepEqual(f.calls[0][2],joined);
});
