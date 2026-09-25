import fs from 'node:fs'; import assert from 'node:assert/strict';
const c=JSON.parse(fs.readFileSync('reference/acceleration/registries/master_command_registry.json','utf8'));
const s=JSON.parse(fs.readFileSync('reference/acceleration/registries/master_settings_schema.json','utf8'));
assert.equal(c.command_count,c.commands.length);assert.equal(s.setting_count,s.settings.length);
assert.equal(new Set(c.commands.map(x=>x.id)).size,c.commands.length);assert.equal(new Set(s.settings.map(x=>x.key)).size,s.settings.length);
for(const x of c.commands){assert.ok(x.handler);assert.ok(x.feature_flag);if(x.type==='slash')assert.ok(x.registration_path.startsWith('/'));}
console.log(`Registries valid: ${c.commands.length} commands, ${s.settings.length} settings.`);
