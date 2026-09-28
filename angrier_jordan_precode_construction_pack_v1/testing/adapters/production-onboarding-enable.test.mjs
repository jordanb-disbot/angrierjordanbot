import test from 'node:test';
import assert from 'node:assert/strict';
import {productionOnboardingTarget,planProductionSelfRoles,enableProductionOnboarding,verifyFoldingGate,LANDING_CHANNEL,WELCOME_CATEGORY,main} from '../../scripts/enable-production-onboarding.mjs';

const guildId='1524964384642957432';
const accessId='1525538959176896562';
const botId='1524964384642957433';
const botRoleId='1524964384642957434';
const names=[
 ['dm_status','DM Status','single',['DMs Open','DMs Closed']],
 ['gender','Gender','single',['Male','Female']],
 ['age','Age','single',['18-24','25-34','35+']],
 ['regions','Region','single',['North America','South America','Europe','Africa','Asia','Oceania']],
 ['vices','Interests/Substances','multi',['Stimulants','Disassociatives','Hallucinogens','Depressants','Cannabinoids']],
 ['personalities','Personalities','multi',['Morning Perch','Night Recliner','BeanBag','Swivel Chair','Wobbly Stool','Ghost Chair']],
 ['pings','Notification Pings','multi',['Line Ping','Race Ping','VC Ping','Chess Ping']],
];
const role=(id,name,position=1,permissions='0')=>({id,name,position,permissions,managed:false});
function rolesFixture(){
 let index=0;
 return [role(guildId,'@everyone',0),role(accessId,'Folding Chair',50),{...role(botRoleId,'The Chairman',100,String(1n<<28n)),managed:true},...names.flatMap(([, , ,options])=>options.map(name=>role(String(1600000000000000000n+BigInt(index++)),name,index)))];
}
function panelFixture(roles){return {name:'Default Roles',enabled:true,config:{categories:names.map(([key,label,mode,options])=>({key,label,mode,options:options.map(name=>({roleId:roles.find(r=>r.name===name).id,label:name,enabled:true}))}))}};}
const configRows=roles=>[{key:'roles.member_access',value:accessId},{key:'rejoin.restore_self_roles',value:true},{key:'special_commands.builtin_role_map',value:Object.fromEntries(['!line','!race','!vc','!chess'].map(trigger=>[trigger,roles.find(r=>r.name===({ '!line':'Line Ping','!race':'Race Ping','!vc':'VC Ping','!chess':'Chess Ping'}[trigger])).id]))}];
const mainChatId='1524964386077151365';
const memberCategoryId='1537594244796260412';
const legacyId='1700000000000000001',existingId='1700000000000000002',jailedId='1700000000000000003',pendingId='1700000000000000004',otherBotId='1700000000000000005';
function enableFixture(){
 const roles=rolesFixture(),panels=[],rows=new Map([...configRows(roles),{key:'channels.main_chat',value:mainChatId},{key:'roles_panel.enabled',value:false},...Object.entries({'onboarding.rules_ack_required':true,'rejoin.require_rules_ack':true,'rejoin.restore_self_roles':true,'rejoin.restore_manual_nonstaff_roles':true,'rejoin.restore_staff_roles':false,'rejoin.restore_nickname':true}).map(([key,value])=>({key,value}))].map(({key,value})=>[key,{value,version:1}]));
 const writes=[],panelWrites=[],audits=[],output=[];
 const config={getWithMetadata:async(_guild,key)=>rows.get(key)??{value:null,version:0},get:async(_guild,key)=>rows.get(key)?.value??null,set:async input=>{
  assert.equal(input.guildId,guildId);assert.equal(input.source,'operator.production-onboarding-enablement');assert.ok(input.requestId);assert.equal(input.expectedVersion,rows.get(input.key)?.version??0);
  writes.push(input);rows.set(input.key,{value:structuredClone(input.value),version:input.expectedVersion+1});
 }};
 const upsert=async args=>{panelWrites.push(args);const next={id:'panel-id',guildId,name:'Default Roles',enabled:true,config:structuredClone(args.create?.config??args.update?.config)};panels.splice(0,panels.length,next);return structuredClone(next);};
 const db={guild:{findUnique:async()=>({id:guildId})},configValue:{findMany:async()=>[...rows].map(([key,{value}])=>({key,value}))},selfRolePanel:{findMany:async()=>structuredClone(panels),findUnique:async()=>structuredClone(panels[0]??null)},$transaction:async callback=>callback({selfRolePanel:{upsert},auditEvent:{create:async input=>audits.push(input)}})};
 const memberOverwrites=[{id:guildId,type:0,allow:'0',deny:String(1n<<10n)},{id:accessId,type:0,allow:String((1n<<10n)|(1n<<11n)),deny:'0'}];
 const channels=[
  {id:mainChatId,guild_id:guildId,type:0,parent_id:memberCategoryId,permission_overwrites:structuredClone(memberOverwrites)},
  {id:memberCategoryId,guild_id:guildId,type:4,permission_overwrites:structuredClone(memberOverwrites)},
  {id:LANDING_CHANNEL,guild_id:guildId,type:0,parent_id:WELCOME_CATEGORY,permission_overwrites:[{id:guildId,type:0,allow:String(1n<<10n),deny:'0'}]},
  {id:WELCOME_CATEGORY,guild_id:guildId,type:4,permission_overwrites:[{id:guildId,type:0,allow:String(1n<<10n),deny:'0'}]},
 ];
 const members=[
  {user:{id:legacyId},roles:['1700000000000000099']},
  {user:{id:existingId},roles:[accessId]},
  {user:{id:jailedId},roles:[]},
  {user:{id:pendingId},roles:[],pending:true},
  {user:{id:otherBotId,bot:true},roles:[]},
 ];
 const get=async path=>path===`/guilds/${guildId}/roles`?roles:path===`/guilds/${guildId}/channels`?channels:path==='/users/@me'?{id:botId}:path===`/guilds/${guildId}/members/${botId}`?{user:{id:botId},roles:[botRoleId]}:path===`/guilds/${guildId}/members?limit=1000&after=0`?structuredClone(members):path.startsWith(`/guilds/${guildId}/members/`)?structuredClone(members.find(member=>member.user.id===path.split('/').at(-1))):assert.fail('Unexpected Discord GET '+path);
 return {roles,panels,rows,writes,panelWrites,audits,output,channels,members,config,db,get,run:()=>enableProductionOnboarding({db,config,get,write:s=>output.push(s)})};
}

