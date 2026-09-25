import fs from 'node:fs';
const schema=JSON.parse(fs.readFileSync('reference/acceleration/registries/master_settings_schema.json','utf8'));
const label=k=>k.split('.').at(-1).split('_').map(x=>x?x[0].toUpperCase()+x.slice(1):x).join(' ').replace(/\bDms\b/g,'DMs');
const kind=t=>({boolean:'toggle',integer:'number',choice:'select',discord_channel:'channel',discord_role:'role',json:'json',string:'text'}[t]??'text');
const controls=schema.settings.map(s=>({key:s.key,section:s.section,label:label(s.key),description:s.description??'',kind:kind(s.type),defaultValue:s.default,risk:s.risk,editableBy:s.editable_by??[],restartRequired:Boolean(s.restart_required),...(s.min===undefined?{}:{min:s.min}),...(s.max===undefined?{}:{max:s.max}),...(s.choices?{choices:s.choices}:{})}));
fs.writeFileSync('apps/dashboard/lib/generated/settings-controls.json',JSON.stringify({count:controls.length,controls},null,2)+'\n');
console.log(`Dashboard schema controls ready: ${controls.length}`);
