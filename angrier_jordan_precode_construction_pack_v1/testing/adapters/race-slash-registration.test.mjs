import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../../'+p,import.meta.url),'utf8');
test('Race is a prefix-only command and no slash registration remains',()=>{
 const commands=JSON.parse(read('reference/acceleration/registries/master_command_registry.json')).commands;
 const prefix=commands.find(c=>c.id==='race');
 assert.equal(prefix.registration_path,'!race');assert.equal(prefix.type,'special_text');
 assert.equal(commands.some(c=>c.id==='race_slash'||c.command==='/race'),false);
 const registered=JSON.parse(read('generated/discord/application_commands.json')).filter(c=>c.name==='race');
 assert.equal(registered.length,0);
});
test('Race help and tutorial state that slash Race is retired',()=>{
 const help=JSON.parse(read('packages/content/help/events.json')),lessons=JSON.parse(read('packages/content/help/tutorial-lessons.json')).lessons;
 assert.equal(help.commands.includes('race_slash'),false);assert.equal('race_slash' in help,false);assert.equal('race_slash' in lessons,false);
 assert.match(help.race,/retired \/race slash command/i);assert.match(help.body,/95%/);
});
