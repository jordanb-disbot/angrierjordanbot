import {readFileSync} from 'node:fs';
import type {CommandContract,CommandOptionContract} from '../../contracts/src/types.js';
interface HelpDocument {commands:string[];title?:string;body?:string;games?:Record<string,string>;fields?:Record<string,unknown>;examples?:string[];tutorial?:{steps?:string[]};[key:string]:unknown;}
export interface LessonCopy {purpose:string;fields:string;example:string;steps:string[];}
// These are the existing feature-owned, reviewed help sources. Runtime never executes examples.
const sources=['items','profiles','casino','events','special','solo','pvp','party','channel-games','crime','family','community','chairisms','social','introductions','learning'];
const documents:HelpDocument[]=sources.map(name=>JSON.parse(readFileSync(new URL('../../content/help/'+name+'.json',import.meta.url),'utf8')) as HelpDocument);
const fieldTypes:Record<string,string>={user:'a server member',integer:'a whole number',number:'a number',boolean:'yes or no',channel:'a server channel',role:'a server role',string:'text',choice:'one of the listed choices'};
function object(value:unknown):Record<string,unknown>|undefined{return value&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:undefined;}
function fieldCopy(c:CommandContract,o:CommandOptionContract,source:HelpDocument|undefined){
 const nested=object(source?.fields?.[c.id]),specific=nested?.[o.name],common=source?.fields?.[o.name];
 const prose=typeof specific==='string'?specific:typeof common==='string'?common:o.description?.trim()||'Provide '+(fieldTypes[o.type]??o.type)+'.';
 const limits=[o.choices?.length?'Choices: '+o.choices.join(', '):'',o.min!==undefined?'Minimum: '+o.min:'',o.max!==undefined?'Maximum: '+o.max:'',o.autocomplete?'Search the offered choices.':''].filter(Boolean);
 return`${o.name} (${o.required?'required':'optional'}; ${fieldTypes[o.type]??o.type}): ${prose}${limits.length?' '+limits.join(' · '):''}`;
}
function exampleValue(o:CommandOptionContract){if(o.choices?.[0])return o.choices[0];if(o.name==='action')return'compliment';if(o.type==='user')return'@ExampleMember';if(o.type==='integer'||o.type==='number')return String(Math.max(o.min??1,Math.min(10,o.max??10)));if(o.type==='boolean')return'true';if(o.type==='channel')return'#example-channel';if(o.type==='role')return'@ExampleRole';return'<'+o.name+'>';}
function currentExample(c:CommandContract,source:HelpDocument|undefined){
 const authored=source?.examples?.find(e=>e===c.registered||e.startsWith(c.registered+' ')||e.startsWith(c.registered+' →'));
 // Registry paths and actual option names win over prose examples with old positional syntax.
 if(authored&&c.options.filter(o=>o.required).every(o=>authored.includes(o.name+':')))return authored;
 return c.registered+c.options.filter(o=>o.required).map(o=>' '+o.name+':'+exampleValue(o)).join('');
}
function boundedSteps(steps:string[]){const clean=steps.filter(s=>typeof s==='string'&&s.trim());if(clean.length<=5)return clean;const result=clean.slice(0,4);result.push(clean.slice(4).join(' '));return result;}
/** Registry defines execution paths/fields; feature help supplies actual teaching content. */
export function lessonCopy(c:CommandContract):LessonCopy{
 const source=documents.find(d=>d.commands.includes(c.id)),detail=source?.games?.[c.id]??(typeof source?.[c.id]==='string'?source[c.id] as string:undefined);
 const purpose=[detail,source?.body].filter((v):v is string=>Boolean(v)).join('\n\n')||`Quick reference for ${c.registered}. A feature-specific guided lesson has not been authored yet.`;
 const fields=c.options.map(o=>fieldCopy(c,o,source)).join('\n')||'This command has no slash-command fields. Follow its displayed controls where offered.';
 const example=currentExample(c,source),authored=source?.tutorial?.steps??[];
 const steps=boundedSteps(authored.length?authored:[`Find ${c.registered} in Discord’s command picker.`,c.options.length?'Review the required and optional fields below.':'Read the command’s current availability and displayed controls.',`Review this example without executing it: ${example}`,'Exit this private walkthrough before using the real command. This walkthrough grants no rewards and changes no server state.']);
 return{purpose,fields,example,steps};
}
