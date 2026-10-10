import fs from 'node:fs';
import {auditCommandShapes} from './command-shape-audit.mjs';
const write=(file,value)=>{if(!fs.existsSync(file)||fs.readFileSync(file,'utf8')!==value)fs.writeFileSync(file,value);};
const src=JSON.parse(fs.readFileSync('reference/acceleration/registries/master_command_registry.json','utf8'));
const typeMap={string:3,choice:3,integer:4,boolean:5,user:6,channel:7,role:8,mentionable:9,number:10};
const choice=v=>typeof v==='object'&&v!==null&&'name' in v&&'value' in v?{name:String(v.name).slice(0,100),value:v.value}:{name:String(v).slice(0,100),value:v};
const option=o=>({type:typeMap[o.type]??3,name:o.name,description:(o.description||`${o.name} option`).slice(0,100),required:Boolean(o.required),...(o.autocomplete?{autocomplete:true}:{}),...(o.choices?{choices:o.choices.map(choice)}:{}),...(o.min===undefined?{}:{min_value:o.min}),...(o.max===undefined?{}:{max_value:o.max})});
const desc=c=>(c.description||`${c.module} command`).slice(0,100);
const roots=new Map();const context=[];
const rootPermissions=new Map();
for(const c of src.commands){
 if(c.type==='context_message'){context.push({type:3,name:(c.registration_path??c.command).replace(/^\//,'').slice(0,32)});continue;}
 if(c.type!=='slash')continue;
 const parts=(c.registration_path??c.command).replace(/^\//,'').trim().split(/\s+/);const rootName=parts[0];if(!rootName)continue;
 const permissions=Array.isArray(c.permissions)?c.permissions:[];const existingPermissions=rootPermissions.get(rootName)??[];existingPermissions.push(permissions);rootPermissions.set(rootName,existingPermissions);
 if(parts.length===1){roots.set(rootName,{type:1,name:rootName,description:desc(c),options:(c.options??[]).map(option).sort((a,b)=>Number(b.required)-Number(a.required))});continue;}
 let root=roots.get(rootName);if(!root||!Array.isArray(root.options)||root.options.some(x=>x.type!==1&&x.type!==2))root={type:1,name:rootName,description:`Angrier Jordan ${rootName} commands`,options:[]};
 if(parts.length===2){root.options.push({type:1,name:parts[1],description:desc(c),options:(c.options??[]).map(option).sort((a,b)=>Number(b.required)-Number(a.required))});}
 else {let group=root.options.find(x=>x.type===2&&x.name===parts[1]);if(!group){group={type:2,name:parts[1],description:`${parts[1]} commands`,options:[]};root.options.push(group);}group.options.push({type:1,name:parts[2],description:desc(c),options:(c.options??[]).map(option).sort((a,b)=>Number(b.required)-Number(a.required))});}
 roots.set(rootName,root);
}
for(const [name,command] of roots){const permissions=rootPermissions.get(name)??[];if(permissions.length&&permissions.every(set=>set.length===1&&set[0]==='throne'))command.default_member_permissions='0';}
const out=[...roots.values(),...context];const shapeIssues=auditCommandShapes(out);if(shapeIssues.length)throw new Error(shapeIssues.join('\n'));fs.mkdirSync('generated/discord',{recursive:true});write('generated/discord/application_commands.json',JSON.stringify(out,null,2)+'\n');write('generated/discord/command_budget_report.json',JSON.stringify({application_commands:out.length,slash_commands:[...roots.keys()].length,context_commands:context.length,discord_limit:100,remaining:100-out.length},null,2)+'\n');console.log(`Command registry: ${src.commands.length} conceptual interactions -> ${out.length} Discord application command definitions.`);
