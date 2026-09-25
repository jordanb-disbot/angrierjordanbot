import fs from 'node:fs';
const r=JSON.parse(fs.readFileSync('reference/acceleration/registries/master_command_registry.json','utf8'));const missing=r.commands.filter(c=>c.type==='slash'&&!c.help_id);
console.log(`Slash commands without explicit help_id: ${missing.length}. Some simple commands may intentionally inherit group help; Codex must resolve all warnings before release.`);
