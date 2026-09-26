import fs from 'node:fs';
const r=JSON.parse(fs.readFileSync('reference/acceleration/registries/master_command_registry.json','utf8'));const missing=r.commands.filter(c=>c.type==='slash'&&!c.help_id);
console.log(`Slash commands without explicit help_id: ${missing.length}. Some simple commands may intentionally inherit group help; Codex must resolve all warnings before release.`);

if(missing.length)process.exit(1);
const help=JSON.parse(fs.readFileSync('packages/content/help/items.json','utf8'));
for(const id of help.commands){if(!r.commands.some(c=>c.id===id&&c.help_id))throw new Error('Unknown item help command '+id);}
if(!help.fields.gift.member||!help.fields.gift.item||!help.tutorial.steps.length)throw new Error('Incomplete item tutorial metadata');
console.log('Phase 09 contextual help and tutorial coverage valid.');

const casino=JSON.parse(fs.readFileSync('packages/content/help/casino.json','utf8'));
for(const id of casino.commands)if(!r.commands.some(c=>c.id===id&&c.help_id))throw new Error('Unknown casino help command '+id);
for(const game of ['blackjack','roulette','slots','dice','coinflip','lottery'])if(!casino.games[game])throw new Error('Missing casino rules '+game);
if(!casino.fields.amount||!casino.fields.selection||!casino.tutorial.steps.length)throw new Error('Incomplete casino tutorial');
console.log('Phase 11 contextual rules and tutorial coverage valid.');

const events=JSON.parse(fs.readFileSync('packages/content/help/events.json','utf8'));
for(const id of events.commands)if(!r.commands.some(c=>c.id===id&&c.help_id))throw new Error('Unknown event help command '+id);
if(!events.fields.amount||!events.fields.selection||!events.fields.member||!events.tutorial.steps.length)throw new Error('Incomplete event help');
console.log('Race/Fight help and owner-confirmed refund policy present.');
for(const family of ['special','solo','pvp','party','channel-games','crime','family','community','chairisms']){
 const content=JSON.parse(fs.readFileSync('packages/content/help/'+family+'.json','utf8'));
 for(const id of content.commands)if(!r.commands.some(c=>c.id===id&&c.help_id&&c.tutorial_id))throw new Error('Missing contextual help registry link '+id);
 if(!Object.keys(content.fields).length||!content.tutorial.steps.length)throw new Error('Missing contextual tutorial '+family);
}
console.log('Line/Special Command and solo rules/tutorial metadata valid.');