test('production target requires the named guild and private production PostgreSQL before connecting',async()=>{
 const valid={NODE_ENV:'production',AJ_DATABASE_PURPOSE:'production',DISCORD_GUILD_ID:guildId,DATABASE_URL:'postgresql://test:test@db.railway.internal:5432/railway'};
 assert.equal(productionOnboardingTarget(valid).guildId,guildId);
 for(const patch of [{NODE_ENV:'test'},{AJ_DATABASE_PURPOSE:'test'},{DISCORD_GUILD_ID:'1524964384642957435'},{DATABASE_URL:'postgresql://test:test@public.example/railway'}])assert.throws(()=>productionOnboardingTarget({...valid,...patch}));
 const errors=[];
 assert.equal(await main({...valid,NODE_ENV:'test',DISCORD_TOKEN:'never-print-token'},{connect:()=>assert.fail('must reject before connecting'),error:s=>errors.push(s)}),1);
 assert.deepEqual(errors.map(line=>line.split(':')[0]),['STAGE','FAIL']);
 assert.doesNotMatch(errors.join(''),/never-print-token|test:test|postgresql:/);
});

test('panel keeps all seven approved categories and existing role IDs',()=>{
 const roles=rolesFixture(),existingPanel=panelFixture(roles);
 const plan=planProductionSelfRoles({roles,botMember:{roles:[botRoleId]},configRows:configRows(roles),guildId,existingPanel});
 assert.deepEqual(plan.categories.map(c=>c.key),names.map(c=>c[0]));
 assert.deepEqual(plan.categories.map(c=>c.mode),['single','single','single','single','multi','multi','multi']);
 assert.equal(plan.categories.flatMap(c=>c.options).length,28);
 for(const category of plan.categories)for(const option of category.options)assert.equal(option.roleId,existingPanel.config.categories.find(c=>c.key===category.key).options.find(o=>o.label===option.label).roleId);
 assert.ok(!plan.categories.flatMap(c=>c.options).some(o=>o.roleId===accessId||o.roleId===guildId));
});

