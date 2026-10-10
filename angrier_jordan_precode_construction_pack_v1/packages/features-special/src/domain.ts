import {DomainError} from '../../core/src/errors.js';
// Five visible numbers, then a three-second powder finale. There is never a
// visible zero frame between 1 and the burst.
export const LINE_DURATION_MS=8000;
export type CheckIn='ready'|'waiting';
export interface LineMember {userId:string;name:string;status:CheckIn;}
export interface LineData {members:LineMember[];startedAt?:string;shame?:{id:string;text:string};cancelReason?:string;}
export function lineFrame(elapsedMs:number,durationMs=LINE_DURATION_MS):{phase:'countdown'|'burst'|'complete';number?:number;progress:number}{
 const elapsed=Math.max(0,elapsedMs);
 if(elapsed<5000)return{phase:'countdown',number:5-Math.floor(elapsed/1000),progress:(elapsed%1000)/1000};
 if(elapsed<durationMs)return{phase:'burst',progress:(elapsed-5000)/(durationMs-5000)};
 return{phase:'complete',progress:1};
}
export interface SpecialCommand {trigger:string;notificationRoleId:string|null;responsePool:string[];enabled:boolean;allowedRoleIds:string[];}
export const BUILTIN_TRIGGERS=['!line','!race','!vc','!chess'] as const;
export function validateBuiltinRoleMap(value:unknown):Record<typeof BUILTIN_TRIGGERS[number],string|null>{
 if(!value||typeof value!=='object'||Array.isArray(value))throw new DomainError('SPECIAL_CONFIG','Provide all four built-in notification role mappings.');const map=value as Record<string,unknown>;
 if(Object.keys(map).length!==BUILTIN_TRIGGERS.length||BUILTIN_TRIGGERS.some(key=>!Object.hasOwn(map,key)||!(map[key]===null||typeof map[key]==='string'&&/^\d{17,20}$/.test(map[key]))))throw new DomainError('SPECIAL_CONFIG','Use exactly !line, !race, !vc and !chess, each mapped to a role ID or null.');
 return Object.fromEntries(BUILTIN_TRIGGERS.map(key=>[key,map[key]])) as Record<typeof BUILTIN_TRIGGERS[number],string|null>;
}
export function validateCustomSpecialCommands(value:unknown):SpecialCommand[]{
 if(!Array.isArray(value)||value.length>100)throw new DomainError('SPECIAL_CONFIG','Use a list of at most 100 Special Commands.');
 const seen=new Set<string>();
 return value.map(raw=>{
  if(!raw||typeof raw!=='object'||Array.isArray(raw))throw new DomainError('SPECIAL_CONFIG','Invalid Special Command.');
  const r=raw as Record<string,unknown>;
  if(Object.keys(r).some(k=>!['trigger','notificationRoleId','responsePool','enabled','allowedRoleIds'].includes(k)))throw new DomainError('SPECIAL_CONFIG','Special Commands support notification/message fields only.');
  if(typeof r.trigger!=='string'||!/^![a-z][a-z0-9_-]{0,31}$/.test(r.trigger)||BUILTIN_TRIGGERS.includes(r.trigger as typeof BUILTIN_TRIGGERS[number])||seen.has(r.trigger))throw new DomainError('SPECIAL_CONFIG','Use a unique trigger distinct from built-in commands.');
  if(typeof r.enabled!=='boolean'||!(r.notificationRoleId===null||typeof r.notificationRoleId==='string'&&/^\d{17,20}$/.test(r.notificationRoleId)))throw new DomainError('SPECIAL_CONFIG','Invalid enabled state or notification role.');
  if(!Array.isArray(r.allowedRoleIds)||r.allowedRoleIds.some(id=>typeof id!=='string'||!/^\d{17,20}$/.test(id)))throw new DomainError('SPECIAL_CONFIG','Invalid allowed roles.');
  if(!Array.isArray(r.responsePool)||!r.responsePool.length||r.responsePool.length>100||r.responsePool.some(s=>typeof s!=='string'||!s.trim()||s.length>1500))throw new DomainError('SPECIAL_CONFIG','Supply 1–100 plain-text responses, each at most 1500 characters.');
  seen.add(r.trigger);return r as unknown as SpecialCommand;
 });
}
export const mayInvokeSpecial=(allowed:readonly string[],roles:ReadonlySet<string>)=>!allowed.length||allowed.some(id=>roles.has(id));
/** Only this explicit opt-in role is allowed to ping; response text cannot add mentions. */
export function specialNotificationRole(role:{id:string;managed:boolean;permissions:{bitfield:bigint}}|undefined,guildId:string){return role&&role.id!==guildId&&!role.managed&&role.permissions.bitfield===0n?role.id:undefined;}
export function safeMemberName(name:string){return name.replace(/[\u0000-\u001f\u007f-\u009f]/g,'').slice(0,80)||'Member';}
