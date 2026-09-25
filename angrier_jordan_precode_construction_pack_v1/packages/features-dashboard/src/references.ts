import type { SettingDefinition } from '../../core/src/config.js';
import { specialNotificationRole } from '../../features-special/src/domain.js';

export interface DiscordReferenceObject {id:string;type?:number;managed?:boolean;permissions?:string;}
export type FetchReferenceObjects=(guildId:string,resource:'channels'|'roles')=>Promise<DiscordReferenceObject[]>;

/** Reuses the runtime's safe opt-in notification-role rule; never repairs or mutates Discord objects. */
export async function verifyDashboardReferences(guildId:string,definitions:readonly SettingDefinition[],values:Record<string,unknown>,fetchObjects:FetchReferenceObjects){
  const errors:string[]=[],references:Record<string,unknown>={};
  for(const [type,resource] of [['discord_channel','channels'],['discord_role','roles']] as const){
    const checks=definitions.filter(definition=>definition.type===type&&values[definition.key]!==null).map(definition=>({key:definition.key,id:values[definition.key],notification:false}));
    if(resource==='roles'&&definitions.some(definition=>definition.key==='special_commands.builtin_role_map')){
      const map=values['special_commands.builtin_role_map'];
      if(map&&typeof map==='object'&&!Array.isArray(map)){
        for(const [trigger,id] of Object.entries(map))if(id!==null)checks.push({key:`special_commands.builtin_role_map.${trigger}`,id,notification:true});
        if(values['features.line']===true&&(map as Record<string,unknown>)['!line']===null)errors.push('features.line: configure the opt-in Line notification role.');
      }
    }
    if(!checks.length)continue;
    let objects:DiscordReferenceObject[];
    try{objects=await fetchObjects(guildId,resource);if(!Array.isArray(objects))throw new Error();}
    catch{errors.push(`Current Discord ${resource} could not be verified. Retry preview when Discord is available.`);continue;}
    for(const check of checks){
      const object=objects.find(item=>item&&item.id===check.id);
      if(!object){errors.push(`${check.key}: the referenced Discord object no longer exists.`);continue;}
      if(check.notification){
        const permissions=object.permissions;
        if(typeof object.managed!=='boolean'||typeof permissions!=='string'||!/^\d+$/.test(permissions)||!specialNotificationRole({id:object.id,managed:object.managed,permissions:{bitfield:BigInt(permissions)}},guildId)){
          errors.push(`${check.key}: choose an unmanaged opt-in role with no Discord permissions.`);continue;
        }
      }
      references[check.key]=resource==='roles'?{id:object.id,managed:object.managed===true,permissions:String(object.permissions??'')}:{id:object.id,type:object.type??null};
    }
  }
  return {errors,references};
}