test('planner rejects missing, ambiguous, managed, permission bearing, elevated and protected self roles',()=>{
 const bad=[
  roles=>roles.splice(roles.findIndex(r=>r.name==='DMs Open'),1),
  roles=>roles.push({...roles.find(r=>r.name==='DMs Open'),id:'1700000000000000000'}),
  roles=>{roles.find(r=>r.name==='DMs Open').managed=true;},
  roles=>{roles.find(r=>r.name==='DMs Open').permissions='8';},
  roles=>{roles.find(r=>r.name==='DMs Open').position=100;},
 ];
 for(const mutate of bad){const roles=rolesFixture();mutate(roles);assert.throws(()=>planProductionSelfRoles({roles,botMember:{roles:[botRoleId]},configRows:configRows(roles),guildId}));}
 const roles=rolesFixture(),rows=configRows(roles);rows.push({key:'roles.throne',value:roles.find(r=>r.name==='DMs Open').id});
 assert.throws(()=>planProductionSelfRoles({roles,botMember:{roles:[botRoleId]},configRows:rows,guildId,existingPanel:panelFixture(roles)}));
 const granted=rolesFixture(),self=granted.find(r=>r.name==='DMs Open');
 assert.throws(()=>planProductionSelfRoles({roles:granted,channels:[{permission_overwrites:[{id:self.id,allow:String(1n<<10n),deny:'0'}]}],botMember:{roles:[botRoleId]},configRows:configRows(granted),guildId}),/SELF_ROLE_CHANNEL_GRANT/);
});

test('enablement uses audited settings writes, preserves the existing panel, and is idempotent',async()=>{
 const f=enableFixture();f.panels.push({...panelFixture(f.roles),id:'panel-id',guildId,enabled:false});
 await f.run();
 assert.equal(f.rows.get('roles.member_access').value,accessId);
 assert.equal(f.rows.get('roles_panel.enabled').value,true);
 assert.equal(f.panels[0].config.categories.length,7);
 assert.equal(f.audits.length,1);
 assert.equal(f.audits[0].data.source,'operator.production-onboarding-enablement');
 assert.equal(f.audits[0].data.action,'roles.panel_configured');
 const first={settings:f.writes.length,panel:f.panelWrites.length};
 await f.run();
 assert.deepEqual({settings:f.writes.length,panel:f.panelWrites.length},first);
 assert.deepEqual(f.members[0].roles,['1700000000000000099']);
 assert.match(f.output.join('\n'),/existing member roles and self-role selections unchanged/);
 assert.ok(f.output.every(line=>line.startsWith('PASS:')));
});

test('maintenance never writes Discord member roles or requests a member inventory',async()=>{
 const f=enableFixture(),paths=[];
 await enableProductionOnboarding({db:f.db,config:f.config,get:async path=>{paths.push(path);return f.get(path);},write:s=>f.output.push(s)});
 assert.ok(paths.every(path=>!path.includes('/members?')&&!path.includes('/roles/'+accessId)));
 assert.deepEqual(f.members.map(member=>member.roles),[['1700000000000000099'],[accessId],[],[],[]]);
});
test('production entrypoint uses Discord GET only and emits verified PASS output',async()=>{
 const f=enableFixture(),methods=[],output=[],errors=[];
 const env={NODE_ENV:'production',AJ_DATABASE_PURPOSE:'production',DISCORD_GUILD_ID:guildId,DATABASE_URL:'postgresql://test:test@db.railway.internal:5432/railway',DISCORD_TOKEN:'fixture-token'};
 const code=await main(env,{connect:async()=>({db:{...f.db,$disconnect:async()=>{}},config:f.config}),fetcher:async(url,options)=>{methods.push(options.method);return{ok:true,status:200,json:async()=>f.get(new URL(url).pathname.replace('/api/v10',''))};},write:line=>output.push(line),error:line=>errors.push(line)});
 assert.equal(code,0);assert.ok(methods.length>=4);assert.ok(methods.every(method=>method==='GET'));
 assert.ok(output.every(line=>line.startsWith('PASS:')));assert.equal(errors.some(line=>line.startsWith('FAIL:')),false);
});

