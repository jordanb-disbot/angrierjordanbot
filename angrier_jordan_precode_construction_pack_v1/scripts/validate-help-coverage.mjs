import fs from 'node:fs';
const r=JSON.parse(fs.readFileSync('reference/acceleration/registries/master_command_registry.json','utf8'));const missing=r.commands.filter(c=>c.type==='slash'&&!c.help_id);
console.log(`Slash commands without explicit help_id: ${missing.length}. Some simple commands may intentionally inherit group help; Codex must resolve all warnings before release.`);

if(missing.length)process.exit(1);
const help=JSON.parse(fs.readFileSync('packages/content/help/items.json','utf8'));
for(const id of help.commands){if(!r.commands.some(c=>c.id===id&&c.help_id))throw new Error('Unknown item help command '+id);}
if(!help.fields.gift.member||!help.fields.gift.item||!help.tutorial.steps.length)throw new Error('Incomplete item tutorial metadata');
console.log('Phase 09 contextual help and tutorial coverage valid.');
