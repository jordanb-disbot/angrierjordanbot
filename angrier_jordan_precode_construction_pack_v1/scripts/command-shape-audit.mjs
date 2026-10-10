import fs from 'node:fs';
import {pathToFileURL} from 'node:url';

// Read-only structural audit. Invocation changes remain subject to the command contract.
// Discord authority: https://github.com/discord/discord-api-docs/blob/main/developers/interactions/application-commands.mdx
export function auditCommandShapes(commands){
 const issues=[];
 function options(rows,path){
  if(rows.length>25)issues.push(`${path}: ${rows.length} options exceeds Discord's maximum of 25`);
  const names=new Set();let optional=false;
  const branches=rows.filter(o=>o.type===1||o.type===2);
  if(branches.length&&branches.length!==rows.length)issues.push(`${path}: subcommands and value options cannot be siblings`);
  for(const row of rows){
   const next=path+' '+row.name;
   if(names.has(row.name))issues.push(`${next}: duplicate option name`);names.add(row.name);
   if(row.choices?.length>25)issues.push(`${next}: choices exceed 25; use filtered autocomplete or a supported grouping`);
   if(row.autocomplete&&row.choices?.length)issues.push(`${next}: autocomplete and static choices cannot be combined`);
   for(const choice of row.choices??[]){
    if(typeof choice?.name!=='string'||!choice.name)issues.push(`${next}: every choice needs a non-empty string name`);
    if(typeof choice?.value!=='string'&&typeof choice?.value!=='number')issues.push(`${next}: every choice value must be a Discord string or number primitive`);
    if(row.type===4&&typeof choice?.value!=='number')issues.push(`${next}: integer choices require numeric values`);
    if(row.type===3&&typeof choice?.value!=='string')issues.push(`${next}: string choices require string values`);
   }
   if(row.type!==1&&row.type!==2){if(row.required&&optional)issues.push(`${next}: required option follows optional option`);if(!row.required)optional=true;}
   options(row.options??[],next);
  }
 }
 for(const command of commands)options(command.options??[],'/'+command.name);
 return issues;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const commands=JSON.parse(fs.readFileSync(new URL('../generated/discord/application_commands.json',import.meta.url),'utf8'));
 const issues=auditCommandShapes(commands);
 console.log(JSON.stringify({commandCount:commands.length,status:issues.length?'BLOCKED':'PASS',issues},null,2));
 process.exitCode=issues.length?1:0;
}