test('an unchanged approved panel keeps its current IDs and causes no panel rewrite',async()=>{
 const f=enableFixture();f.panels.push({...panelFixture(f.roles),id:'panel-id',guildId});f.rows.set('roles_panel.enabled',{value:true,version:1});
 await f.run();assert.equal(f.panelWrites.length,0);assert.equal(f.audits.length,0);assert.equal(f.writes.length,0);
});

test('everyone channel bypass or bot hierarchy failure prevents every write',async()=>{
 for(const mutate of [f=>{f.channels[0].permission_overwrites=[];},f=>{f.roles.find(r=>r.id===botRoleId).position=1;},f=>{f.roles.find(r=>r.id===botRoleId).permissions='0';}]){
  const f=enableFixture();mutate(f);await assert.rejects(f.run());assert.equal(f.writes.length,0);assert.equal(f.panelWrites.length,0);assert.equal(f.audits.length,0);
 }
});

test('public landing remains visible without Folding Chair while gated member category is hidden',()=>{
 const f=enableFixture(),mappings={'channels.main_chat':mainChatId};
 assert.deepEqual(verifyFoldingGate({roles:f.roles,channels:f.channels,mappings}),[memberCategoryId]);
 const everyone=f.channels[1].permission_overwrites.find(o=>o.id===guildId);everyone.deny='0';everyone.allow=String(1n<<10n);
 assert.throws(()=>verifyFoldingGate({roles:f.roles,channels:f.channels,mappings}),/EVERYONE_CATEGORY_VIEW_BYPASS/);
});

test('new members can see public Welcome category and take-a-seat before receiving Folding Chair',()=>{
 const f=enableFixture(),mappings={'channels.main_chat':mainChatId};
 assert.equal(f.channels[2].parent_id,WELCOME_CATEGORY);
 assert.deepEqual(verifyFoldingGate({roles:f.roles,channels:f.channels,mappings}),[memberCategoryId]);
 f.channels[3].permission_overwrites[0].allow='0';
 assert.throws(()=>verifyFoldingGate({roles:f.roles,channels:f.channels,mappings}),/WELCOME_CATEGORY_NOT_PUBLIC/);
 f.channels[3].permission_overwrites[0].allow=String(1n<<10n);
 f.channels[2].permission_overwrites[0].allow='0';
 assert.throws(()=>verifyFoldingGate({roles:f.roles,channels:f.channels,mappings}),/LANDING_NOT_PUBLIC/);
});

test('landing must be in the named Welcome category',()=>{
 const f=enableFixture(),mappings={'channels.main_chat':mainChatId};
 f.channels[2].parent_id=memberCategoryId;
 assert.throws(()=>verifyFoldingGate({roles:f.roles,channels:f.channels,mappings}),/LANDING_WELCOME_CATEGORY_MISMATCH/);
});

test('Folding Chair unlocks the synced member category and its child channels',()=>{
 const f=enableFixture(),mappings={'channels.main_chat':mainChatId};
 assert.deepEqual(f.channels[0].permission_overwrites,f.channels[1].permission_overwrites,'synced child uses category overwrites');
 assert.deepEqual(verifyFoldingGate({roles:f.roles,channels:f.channels,mappings}),[memberCategoryId]);
 f.channels[1].permission_overwrites.find(row=>row.id===accessId).allow='0';
 assert.throws(()=>verifyFoldingGate({roles:f.roles,channels:f.channels,mappings}),/FOLDING_CATEGORY_VIEW_MISSING/);
});

