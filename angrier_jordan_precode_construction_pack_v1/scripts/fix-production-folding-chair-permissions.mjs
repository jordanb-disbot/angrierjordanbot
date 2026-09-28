import {pathToFileURL} from 'node:url';
import {productionTarget,GUILD} from './audit-production-race-line.mjs';
import {FOLDING_CHAIR,WELCOME_CATEGORY} from './enable-production-onboarding.mjs';

export const STALE_ROLE='1525538959176896562';
export const MEMBER_CATEGORIES=new Set([
 '1524964386077151363', // The Lounge
 '1524964386077151364', // The Den
 '1525535562046636102', // The Parlor
 '1537334907947319306', // The Game Room
]);
const VIEW=1n<<10n,SEND=1n<<11n,HISTORY=1n<<20n;
const MEMBER_BITS=VIEW|SEND|HISTORY;
const check=(ok,code)=>{if(!ok)throw Error(code);};
const snowflake=value=>typeof value==='string'&&/^\d{17,20}$/.test(value);
const same=(a,b)=>a?.type===0&&b?.type===0&&a.allow===b.allow&&a.deny===b.deny;

export function planFoldingPermissionRepair({roles,channels,botMember,guildId=GUILD}){
 check(Array.isArray(roles)&&Array.isArray(channels)&&Array.isArray(botMember?.roles),'DISCORD_INVENTORY_INVALID');
 const oldRole=roles.find(role=>role.id===STALE_ROLE),folding=roles.find(role=>role.id===FOLDING_CHAIR);
 check(oldRole?.name==='Metal Chair'&&folding?.name==='Folding Chair'&&!oldRole.managed&&!folding.managed,'ROLE_IDENTITY_INVALID');
 const owned=roles.filter(role=>role.id===guildId||botMember.roles.includes(role.id));
 const permissions=owned.reduce((bits,role)=>bits|BigInt(role.permissions),0n);
 const top=Math.max(0,...owned.map(role=>role.position));
 check(Boolean(permissions&((1n<<3n)|(1n<<28n)))&&top>Math.max(oldRole.position,folding.position),'AJ_PERMISSION_OR_HIERARCHY_INVALID');
 const targets=[];
 for(const channel of channels){
  const old=channel.permission_overwrites?.find(row=>row.id===STALE_ROLE);
  if(!old)continue;
  check(channel.guild_id===guildId&&snowflake(channel.id)&&Array.isArray(channel.permission_overwrites),'CHANNEL_IDENTITY_INVALID');
  check(channel.id!==WELCOME_CATEGORY&&(channel.type===4?MEMBER_CATEGORIES.has(channel.id):MEMBER_CATEGORIES.has(channel.parent_id)),'STALE_OVERWRITE_OUTSIDE_MEMBER_GATE');
  check(old.type===0&&/^\d+$/.test(old.allow)&&/^\d+$/.test(old.deny),'STALE_OVERWRITE_INVALID');
  const allow=BigInt(old.allow),deny=BigInt(old.deny);
  check(Boolean(allow&VIEW)&&!(allow&~MEMBER_BITS)&&deny===0n,'STALE_OVERWRITE_UNSAFE');
  const replacement=channel.permission_overwrites.find(row=>row.id===FOLDING_CHAIR);
  check(!replacement||same(old,replacement),'FOLDING_OVERWRITE_CONFLICT');
  targets.push({id:channel.id,type:channel.type,allow:old.allow,deny:old.deny,create:!replacement});
 }
 return targets.sort((a,b)=>a.id.localeCompare(b.id));
}

export async function repairFoldingPermissions({get,put,remove,write=console.log}){
 const [roles,channels,me]=await Promise.all([get(`/guilds/${GUILD}/roles`),get(`/guilds/${GUILD}/channels`),get('/users/@me')]);
 check(snowflake(me?.id),'BOT_ID_INVALID');
 const botMember=await get(`/guilds/${GUILD}/members/${me.id}`);
 const targets=planFoldingPermissionRepair({roles,channels,botMember});
 for(const target of targets){
  const path=`/channels/${target.id}/permissions/`;
  const current=await get(`/channels/${target.id}`);
  const stale=current?.permission_overwrites?.find(row=>row.id===STALE_ROLE);
  const currentFolding=current?.permission_overwrites?.find(row=>row.id===FOLDING_CHAIR);
  check(current?.id===target.id&&stale?.type===0&&stale.allow===target.allow&&stale.deny===target.deny&&(!currentFolding||same(stale,currentFolding)),'OVERWRITE_CHANGED_DURING_REPAIR');
  if(target.create)await put(path+FOLDING_CHAIR,{type:0,allow:target.allow,deny:target.deny});
  const beforeDelete=await get(`/channels/${target.id}`);
  const replacement=beforeDelete.permission_overwrites?.find(row=>row.id===FOLDING_CHAIR);
  const remaining=beforeDelete.permission_overwrites?.find(row=>row.id===STALE_ROLE);
  check(remaining?.type===0&&remaining.allow===target.allow&&remaining.deny===target.deny&&replacement?.type===0&&replacement.allow===target.allow&&replacement.deny===target.deny,'FOLDING_COPY_VERIFY_FAILED');
  await remove(path+STALE_ROLE);
  const verified=await get(`/channels/${target.id}`);
  check(verified?.id===target.id&&verified.permission_overwrites?.every(row=>row.id!==STALE_ROLE)&&verified.permission_overwrites.some(row=>row.id===FOLDING_CHAIR&&row.type===0&&row.allow===target.allow&&row.deny===target.deny),'OVERWRITE_REPAIR_VERIFY_FAILED');
  write(`PASS: ${target.type===4?'category':'channel'} ${target.id} Folding Chair overwrite verified; stale overwrite removed.`);
 }
 write(`PASS: production guild verified; ${targets.length} stale member-access overwrite${targets.length===1?'':'s'} repaired; unrelated permissions untouched.`);
 return targets;
}

export async function main(env=process.env,{fetcher=fetch,write=console.log,error=console.error}={}){
 try{
  productionTarget(env);
  check(Boolean(env.DISCORD_TOKEN),'DISCORD_TOKEN_MISSING');
  const request=async(method,path,body)=>{
   for(let attempt=0;attempt<5;attempt++){
    const response=await fetcher('https://discord.com/api/v10'+path,{method,headers:{Authorization:'Bot '+env.DISCORD_TOKEN,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(15000)});
    if(response.status===429){const wait=Number((await response.json())?.retry_after);check(Number.isFinite(wait)&&wait>=0&&wait<=60,'DISCORD_RATE_LIMIT_INVALID');await new Promise(resolve=>setTimeout(resolve,Math.ceil(wait*1000)+250));continue;}
    check(response.ok,'DISCORD_REQUEST_FAILED');
    if(method==='GET')return response.json();
    check(response.status===204,'DISCORD_WRITE_STATUS_INVALID');return;
   }
   throw Error('DISCORD_RATE_LIMIT_EXHAUSTED');
  };
  await repairFoldingPermissions({get:path=>request('GET',path),put:(path,body)=>request('PUT',path,body),remove:path=>request('DELETE',path),write});
  return 0;
 }catch(cause){const safe=/^[A-Z][A-Z0-9_]+$/.test(cause?.message??'')?cause.message:'FOLDING_PERMISSION_REPAIR_FAILED';error(`FAIL: ${safe}. No exception details displayed.`);return 1;}
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)process.exitCode=await main();
