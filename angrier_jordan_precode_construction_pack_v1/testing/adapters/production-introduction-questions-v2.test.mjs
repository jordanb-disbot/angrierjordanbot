import test from 'node:test';
import assert from 'node:assert/strict';
import {approvedQuestions,main,revisedIntroductionForm} from '../../scripts/update-production-introduction-questions-v2.mjs';

const guildId='1524964384642957432',channelId='1537333091180355655';
const env={NODE_ENV:'production',AJ_DATABASE_PURPOSE:'production',DISCORD_GUILD_ID:guildId,DATABASE_URL:'postgresql://u:secret@postgres.railway.internal/railway'};
const ids=['name','doc','opinion','last_meal','chair'];
const defaults=ids.map((id,n)=>({id,label:approvedQuestions[n],cardLabel:approvedQuestions[n],required:false,maxLength:120,inputStyle:'short'}));
const oldPrompt=(id,n)=>({id:guildId+'_'+id,label:id,cardLabel:id,sortOrder:n,placeholder:null,required:false,minLength:null,maxLength:120,inputStyle:'short',enabled:true,showOnCard:true,deletedAt:null});
const base=()=>({title:'Owner title',headerText:'PULL UP A CHAIR',footerText:'Welcome',showAvatar:true,showDisplayName:false,showJoinDate:false,allowAdminIntroConfig:false,prompts:['name','doc','character','opinion','last_meal','chair'].map(oldPrompt)});

test('five-question revision keeps answer IDs and retires character without deleting historical prompt',()=>{
 const initial=base(),revised=revisedIntroductionForm(initial,guildId,defaults,new Date('2026-09-27T00:00:00Z'));
 assert.deepEqual(revised.prompts.filter(p=>p.enabled).map(p=>p.id),ids.map(id=>guildId+'_'+id));
 assert.deepEqual(revised.prompts.filter(p=>p.enabled).map(p=>p.label),approvedQuestions);
 assert.deepEqual(revised.prompts.filter(p=>!p.enabled).map(p=>p.id),[guildId+'_character']);
 assert.ok(revised.prompts.filter(p=>!p.enabled).every(p=>p.deletedAt==='2026-09-27T00:00:00.000Z'));
 assert.equal(revised.title,initial.title);
 assert.deepEqual(revised,revisedIntroductionForm(revised,guildId,defaults,new Date('2027-01-01T00:00:00Z')));
 assert.deepEqual(initial.prompts.map(p=>p.enabled),Array(6).fill(true));
});

test('refuses to update using a build without the exact approved questions',()=>{
 assert.throws(()=>revisedIntroductionForm(base(),guildId,defaults.slice(0,4)),/approved five-question build/);
 assert.throws(()=>revisedIntroductionForm(base(),guildId,defaults.map(p=>({...p,label:'Wrong'}))),/approved five-question build/);
});

function fixture(){
 const settings=base(),rows=new Map([['introductions.form',{value:settings,version:2}],['channels.introduction_channel',{value:channelId,version:1}],['features.introductions',{value:true,version:1}]]),writes=[],output=[],errors=[];
 let form={...settings,id:'form1',version:3,prompts:settings.prompts.map(p=>({...p,formId:'form1'}))};
 const configRow={...settings,introductionChannelId:channelId,panelMessageId:'1537333091180355656'};
 const db={guild:{findUnique:async()=>({id:guildId})},$disconnect:async()=>{}};
 const config={getWithMetadata:async(_g,k)=>rows.get(k),set:async x=>{assert.equal(x.source,'operator.production-introduction-questions-v2');assert.equal(x.expectedVersion,rows.get(x.key)?.version);writes.push(x);rows.set(x.key,{value:x.value,version:x.expectedVersion+1});}};
 const repo={configuration:async()=>({form,config:configRow}),configure:async(_g,ch,value)=>{assert.equal(ch,channelId);form={...form,version:form.version+1,prompts:value.prompts.map(p=>({...p,formId:'form1'}))};}};
 const domain={INTRO_DEFAULTS:defaults,validateIntroForm:(f,c)=>{assert.ok(f&&Array.isArray(f.prompts)&&c.headerText);},activePrompts:f=>f.prompts.filter(p=>p.enabled&&!p.deletedAt).sort((a,b)=>a.sortOrder-b.sortOrder)};
 return {rows,writes,output,errors,db,config,repo,domain,configRow,run:()=>main(env,{connect:async()=>({db,config,repo,domain}),write:s=>output.push(s),error:s=>errors.push(s)})};
}

test('production pass writes only audited form, verifies runtime, and is idempotent',async()=>{
 const f=fixture();assert.equal(await f.run(),0);assert.deepEqual(f.writes.map(x=>x.key),['introductions.form']);
 assert.deepEqual(f.rows.get('introductions.form').value.prompts.filter(p=>p.enabled).map(p=>p.label),approvedQuestions);
 assert.equal(f.rows.get('channels.introduction_channel').value,channelId);assert.equal(f.rows.get('features.introductions').value,true);
 assert.equal(f.configRow.panelMessageId,'1537333091180355656');assert.ok(f.output.every(s=>s.startsWith('PASS:')));
 assert.ok(f.output.some(s=>s.includes('five approved questions')));
 assert.equal(await f.run(),0);assert.equal(f.writes.length,1);
});

test('target guards reject before connection and never leak credentials',async()=>{
 for(const change of [{NODE_ENV:'test'},{AJ_DATABASE_PURPOSE:'test'},{DISCORD_GUILD_ID:'0'},{DATABASE_URL:'postgresql://u:secret@public.example/db'}]){
  let connected=false;const output=[];assert.equal(await main({...env,...change},{connect:async()=>{connected=true;},error:s=>output.push(s)}),1);
  assert.equal(connected,false);assert.ok(!output.join(' ').includes('secret'));
 }
});

test('channel mismatch and failed runtime verification do not emit PASS output',async()=>{
 const f=fixture();f.configRow.introductionChannelId='999999999999999999';assert.equal(await f.run(),1);assert.equal(f.writes.length,0);assert.equal(f.output.length,0);
 const g=fixture();g.repo.configure=async()=>{};assert.equal(await g.run(),1);assert.equal(g.output.length,0);assert.equal(g.errors.length,1);
});