test('an unsynced public child cannot bypass a gated member category',()=>{
 const f=enableFixture(),mappings={'channels.main_chat':mainChatId};
 f.channels[0].permission_overwrites=[{id:guildId,type:0,allow:String(1n<<10n),deny:'0'}];
 assert.throws(()=>verifyFoldingGate({roles:f.roles,channels:f.channels,mappings}),/UNSYNCED_MEMBER_VIEW_BYPASS/);
});
test('staff-only children may remain hidden from Folding Chair, but an unmapped public category fails',()=>{
 const f=enableFixture(),mappings={'channels.main_chat':mainChatId};
 f.channels.push({id:'1700000000000000071',guild_id:guildId,type:0,parent_id:memberCategoryId,permission_overwrites:[{id:guildId,type:0,allow:'0',deny:String(1n<<10n)}]});
 assert.deepEqual(verifyFoldingGate({roles:f.roles,channels:f.channels,mappings}),[memberCategoryId]);
 f.channels.push({id:'1700000000000000072',guild_id:guildId,type:4,permission_overwrites:[{id:guildId,type:0,allow:String(1n<<10n),deny:'0'}]});
 assert.throws(()=>verifyFoldingGate({roles:f.roles,channels:f.channels,mappings}),/EVERYONE_CATEGORY_VIEW_BYPASS_1700000000000000072/);
});

test('preflight reports every category and child bypass before a single fail-closed result',()=>{
 const f=enableFixture(),issues=[];
 for(const channel of [f.channels[1],f.channels[0]]){
  const everyone=channel.permission_overwrites.find(row=>row.id===guildId);
  everyone.allow=String(1n<<10n);everyone.deny='0';
 }
 assert.throws(()=>verifyFoldingGate({roles:f.roles,channels:f.channels,mappings:{'channels.main_chat':mainChatId},onIssue:code=>issues.push(code)}),/CATEGORY_GATE_REVIEW_REQUIRED/);
 assert.deepEqual(issues,[`EVERYONE_CATEGORY_VIEW_BYPASS_${memberCategoryId}`,`UNSYNCED_MEMBER_VIEW_BYPASS_${mainChatId}`]);
});

test('sanitized stage markers locate a channel-gate failure before any write',async()=>{
 const f=enableFixture(),stages=[];
 const everyone=f.channels[1].permission_overwrites.find(row=>row.id===guildId);
 everyone.allow=String(1n<<10n);everyone.deny='0';
 await assert.rejects(()=>enableProductionOnboarding({db:f.db,config:f.config,get:f.get,diagnostic:line=>stages.push(line)}),/EVERYONE_CATEGORY_VIEW_BYPASS/);
 assert.deepEqual(stages,['STAGE: discord_inventory','STAGE: role_resolution','STAGE: channel_permissions',`STAGE: member_category_ids=["${memberCategoryId}"]`,`WARN: EVERYONE_CATEGORY_VIEW_BYPASS_${memberCategoryId}`]);
 assert.equal(f.writes.length,0);assert.equal(f.panelWrites.length,0);assert.equal(f.audits.length,0);
 assert.doesNotMatch(stages.join(''),/postgresql:|Bot |DISCORD_TOKEN/);
});

test('a failed setting write prints no PASS and retries without changing member roles',async()=>{
 const f=enableFixture(),set=f.config.set;let fail=true;
 f.config.set=async input=>{if(fail&&input.key==='roles_panel.enabled')throw Error('private failure details');return set(input);};
 await assert.rejects(f.run());assert.equal(f.output.length,0);fail=false;
 await f.run();assert.equal(f.rows.get('roles_panel.enabled').value,true);
 assert.equal(f.panelWrites.length,1);assert.equal(f.audits.length,1);
});
