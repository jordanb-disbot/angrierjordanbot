import {DomainError} from '../../../packages/core/src/index.js';
type Command={name?:string;type?:number};
export function chairismRegistrationEnabled(command:Command,enabled:boolean){return enabled&&((command.type===3&&command.name==='Create Chairism')||(command.type===1&&(command.name==='quote'||command.name==='chairisms')));}
export function validateRegisteredCommands(expected:readonly Command[],response:unknown){
 if(!Array.isArray(response))throw new DomainError('COMMAND_REGISTRATION_MISMATCH','Discord command registration response is invalid.');
 const keys=(items:readonly Command[])=>items.map(c=>`${c.type??1}:${c.name}`).sort();
 if(response.some(c=>!c||typeof c.name!=='string'||!Number.isInteger(c.type))||JSON.stringify(keys(expected))!==JSON.stringify(keys(response)))throw new DomainError('COMMAND_REGISTRATION_MISMATCH','Discord registered command names/types do not match the requested commands.');
}
