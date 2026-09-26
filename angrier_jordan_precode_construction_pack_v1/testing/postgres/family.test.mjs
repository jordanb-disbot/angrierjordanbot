import {readFileSync} from 'node:fs';import {parseEnv} from 'node:util';import {spawnSync} from 'node:child_process';import {createRequire} from 'node:module';import {randomUUID} from 'node:crypto';import {resolve} from 'node:path';import {pathToFileURL} from 'node:url';import test from 'node:test';import assert from 'node:assert/strict';import {PrismaClient} from '@prisma/client';
const base=process.env.FAMILY_TEST_BUILD??'.test-build',{PrismaFamilyRepository}=await import(pathToFileURL(resolve(base,'packages/features-family/src/prisma-repository.js'))),{DAY,FAMILY_ITEMS,FAMILY_PERKS,DEFAULT_FAMILY_POLICY}=await import(pathToFileURL(resolve(base,'packages/features-family/src/domain.js'))),{PrismaWalletHolds}=await import(pathToFileURL(resolve(base,'packages/database/src/wallet-holds.js')));
const require=createRequire(import.meta.url),schema='aj_family_test_'+randomUUID().replaceAll('-',''),secret=parseEnv(readFileSync(resolve('.env.test.local'),'utf8')).TEST_DATABASE_URL;if(!secret)throw Error('Dedicated TEST_DATABASE_URL required.');const url=new URL(secret);url.searchParams.set('schema',schema);const db=new PrismaClient({datasourceUrl:url.toString()});
test('Phase19 persisted family relationships, sealed auctions and exactly-once estates',async t=>{
 let connected=false,caseNumber=0,guildId,now,eligible,blocked,repo,marriage,secondMarriage,adoption;
 const policy={...DEFAULT_FAMILY_POLICY,cooldownBaseSeconds:0,cooldownMaxSeconds:0};
 const familySecret='test-only-stable-family-secret-not-production';
 const users=['host','spouse','second','third','child','child2','parent2','parent2spouse','candidate1','candidate2','auctioned','bidderA','bidderB','reserveSeller','estateOwner','jailedHeir','returner','lonely','heldOwner','fallbackOwner','fallbackSpouse','fallbackChild','badWill','v1','v2','v3','v4','v5'];
 const makeRepo=(rng=()=>0,membership=async(_g,u)=>eligible.has(u))=>new PrismaFamilyRepository(db,familySecret,membership,policy,()=>now,rng,async(_g,u)=>eligible.has(u)&&!blocked.has(u));
 const c=(requestKey,userId='host',channelId='bots')=>({guildId,channelId,userId,requestKey});
 const m=userId=>({userId,name:userId,avatar:''}),tick=ms=>{now=new Date(+now+ms)};
 const account=userId=>db.economyAccount.findUniqueOrThrow({where:{guildId_userId:{guildId,userId}}});
 const qty=(userId,itemId)=>db.inventoryEntry.findUniqueOrThrow({where:{guildId_userId_itemId:{guildId,userId,itemId}}});
 const marry=async(a,b)=>{const id=(await repo.propose(c('fixture-marriage:'+a+':'+b+':'+now.toISOString(),a),m(b),m(a))).sessionId;await repo.decideProposal(c('fixture-accept:'+id,b),id,true);return id;};
 // Every major acceptance case owns its server, clock, eligibility and balances.
 // A failure cannot strand an ineligible bidder or an unfinished prerequisite in the next case.
 const runCase=(name,body)=>t.test(name,async()=>{
  guildId='family-case-'+(++caseNumber);now=new Date('2026-01-01T12:00:00Z');eligible=new Set(users);blocked=new Set(['jailedHeir']);repo=makeRepo();marriage=secondMarriage=adoption=undefined;
  await db.guild.create({data:{id:guildId,name:'Test Chairs'}});
  await db.member.createMany({data:users.map(userId=>({guildId,userId}))});
  await db.economyAccount.createMany({data:users.map(userId=>({guildId,userId,wallet:1000n,bank:500n}))});
  await db.inventoryEntry.createMany({data:users.filter(u=>!['lonely','heldOwner','returner'].includes(u)).flatMap(userId=>Object.values(FAMILY_ITEMS).map(itemId=>({guildId,userId,itemId,quantity:10})))});
  await body();
 });
 try{
  await db.$connect();connected=true;
  const migrated=spawnSync(process.execPath,[require.resolve('prisma/build/index.js'),'migrate','deploy','--schema','packages/database/prisma/schema.prisma'],{env:{...process.env,DATABASE_URL:url.toString()},encoding:'utf8'});
  assert.equal(migrated.status,0,'Disposable-schema migration must succeed.');
  await db.catalogItem.createMany({data:[...Object.values(FAMILY_ITEMS).map(id=>({id,type:'family',name:id,rarity:'premium',enabled:true,giftable:true,metadata:{inheritable:true}})),{id:'test.wood',type:'material',name:'Wood',rarity:'common',enabled:true,giftable:true},{id:'test.rod',type:'tool',name:'Rod',rarity:'rare',enabled:true,giftable:true}]});

 await runCase('proposal reserves exact items, only target can decide, rejection refunds once',async()=>{const p=await repo.propose(c('reject-proposal'),m('spouse'),m('host'));assert.equal((await qty('host',FAMILY_ITEMS.ring)).quantity,9);assert.deepEqual((await repo.publicView(p.sessionId)).data.itemEscrow,[{itemId:FAMILY_ITEMS.ring,quantity:1,state:'RESERVED'}]);await assert.rejects(()=>repo.decideProposal(c('wrong-actor','v1'),p.sessionId,true),{code:'FAMILY_TARGET'});await assert.rejects(()=>repo.decideProposal(c('wrong-channel','spouse','other'),p.sessionId,true),{code:'FAMILY_SESSION'});await Promise.all([repo.decideProposal(c('reject','spouse'),p.sessionId,false),repo.decideProposal(c('reject','spouse'),p.sessionId,false)]);assert.equal((await qty('host',FAMILY_ITEMS.ring)).quantity,10);assert.equal((await repo.get(p.sessionId)).state,'CANCELLED');assert.deepEqual((await repo.publicView(p.sessionId)).data.itemEscrow,[{itemId:FAMILY_ITEMS.ring,quantity:1,state:'REFUNDED'}]);});

 await runCase('member-facing proposal and typed item escrow remain one snapshot during concurrent acceptance',async()=>{
  const id=(await repo.propose(c('snapshot-proposal'),m('spouse'),m('host'))).sessionId;
  let reached,release;const readStarted=new Promise(resolve=>{reached=resolve;}),continueRead=new Promise(resolve=>{release=resolve;});
  const snapshotDb=new Proxy(db,{get(target,key){
   if(key==='$transaction')return(operation,options)=>target.$transaction(tx=>operation(new Proxy(tx,{get(transaction,property){
    if(property==='gameSession')return new Proxy(transaction.gameSession,{get(delegate,method){
     if(method==='findUnique')return async args=>{const row=await delegate.findUnique(args);reached();await continueRead;return row;};
     const value=Reflect.get(delegate,method);return typeof value==='function'?value.bind(delegate):value;
    }});
    const value=Reflect.get(transaction,property);return typeof value==='function'?value.bind(transaction):value;
   }})),options);
   const value=Reflect.get(target,key);return typeof value==='function'?value.bind(target):value;
  }});
  const snapshotRepo=new PrismaFamilyRepository(snapshotDb,familySecret,async(_g,u)=>eligible.has(u),policy,()=>now,()=>0);
  const reading=snapshotRepo.publicView(id);reading.catch(()=>undefined);
  await Promise.race([readStarted,reading.then(()=>{throw Error('Snapshot never reached its read barrier');})]);
  try{await repo.decideProposal(c('snapshot-accept','spouse'),id,true);}finally{release();}
  const before=await reading,after=await repo.publicView(id);
  assert.equal(before.state,'DRAFT');assert.deepEqual(before.data.itemEscrow,[{itemId:FAMILY_ITEMS.ring,quantity:1,state:'RESERVED'}]);
  assert.equal(after.state,'OPEN');assert.deepEqual(after.data.itemEscrow,[{itemId:FAMILY_ITEMS.ring,quantity:1,state:'SETTLED'}]);
  assert.equal((await qty('host',FAMILY_ITEMS.ring)).quantity,9);
 });
 await runCase('pending proposal expires after exactly24h and survives restart',async()=>{const p=await repo.propose(c('expire-proposal'),m('spouse'),m('host'));await assert.rejects(()=>repo.expireProposal(guildId,p.sessionId),{code:'NOT_DUE'});tick(DAY);await makeRepo().expireProposal(guildId,p.sessionId);await makeRepo().expireProposal(guildId,p.sessionId);assert.equal((await qty('host',FAMILY_ITEMS.ring)).quantity,10);});
 await runCase('concurrent proposals and duplicate acceptance create one active pair and one consumed ring',async()=>{const results=await Promise.allSettled([repo.propose(c('proposal1'),m('spouse'),m('host')),repo.propose(c('proposal2'),m('spouse'),m('host'))]);assert.equal(results.filter(r=>r.status==='fulfilled').length,1);marriage=results.find(r=>r.status==='fulfilled').value.sessionId;await Promise.all([repo.decideProposal(c('accept','spouse'),marriage,true),repo.decideProposal(c('accept','spouse'),marriage,true)]);assert.equal(await db.marriage.count({where:{guildId,status:'ACTIVE'}}),1);assert.equal((await qty('host',FAMILY_ITEMS.ring)).quantity,9);assert.deepEqual((await repo.publicView(marriage)).data.itemEscrow,[{itemId:FAMILY_ITEMS.ring,quantity:1,state:'SETTLED'}]);const s=await repo.get(marriage);assert.ok(s.data.compatibility>=10);assert.notEqual(s.data.compatibility,s.data.success);assert.equal(await db.scheduledJob.count({where:{executionKey:'family:marriage_close:'+marriage}}),1);});
 await runCase('marriage community votes are editable, exclude spouses, freeze and unlock only first child slot',async()=>{marriage=await marry('host','spouse');await assert.rejects(()=>repo.marriageVote(c('self-vote'),marriage,'up'),{code:'FAMILY_SPOUSE_VOTE'});await Promise.all(['v1','v2','v3','v4','v5'].map(u=>repo.marriageVote(c('vote:'+u,u),marriage,u==='v5'?'down':'up')));assert.equal((await repo.publicView(marriage)).data.voteResult.approval,80);await repo.marriageVote(c('switch','v5'),marriage,'up');assert.equal(await db.vote.count({where:{sessionId:marriage}}),5);await assert.rejects(()=>repo.closeMarriageVote(guildId,marriage),{code:'NOT_DUE'});tick(3*3600000);await Promise.all([repo.closeMarriageVote(guildId,marriage),repo.closeMarriageVote(guildId,marriage)]);assert.equal((await repo.publicView(marriage)).data.firstChildBonus,true);await assert.rejects(()=>repo.marriageVote(c('late','v1'),marriage,'down'),{code:'FAMILY_VOTE_CLOSED'});adoption=(await repo.adopt(c('adopt-child'),m('child'),m('host'))).sessionId;await repo.decideAdoption(c('child-accept','child'),adoption,true);const tree=await repo.tree(guildId,'child');assert.deepEqual(tree.adoptions[0].parents,['host','spouse']);assert.ok(FAMILY_PERKS.includes(tree.record.value.perk));});
 await runCase('Wedding Sack guarantees bot acceptance; a second marriage consumes a fresh Blessing and caps two spouses',async()=>{marriage=await marry('host','spouse');secondMarriage=(await repo.propose(c('second-marriage'),m('second'),m('host'),'sack')).sessionId;assert.equal((await repo.get(secondMarriage)).state,'OPEN');assert.equal((await repo.get(secondMarriage)).data.blessingConsumed,true);assert.equal((await qty('host',FAMILY_ITEMS.blessing)).quantity,9);await assert.rejects(()=>repo.propose(c('third-marriage'),m('third'),m('host'),'sack'),{code:'FAMILY_SPOUSES'});await assert.rejects(()=>repo.divorce(c('too-young'),'spouse'),{code:'FAMILY_AGE'});});
 await runCase('divorce settles half liquid funds once, leaves items, and locks remarriage seven days',async()=>{marriage=await marry('host','spouse');secondMarriage=await marry('host','second');tick(3*DAY);adoption=(await repo.adopt(c('setup-adoption'),m('child'),m('host'))).sessionId;await repo.decideAdoption(c('setup-adoption-accept','child'),adoption,true);tick(3*DAY);const itemBefore=(await qty('host',FAMILY_ITEMS.ring)).quantity;await Promise.all([repo.divorce(c('divorce'),'spouse'),repo.divorce(c('divorce'),'spouse')]);assert.equal((await account('host')).wallet,250n);assert.equal((await account('host')).bank,500n);assert.equal((await account('spouse')).wallet,1750n);assert.equal((await qty('host',FAMILY_ITEMS.ring)).quantity,itemBefore);await assert.rejects(()=>repo.propose(c('remarry-too-soon'),m('spouse'),m('host'),'sack'),{code:'FAMILY_REMARRY'});const tree=await repo.tree(guildId,'host');assert.ok(tree.adoptions.some(a=>a.childUserId==='child'));assert.ok(!tree.marriages.some(r=>r.id===marriage));await repo.endAdoption(c('disown'),'disown','child');assert.ok(!(await repo.tree(guildId,'host')).members.includes('child'));tick(7*DAY);await repo.propose(c('remarry'),m('spouse'),m('host'),'sack');assert.equal((await qty('host',FAMILY_ITEMS.blessing)).quantity,8);});
 await runCase('adoption chooses oldest eligible pair, requires child consent, and emancipation waits3d',async()=>{marriage=await marry('host','spouse');tick(1);secondMarriage=await marry('host','second');tick(3*DAY);await repo.divorce(c('setup-divorce'),'spouse');tick(7*DAY);await marry('host','spouse');const p=(await repo.adopt(c('adopt2'),m('child2'),m('host'))).sessionId;assert.equal((await repo.get(p)).data.marriageId,secondMarriage);await assert.rejects(()=>repo.decideAdoption(c('parent-cannot-accept'),p,true),{code:'FAMILY_TARGET'});await repo.decideAdoption(c('accept2','child2'),p,true);await assert.rejects(()=>repo.endAdoption(c('early-emancipate','child2'),'emancipate'),{code:'FAMILY_AGE'});tick(3*DAY);await repo.endAdoption(c('emancipate','child2'),'emancipate');assert.deepEqual((await repo.tree(guildId,'child2')).members,['child2']);});
 await runCase('concurrent adoption requests cannot oversubscribe a single slot',async()=>{await repo.propose(c('parent2-marriage','parent2'),m('parent2spouse'),m('parent2'),'sack');tick(3*DAY);const outcomes=await Promise.allSettled([repo.adopt(c('slot1','parent2'),m('candidate1'),m('parent2')),repo.adopt(c('slot2','parent2'),m('candidate2'),m('parent2'))]);assert.equal(outcomes.filter(r=>r.status==='fulfilled').length,1);const selected=await repo.get(outcomes.find(r=>r.status==='fulfilled').value.sessionId);await repo.decideAdoption(c('slot-accept',selected.data.targetId),selected.id,true);await assert.rejects(()=>repo.adopt(c('duplicate-child'),m(selected.data.targetId),m('host')),{code:'FAMILY_CHILD_PAIR'});});
 await runCase('sealed bids increase only, escrow all deltas, and highest still-valid bid finalizes with exact refunds',async()=>{const id=(await repo.createAuction(c('auction','auctioned'),m('auctioned'),'spouse',1,100n)).sessionId;await repo.bid(c('bid-a','bidderA'),id,m('bidderA'),100n);await repo.bid(c('increase-a','bidderA'),id,m('bidderA'),150n);await repo.bid(c('bid-b','bidderB'),id,m('bidderB'),200n);await assert.rejects(()=>repo.bid(c('decrease','bidderA'),id,m('bidderA'),149n),{code:'FAMILY_BID_INCREASE'});const view=await repo.publicView(id);assert.equal('bids' in view,false);assert.equal(view.data.amount,undefined);assert.equal(view.data.winnerId,undefined);eligible.delete('bidderB');tick(3600000);await Promise.all([repo.closeAuction(guildId,id),repo.closeAuction(guildId,id)]);assert.equal((await repo.publicView(id)).data.winnerId,'bidderA');assert.equal((await account('auctioned')).wallet,1150n);assert.equal((await account('bidderA')).wallet,850n);assert.equal((await account('bidderB')).wallet,1000n);assert.equal((await qty('bidderA',FAMILY_ITEMS.ring)).quantity,9);assert.equal(await db.escrow.count({where:{guildId,referenceType:'family_bid',state:'RESERVED'}}),0);eligible.add('bidderB');});
 await runCase('reserve failure returns escrow and makes no relationship',async()=>{const id=(await repo.createAuction(c('reserve-auction','reserveSeller'),m('reserveSeller'),'spouse',1,500n)).sessionId;await repo.bid(c('reserve-bid','bidderB'),id,m('bidderB'),100n);tick(3600000);await repo.closeAuction(guildId,id);assert.equal((await account('bidderB')).wallet,1000n);assert.equal((await repo.publicView(id)).data.winnerId,undefined);assert.equal(await db.marriage.count({where:{guildId,status:'ACTIVE',OR:[{userA:'reserveSeller'},{userB:'reserveSeller'}]}}),0);});
 await runCase('rejoin cancels pending estate without transferring assets',async()=>{const e=(await repo.depart(c('leave-returner','returner'),'leave')).sessionId;tick(12*3600000);await repo.rejoin(c('return','returner'));tick(12*3600000);await repo.executeEstate(guildId,e);assert.equal((await repo.get(e)).state,'CANCELLED');assert.equal((await account('returner')).wallet,1000n);});
 await runCase('an eligible command-restricted beneficiary inherits all eligible assets once; late rejoin cannot restore or regrant',async()=>{await repo.setWill(c('will','estateOwner'),'jailedHeir');await db.inventoryEntry.create({data:{guildId:guildId,userId:'estateOwner',itemId:'test.wood',quantity:3,locked:true}});const tool=await db.toolInstance.create({data:{guildId:guildId,userId:'estateOwner',catalogItemId:'test.rod',slot:'fishing_rod',durability:7,maxDurability:10,equipped:true}}),chair=await db.craftedChair.create({data:{guildId:guildId,userId:'estateOwner',chairType:'oak',quality:'rare',locked:true}});const e=(await repo.depart(c('estate-leave','estateOwner'),'ban')).sessionId;eligible.delete('estateOwner');tick(DAY);await Promise.all([repo.executeEstate(guildId,e),repo.executeEstate(guildId,e)]);assert.equal((await account('estateOwner')).wallet,0n);assert.equal((await account('estateOwner')).bank,0n);assert.ok((await account('estateOwner')).starterGrantedAt);assert.equal((await account('jailedHeir')).wallet,2500n);assert.equal((await qty('jailedHeir','test.wood')).quantity,3);assert.equal((await db.toolInstance.findUniqueOrThrow({where:{id:tool.id}})).userId,'jailedHeir');assert.equal((await db.craftedChair.findUniqueOrThrow({where:{id:chair.id}})).userId,'jailedHeir');eligible.add('estateOwner');assert.equal((await repo.rejoin(c('late-return','estateOwner'))).executedPreviously,true);assert.equal((await account('estateOwner')).wallet,0n);assert.equal((await repo.get(e)).data.heirId,'jailedHeir');});
 await runCase('foreign wallet holds defer estate with a durable new job, then release permits the full inheritance',async()=>{await repo.setWill(c('held-will','heldOwner'),'jailedHeir');await db.$transaction(tx=>new PrismaWalletHolds(tx).reserve({guildId:guildId,userId:'heldOwner',referenceType:'test_pending',referenceId:'hold',amount:100n}));const e=(await repo.depart(c('held-leave','heldOwner'),'leave')).sessionId;eligible.delete('heldOwner');tick(DAY);assert.equal((await repo.executeEstate(guildId,e)).deferred,true);assert.equal((await account('heldOwner')).wallet,1000n);assert.equal(await db.scheduledJob.count({where:{executionKey:{startsWith:'family:estate_execute:'+e+':wait:'}}}),1);await db.$transaction(tx=>new PrismaWalletHolds(tx).release({guildId:guildId,userId:'heldOwner',referenceType:'test_pending',referenceId:'hold'}));tick(300000);await repo.executeEstate(guildId,e);assert.equal((await account('heldOwner')).wallet,0n);assert.equal((await account('jailedHeir')).wallet,2500n);});
 await runCase('ineligible will beneficiary falls back to the whole active spouse-and-child pool',async()=>{await repo.propose(c('fallback-marriage','fallbackOwner'),m('fallbackSpouse'),m('fallbackOwner'),'sack');tick(3*DAY);const child=(await repo.adopt(c('fallback-adopt','fallbackOwner'),m('fallbackChild'),m('fallbackOwner'))).sessionId;await repo.decideAdoption(c('fallback-accept','fallbackChild'),child,true);await repo.setWill(c('fallback-will','fallbackOwner'),'badWill');eligible.delete('badWill');const e=(await repo.depart(c('fallback-leave','fallbackOwner'),'leave')).sessionId;eligible.delete('fallbackOwner');tick(DAY);const restarted=new PrismaFamilyRepository(db,'test-only-stable-family-secret-not-production',async(_g,u)=>eligible.has(u),policy,()=>now,max=>max-1);await restarted.executeEstate(guildId,e);assert.equal((await repo.get(e)).data.heirId,'fallbackChild');assert.equal((await account('fallbackChild')).wallet,2500n);assert.equal((await account('badWill')).wallet,1000n);assert.deepEqual((await repo.tree(guildId,'fallbackOwner')).members,['fallbackOwner']);});
 await runCase('no heir burns liquid funds and creates separate system item auctions without restoring departed assets',async()=>{await db.inventoryEntry.create({data:{guildId:guildId,userId:'lonely',itemId:'test.wood',quantity:2}});const e=(await repo.depart(c('lonely-leave','lonely'),'unavailable')).sessionId;eligible.delete('lonely');tick(DAY);await repo.executeEstate(guildId,e);const estate=await repo.get(e);assert.equal(estate.data.heirId,undefined);assert.equal((await account('lonely')).wallet,0n);assert.equal((await account('lonely')).bank,0n);assert.equal(estate.data.auctionIds.length,1);const a=await repo.get(estate.data.auctionIds[0]);assert.equal(a.data.auctionType,'estate');assert.equal(a.expiresAt.getTime(),now.getTime()+DAY);await repo.bid(c('estate-item-bid','bidderB'),a.id,m('bidderB'),50n);tick(DAY);await repo.closeAuction(guildId,a.id);assert.equal((await qty('bidderB','test.wood')).quantity,2);assert.equal((await account('lonely')).wallet,0n);assert.equal((await account('bidderB')).wallet,950n);assert.equal(await db.economyTransaction.count({where:{idempotencyKey:'family:estate:money:'+e}}),1);});
 await runCase('adoption rejection and expiry release the slot and cannot create a relationship on replay',async()=>{
  await marry('parent2','parent2spouse');tick(3*DAY);
  const declined=(await repo.adopt(c('declined-adoption','parent2'),m('candidate1'),m('parent2'))).sessionId;
  await Promise.all([repo.decideAdoption(c('decline-child','candidate1'),declined,false),repo.decideAdoption(c('decline-child','candidate1'),declined,false)]);
  assert.equal((await repo.get(declined)).state,'CANCELLED');
  const expired=(await repo.adopt(c('expired-adoption','parent2'),m('candidate2'),m('parent2'))).sessionId;
  await assert.rejects(()=>repo.expireAdoption(guildId,expired),{code:'NOT_DUE'});tick(DAY);
  await assert.rejects(()=>repo.decideAdoption(c('expired-accept','candidate2'),expired,true),{code:'FAMILY_EXPIRED'});
  await makeRepo().expireAdoption(guildId,expired);await makeRepo().expireAdoption(guildId,expired);
  assert.equal((await repo.get(expired)).state,'CANCELLED');
  assert.equal(await db.adoption.count({where:{guildId,status:{in:['ACTIVE','PENDING']}}}),0);
  await assert.rejects(()=>repo.decideAdoption(c('finalized-accept','candidate2'),expired,true),{code:'FAMILY_TARGET'});
 });
 await runCase('sealed child auction uses an eligible existing parent pair and does not consume a Ring',async()=>{
  const pair=await marry('bidderA','spouse');tick(3*DAY);
  const id=(await repo.createAuction(c('child-auction','auctioned'),m('auctioned'),'child',1)).sessionId;
  const ringBefore=(await qty('bidderA',FAMILY_ITEMS.ring)).quantity;
  await repo.bid(c('child-bid','bidderA'),id,m('bidderA'),125n);tick(3600000);
  await Promise.all([makeRepo().closeAuction(guildId,id),makeRepo().closeAuction(guildId,id)]);
  const adopted=await db.adoption.findFirstOrThrow({where:{guildId,childUserId:'auctioned',status:'ACTIVE'}});
  assert.equal(adopted.parentPairKey,pair);assert.equal((await account('auctioned')).wallet,1125n);
  assert.equal((await account('bidderA')).wallet,875n);assert.equal((await qty('bidderA',FAMILY_ITEMS.ring)).quantity,ringBefore);
 });
 await runCase('concurrent duplicate bid reserves once and unavailable settlement items refund original wallet and bank',async()=>{
  const id=(await repo.createAuction(c('bank-auction','auctioned'),m('auctioned'),'spouse',1)).sessionId;
  await Promise.all([repo.bid(c('same-bank-bid','bidderA'),id,m('bidderA'),1200n),repo.bid(c('same-bank-bid','bidderA'),id,m('bidderA'),1200n)]);
  assert.equal((await account('bidderA')).wallet,0n);assert.equal((await account('bidderA')).bank,300n);
  assert.equal(await db.escrow.count({where:{guildId,referenceType:'family_bid',referenceId:id+':bidderA'}}),1);
  await assert.rejects(()=>repo.bid(c('unfunded-increase','bidderA'),id,m('bidderA'),1600n),{code:'INSUFFICIENT_FUNDS'});
  await db.inventoryEntry.update({where:{guildId_userId_itemId:{guildId,userId:'bidderA',itemId:FAMILY_ITEMS.ring}},data:{locked:true}});tick(3600000);
  await makeRepo().closeAuction(guildId,id);assert.equal((await repo.get(id)).data.winnerId,undefined);
  assert.equal((await account('bidderA')).wallet,1000n);assert.equal((await account('bidderA')).bank,500n);
  assert.equal(await db.marriage.count({where:{guildId,status:'ACTIVE'}}),0);
 });
 await runCase('divorce preserves outstanding holds and retries the unchanged settlement after release',async()=>{
  await marry('host','spouse');tick(3*DAY);
  await db.$transaction(tx=>new PrismaWalletHolds(tx).reserve({guildId,userId:'host',referenceType:'test_pending',referenceId:'divorce',amount:1000n}));
  await assert.rejects(()=>repo.divorce(c('held-divorce'),'spouse'),{code:'FAMILY_FUNDS_PENDING'});
  assert.equal(await db.marriage.count({where:{guildId,status:'ACTIVE'}}),1);assert.equal((await account('host')).wallet,1000n);
  await db.$transaction(tx=>new PrismaWalletHolds(tx).release({guildId,userId:'host',referenceType:'test_pending',referenceId:'divorce'}));
  await repo.divorce(c('held-divorce'),'spouse');assert.equal((await account('host')).wallet,250n);assert.equal((await account('spouse')).wallet,1750n);
 });
 await runCase('estate refuses unknown membership and cancels a confirmed return even before a rejoin event arrives',async()=>{
  await repo.setWill(c('return-will','estateOwner'),'jailedHeir');const id=(await repo.depart(c('return-race','estateOwner'),'leave')).sessionId;
  eligible.delete('estateOwner');tick(DAY);
  await assert.rejects(()=>makeRepo(()=>0,async()=>{throw Error('Membership lookup unavailable');}).executeEstate(guildId,id),/Membership lookup unavailable/);
  assert.equal((await repo.get(id)).state,'OPEN');assert.equal((await account('estateOwner')).wallet,1000n);
  eligible.add('estateOwner');await makeRepo().executeEstate(guildId,id);
  assert.equal((await repo.get(id)).state,'CANCELLED');assert.equal((await account('estateOwner')).wallet,1000n);assert.equal((await account('jailedHeir')).wallet,1000n);
 });
 await runCase('restart during item-reserved estate defers until proposal expiry and transfers the refunded item once',async()=>{
  await repo.setWill(c('reserved-will','estateOwner'),'jailedHeir');
  const proposal=(await repo.propose(c('reserved-proposal','estateOwner'),m('spouse'),m('estateOwner'))).sessionId;
  const id=(await repo.depart(c('reserved-leave','estateOwner'),'leave')).sessionId;eligible.delete('estateOwner');tick(DAY);
  assert.equal((await makeRepo().executeEstate(guildId,id)).deferred,true);
  assert.equal((await account('estateOwner')).wallet,1000n);assert.equal((await qty('estateOwner',FAMILY_ITEMS.ring)).quantity,9);
  await makeRepo().expireProposal(guildId,proposal);tick(300000);
  await Promise.all([makeRepo().executeEstate(guildId,id),makeRepo().executeEstate(guildId,id)]);
  assert.equal((await qty('jailedHeir',FAMILY_ITEMS.ring)).quantity,20);assert.equal((await account('jailedHeir')).wallet,2500n);
  assert.equal(await db.economyTransaction.count({where:{guildId,idempotencyKey:'family:estate:money:'+id}}),1);
 });
 await runCase('estate closes a departed sellers auction, refunds bidders and tolerates its delayed close job',async()=>{
  const auction=(await repo.createAuction(c('departing-auction','estateOwner'),m('estateOwner'),'spouse',72)).sessionId;
  await repo.bid(c('departing-bid','bidderA'),auction,m('bidderA'),1100n);
  const estate=(await repo.depart(c('departing-seller','estateOwner'),'leave')).sessionId;eligible.delete('estateOwner');tick(DAY);
  await makeRepo().executeEstate(guildId,estate);assert.equal((await repo.get(auction)).state,'CANCELLED');
  assert.equal((await account('bidderA')).wallet,1000n);assert.equal((await account('bidderA')).bank,500n);
  await makeRepo().closeAuction(guildId,auction);assert.equal((await account('bidderA')).wallet,1000n);
  assert.equal(await db.escrow.count({where:{guildId,referenceType:'family_bid',state:'RESERVED'}}),0);
 });
 await runCase('relationship mutations bind their invoker and reject command-restricted actors without consuming state',async()=>{
  const proposal=(await repo.propose(c('restricted-proposal'),m('spouse'),m('host'))).sessionId;
  blocked.add('spouse');await assert.rejects(()=>repo.decideProposal(c('restricted-rejection','spouse'),proposal,false),{code:'FAMILY_INELIGIBLE'});
  assert.equal((await repo.get(proposal)).state,'DRAFT');blocked.delete('spouse');await repo.decideProposal(c('allowed-accept','spouse'),proposal,true);tick(3*DAY);
  await assert.rejects(()=>repo.adopt(c('spoofed-parent'),m('child'),m('v1')),{code:'FAMILY_ACTOR'});
  const adoption=(await repo.adopt(c('restricted-adoption'),m('child'),m('host'))).sessionId;
  blocked.add('child');await assert.rejects(()=>repo.decideAdoption(c('restricted-child','child'),adoption,false),{code:'FAMILY_INELIGIBLE'});
  assert.equal((await repo.get(adoption)).state,'DRAFT');blocked.delete('child');await repo.decideAdoption(c('allowed-child','child'),adoption,true);tick(3*DAY);
  blocked.add('host');await assert.rejects(()=>repo.endAdoption(c('restricted-disown'),'disown','child'),{code:'FAMILY_INELIGIBLE'});
  assert.equal(await db.adoption.count({where:{guildId,childUserId:'child',status:'ACTIVE'}}),1);
 });
 await runCase('gateway return during estate asset transfer rolls back all money, inventory, audit and publication writes',async()=>{
  await repo.setWill(c('mid-transfer-will','estateOwner'),'jailedHeir');
  await db.inventoryEntry.create({data:{guildId,userId:'estateOwner',itemId:'test.wood',quantity:3}});
  const id=(await repo.depart(c('mid-transfer-depart','estateOwner'),'leave')).sessionId;eligible.delete('estateOwner');tick(DAY);
  let generation=0,returned=false;
  class RejoiningEstateRepository extends PrismaFamilyRepository {
   async grantEstateAsset(tx,serverId,winnerId,asset){
    await super.grantEstateAsset(tx,serverId,winnerId,asset);
    if(!returned){returned=true;eligible.add('estateOwner');generation++;}
   }
  }
  const returning=new RejoiningEstateRepository(db,familySecret,async(_g,u)=>eligible.has(u),policy,()=>now,()=>0,async(_g,u)=>eligible.has(u)&&!blocked.has(u),()=>generation);
  await assert.rejects(()=>returning.executeEstate(guildId,id),{code:'FAMILY_MEMBERSHIP_CHANGED'});
  assert.equal(returned,true);assert.equal((await repo.get(id)).state,'OPEN');
  assert.equal((await account('estateOwner')).wallet,1000n);assert.equal((await account('estateOwner')).bank,500n);assert.equal((await account('estateOwner')).starterGrantedAt,null);
  assert.equal((await account('jailedHeir')).wallet,1000n);assert.equal((await qty('estateOwner','test.wood')).quantity,3);
  assert.equal(await db.inventoryEntry.count({where:{guildId,userId:'jailedHeir',itemId:'test.wood'}}),0);
  assert.equal(await db.economyTransaction.count({where:{guildId,idempotencyKey:'family:estate:money:'+id}}),0);
  assert.equal(await db.auditEvent.count({where:{guildId,action:'family.estate_executed'}}),0);
  assert.equal(await db.scheduledJob.count({where:{guildId,executionKey:'family:publish:'+id}}),0);
  await makeRepo().executeEstate(guildId,id);assert.equal((await repo.get(id)).state,'CANCELLED');
 });
 await runCase('gateway return during atomic receipt insertion rolls back the estate and its receipt',async()=>{
  await repo.setWill(c('receipt-race-will','estateOwner'),'jailedHeir');
  await db.inventoryEntry.create({data:{guildId,userId:'estateOwner',itemId:'test.wood',quantity:3}});
  const id=(await repo.depart(c('receipt-race-depart','estateOwner'),'leave')).sessionId;eligible.delete('estateOwner');tick(DAY);
  let generation=0,injected=false;
  const racingDb=new Proxy(db,{get(target,key){
   if(key==='$transaction')return(operation,options)=>target.$transaction(tx=>operation(new Proxy(tx,{get(transaction,property){
    if(property==='operationReceipt')return new Proxy(transaction.operationReceipt,{get(delegate,method){
     if(method==='create')return async args=>{
      const receipt=await delegate.create(args);
      if(args.data.key.startsWith('family:estate_execute:'+id+':')){injected=true;eligible.add('estateOwner');generation++;}
      return receipt;
     };
     const value=Reflect.get(delegate,method);return typeof value==='function'?value.bind(delegate):value;
    }});
    const value=Reflect.get(transaction,property);return typeof value==='function'?value.bind(transaction):value;
   }})),options);
   const value=Reflect.get(target,key);return typeof value==='function'?value.bind(target):value;
  }});
  const returning=new PrismaFamilyRepository(racingDb,familySecret,async(_g,u)=>eligible.has(u),policy,()=>now,()=>0,async(_g,u)=>eligible.has(u)&&!blocked.has(u),()=>generation);
  await assert.rejects(()=>returning.executeEstate(guildId,id),{code:'FAMILY_MEMBERSHIP_CHANGED'});
  assert.equal(injected,true);assert.equal((await repo.get(id)).state,'OPEN');
  assert.equal((await account('estateOwner')).wallet,1000n);assert.equal((await account('estateOwner')).bank,500n);assert.equal((await account('estateOwner')).starterGrantedAt,null);
  assert.equal((await account('jailedHeir')).wallet,1000n);assert.equal((await qty('estateOwner','test.wood')).quantity,3);
  assert.equal(await db.inventoryEntry.count({where:{guildId,userId:'jailedHeir',itemId:'test.wood'}}),0);
  assert.equal(await db.economyTransaction.count({where:{guildId,idempotencyKey:'family:estate:money:'+id}}),0);
  assert.equal(await db.operationReceipt.count({where:{guildId,key:{startsWith:'family:estate_execute:'+id+':'}}}),0);
  assert.equal(await db.auditEvent.count({where:{guildId,action:'family.estate_executed'}}),0);
  assert.equal(await db.scheduledJob.count({where:{guildId,executionKey:'family:publish:'+id}}),0);
  await makeRepo().executeEstate(guildId,id);assert.equal((await repo.get(id)).state,'CANCELLED');
 });
 await runCase('trusted return persists its epoch with cancellation, rejects stale joins and permits a fresh next departure',async()=>{
  const oldJoin=new Date(+now-DAY),oldLeave=new Date(now);
  await db.memberPresenceState.create({data:{guildId,userId:'returner',joinedAt:oldJoin,leftAt:oldLeave,needsRulesAck:false}});
  const first=(await repo.depart(c('durable-first-depart','returner'),'leave')).sessionId;tick(3600000);const join=new Date(now);
  const firstReturn=await repo.rejoin(c('durable-return','returner'),join);assert.equal(firstReturn.canceled,1);
  const present=await db.memberPresenceState.findUniqueOrThrow({where:{guildId_userId:{guildId,userId:'returner'}}});
  assert.equal(+present.joinedAt,+join);assert.equal(present.leftAt,null);assert.equal(present.needsRulesAck,false);assert.equal((await repo.get(first)).state,'CANCELLED');
  assert.deepEqual(await repo.rejoin(c('durable-return','returner'),join),firstReturn);
  await assert.rejects(()=>repo.rejoin(c('durable-return','returner'),new Date(+join+1)),{code:'REPLAY_MISMATCH'});
  tick(3600000);const secondLeave=new Date(now);await db.memberPresenceState.update({where:{guildId_userId:{guildId,userId:'returner'}},data:{leftAt:secondLeave}});
  const second=(await repo.depart(c('durable-second-depart','returner'),'leave')).sessionId;assert.notEqual(second,first);
  assert.equal((await repo.rejoin(c('stale-epoch','returner'),oldJoin)).staleReturn,true);
  assert.equal((await repo.rejoin(c('duplicate-old-join','returner'),join)).staleReturn,true);
  await repo.rejoin(c('durable-return','returner'),join);
  const absent=await db.memberPresenceState.findUniqueOrThrow({where:{guildId_userId:{guildId,userId:'returner'}}});
  assert.equal(+absent.leftAt,+secondLeave);assert.equal(+absent.joinedAt,+join);assert.equal((await repo.get(second)).state,'OPEN');
  tick(3600000);assert.equal((await repo.rejoin(c('durable-second-return','returner'),new Date(now))).canceled,1);
  assert.equal((await repo.get(second)).state,'CANCELLED');
 });
 await runCase('a crash after atomic return receipt insertion rolls back both presence and estate cancellation',async()=>{
  const oldJoin=new Date(+now-DAY),oldLeave=new Date(now);
  await db.memberPresenceState.create({data:{guildId,userId:'returner',joinedAt:oldJoin,leftAt:oldLeave}});
  const id=(await repo.depart(c('return-crash-depart','returner'),'leave')).sessionId;tick(3600000);const join=new Date(now);let boundaryReached=false;
  const failingDb=new Proxy(db,{get(target,key){
   if(key==='$transaction')return(operation,options)=>target.$transaction(tx=>operation(new Proxy(tx,{get(transaction,property){
    if(property==='operationReceipt')return new Proxy(transaction.operationReceipt,{get(delegate,method){
     if(method==='create')return async args=>{
      const receipt=await delegate.create(args);
      if(args.data.key==='family:rejoin:return-crash'){
       const presence=await transaction.memberPresenceState.findUniqueOrThrow({where:{guildId_userId:{guildId,userId:'returner'}}});
       const estate=await transaction.gameSession.findUniqueOrThrow({where:{id}});
       assert.equal(+presence.joinedAt,+join);assert.equal(presence.leftAt,null);assert.equal(estate.state,'CANCELLED');boundaryReached=true;throw Error('Injected return transaction failure');
      }
      return receipt;
     };
     const value=Reflect.get(delegate,method);return typeof value==='function'?value.bind(delegate):value;
    }});
    const value=Reflect.get(transaction,property);return typeof value==='function'?value.bind(transaction):value;
   }})),options);
   const value=Reflect.get(target,key);return typeof value==='function'?value.bind(target):value;
  }});
  const failing=new PrismaFamilyRepository(failingDb,familySecret,async(_g,u)=>eligible.has(u),policy,()=>now,()=>0);
  await assert.rejects(()=>failing.rejoin(c('return-crash','returner'),join),/Injected return transaction failure/);assert.equal(boundaryReached,true);
  const presence=await db.memberPresenceState.findUniqueOrThrow({where:{guildId_userId:{guildId,userId:'returner'}}});
  assert.equal(+presence.joinedAt,+oldJoin);assert.equal(+presence.leftAt,+oldLeave);assert.equal((await repo.get(id)).state,'OPEN');
  assert.equal(await db.operationReceipt.count({where:{guildId,key:'family:rejoin:return-crash'}}),0);
  assert.equal((await makeRepo().rejoin(c('return-crash','returner'),join)).canceled,1);
  assert.equal((await repo.get(id)).state,'CANCELLED');assert.equal((await db.memberPresenceState.findUniqueOrThrow({where:{guildId_userId:{guildId,userId:'returner'}}})).leftAt,null);
 });
 await runCase('fresh current-presence reconciliation repairs a stale same-epoch departure while historical replay cannot',async()=>{
  const join=new Date(+now-DAY),leftAt=new Date(now);
  await db.memberPresenceState.create({data:{guildId,userId:'returner',joinedAt:join,leftAt}});
  const id=(await repo.depart(c('same-epoch-depart','returner'),'unavailable')).sessionId;
  assert.equal((await repo.rejoin(c('same-epoch-event','returner'),join)).staleReturn,true);assert.equal((await repo.get(id)).state,'OPEN');
  assert.equal((await repo.rejoin(c('same-epoch-fresh','returner'),join,true)).canceled,1);assert.equal((await repo.get(id)).state,'CANCELLED');
  assert.equal((await db.memberPresenceState.findUniqueOrThrow({where:{guildId_userId:{guildId,userId:'returner'}}})).leftAt,null);
  await assert.rejects(()=>repo.rejoin(c('same-epoch-fresh','returner'),join,false),{code:'REPLAY_MISMATCH'});
 });
 await runCase('largest-family entitlement retains a tie, moves to the remaining family and clears when no family remains',async()=>{
  await marry('host','spouse');const original=(await repo.tree(guildId,'host')).record.value;
  await marry('parent2','parent2spouse');assert.deepEqual((await repo.tree(guildId,'host')).record.value,original);
  tick(3*DAY);await repo.divorce(c('record-divorce'),'spouse');
  const next=(await repo.tree(guildId,'parent2')).record.value;assert.deepEqual(next.members,['parent2','parent2spouse']);assert.ok(FAMILY_PERKS.includes(next.perk));
  await repo.divorce(c('record-divorce2','parent2'),'parent2spouse');
  const empty=(await repo.tree(guildId,'parent2')).record.value;assert.deepEqual(empty.members,[]);assert.equal(empty.count,0);assert.equal(empty.perk,null);
 });
 }finally{assert.match(schema,/^aj_family_test_[0-9a-f]{32}$/);try{if(connected)await db.$executeRawUnsafe('DROP SCHEMA IF EXISTS "'+schema+'" CASCADE');}finally{await db.$disconnect();}}});
