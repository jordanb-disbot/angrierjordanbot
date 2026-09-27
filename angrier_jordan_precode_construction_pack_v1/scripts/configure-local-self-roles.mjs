import {readFileSync} from 'node:fs';
import {parseEnv} from 'node:util';
import {pathToFileURL} from 'node:url';
import {testServerTarget} from './test-server.mjs';

export const categories=[
 ['dm_status','DM Status','single',['DMs Open','DMs Closed']],
 ['gender','Gender','single',['Male','Female']],
 ['age','Age','single',['18-24','25-34','35+']],
 ['regions','Region','single',['North America','South America','Europe','Africa','Asia','Oceania']],
 ['vices','Interests / Substances','multi',['Stimulants','Dissociatives','Hallucinogens','Depressants','Cannabinoids']],
 ['personalities','Personalities','multi',['Morning Perch','Night Recliner','BeanBag','Swivel Chair','Wobbly Stool','Ghost Chair']],
 ['pings','Notification Pings','multi',['Chess Ping','Race Ping','VC Ping','REDOSE']],
];
const normalize=s=>s.toLowerCase().replace(/[^a-z0-9+]/g,'');
// The existing disposable server uses this spelling; keep its name and ID unchanged.
const existingAliases={Dissociatives:['Disassociatives']};
export function planSelfRoles(roles,botRoleIds,configRows,guildId){
 const botRoles=roles.filter(r=>botRoleIds.includes(r.id)),top=Math.max(0,...botRoles.map(r=>r.position));
 const permissions=botRoles.concat(roles.filter(r=>r.id===guildId)).reduce((p,r)=>p|BigInt(r.permissions),0n);
 if((permissions&((1n<<3n)|(1n<<28n)))===0n)throw Error('BOT_CANNOT_MANAGE_ROLES');
 const rejected=[];
 const result=categories.map(([key,label,mode,names])=>({key,label,mode,options:names.flatMap(label=>{
  const names=[label,...existingAliases[label]??[]];
  const matches=roles.filter(r=>names.some(name=>normalize(r.name)===normalize(name)));
  if(matches.length!==1){rejected.push({label,reason:matches.length?'Ambiguous duplicate names':'Not found in test server'});return[];}
  const r=matches[0],references=configRows.filter(c=>JSON.stringify(c.value,(_,v)=>typeof v==='bigint'?v.toString():v).includes('"'+r.id+'"')).map(c=>c.key);
  const protectedReferences=references;
  const reason=r.id===guildId?'Everyone role':r.managed?'Integration-managed role':r.position>=top?'Not below AJ':BigInt(r.permissions)!==0n?'Has Discord permission bits':protectedReferences.length?'Protected/configured use: '+protectedReferences.join(', '):null;
  if(reason){rejected.push({label,reason});return[];}
  return[{roleId:r.id,label:r.name,enabled:true}];
 })}));
 return{categories:result,rejected};
}
async function main(){
 let db;try{
  const localText=readFileSync(new URL('../.env.music.local',import.meta.url),'utf8'),local=parseEnv(localText),target=testServerTarget(localText,readFileSync(new URL('../.env.test.local',import.meta.url),'utf8'));
  const {PrismaClient}=await import('@prisma/client');db=new PrismaClient({datasourceUrl:target.databaseUrl,log:[]});
  const get=async path=>{const r=await fetch('https://discord.com/api/v10'+path,{headers:{Authorization:'Bot '+local.DISCORD_TOKEN}});if(!r.ok)throw Error('DISCORD_READ_FAILED_'+r.status);return r.json();};
  const me=await get('/users/@me');
  const [guild,roles,member,configRows,panels,catalog,achievements]=await Promise.all([get('/guilds/'+target.guildId),get('/guilds/'+target.guildId+'/roles'),get('/guilds/'+target.guildId+'/members/'+me.id),db.configValue.findMany({where:{guildId:target.guildId}}),db.selfRolePanel.findMany({where:{guildId:target.guildId}}),db.catalogItem.findMany(),db.achievement.findMany()]);
  const references=[...configRows,...catalog.map(row=>({key:'catalog.'+row.id,value:row})),...achievements.map(row=>({key:'achievement.'+row.id,value:row}))];
  const plan=planSelfRoles(roles,member.roles,references,target.guildId);
  console.log(JSON.stringify({guild:guild.name,guildId:target.guildId,plan,nearMatches:roles.filter(r=>/dis|porch/i.test(r.name)).map(r=>({name:r.name,id:r.id})),existingPanels:panels.map(p=>({name:p.name,enabled:p.enabled}))},null,2));
  if(process.argv.includes('--apply')){
   if(!plan.categories.some(c=>c.options.length))throw Error('NO_SAFE_ROLES');
   if(panels.some(p=>p.enabled&&p.name!=='Default Roles'))throw Error('EXISTING_PANEL_REVIEW_REQUIRED');
   const saved=await db.selfRolePanel.upsert({where:{guildId_name:{guildId:target.guildId,name:'Default Roles'}},create:{guildId:target.guildId,name:'Default Roles',enabled:true,config:{categories:plan.categories}},update:{enabled:true,config:{categories:plan.categories}}});
   const verified=await db.selfRolePanel.findUnique({where:{id:saved.id}});
   if(JSON.stringify(verified.config)!==JSON.stringify(saved.config))throw Error('VERIFY_FAILED');
   console.log('PASS: Real test-server role panel persisted and read back. No Discord roles or memberships changed.');
  }
 }catch(e){console.error('LOCAL_ROLE_SETUP_FAILED: '+(/^[A-Z][A-Z0-9_]+$/.test(e?.message??'')?e.message:'READ_OR_DATABASE_ERROR')+'. No credentials displayed.');process.exitCode=1;}
 finally{await db?.$disconnect();}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)await main();
