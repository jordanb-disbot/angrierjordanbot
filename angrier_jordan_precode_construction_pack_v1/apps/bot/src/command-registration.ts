import {DomainError} from '../../../packages/core/src/index.js';
type Command={name?:string;type?:number};
export function chairismRegistrationEnabled(command:Command,enabled:boolean){return enabled&&((command.type===3&&command.name==='Create Chairism')||(command.type===1&&(command.name==='quote'||command.name==='chairisms')));}
/** Commands that must remain discoverable independent of optional feature flags. */
export function alwaysRegisteredCommand(command:Command){return command.type===1&&['status','announce','dms'].includes(command.name??'');}
/**
 * Discord error 30034 is the per-guild daily application-command creation
 * quota. The short `retry_after` included in that response is not the daily
 * reset time, so retrying it every few minutes only creates needless traffic.
 */
export function dailyCommandCreateCooldownSeconds(error:unknown){
 if(!error||typeof error!=='object'||!('code' in error)||error.code!==30034)return null;
 return 24*60*60;
}
export function validateRegisteredCommands(expected:readonly Command[],response:unknown){
 if(!Array.isArray(response))throw new DomainError('COMMAND_REGISTRATION_MISMATCH','Discord command registration response is invalid.');
 const keys=(items:readonly Command[])=>items.map(c=>`${c.type??1}:${c.name}`).sort();
 if(response.some(c=>!c||typeof c.name!=='string'||!Number.isInteger(c.type))||JSON.stringify(keys(expected))!==JSON.stringify(keys(response)))throw new DomainError('COMMAND_REGISTRATION_MISMATCH','Discord registered command names/types do not match the requested commands.');
}
