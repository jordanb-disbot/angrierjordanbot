import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../../'+p,import.meta.url),'utf8');
test('Race slash alias and prefix retain one handler, feature, channel and help contract',()=>{
 const commands=JSON.parse(read('reference/acceleration/registries/master_command_registry.json')).commands;
 const prefix=commands.find(c=>c.id==='race'),slash=commands.find(c=>c.id==='race_slash');
 assert.equal(prefix.registration_path,'!race');assert.equal(slash.registration_path,'/race');assert.equal(slash.type,'slash');
 for(const key of ['handler','feature_flag','channels','permissions','help_id','tutorial_id'])assert.deepEqual(slash[key],prefix[key],key);
 const registered=JSON.parse(read('generated/discord/application_commands.json')).filter(c=>c.name==='race');
 assert.equal(registered.length,1);assert.equal(registered[0].type,1);assert.deepEqual(registered[0].options,[]);
});
test('production enables and routes slash Race using event flag before global slow restrictions',()=>{
 const source=read('apps/bot/src/production.ts');assert.ok(source.includes("enableEventsSmoke&&(c.name==='fight'||c.name==='race')"));
 const handler=source.slice(source.indexOf('on(Events.InteractionCreate'));
 const route=handler.indexOf('await events.startRace(interaction)');assert.ok(route>=0);assert.ok(route<handler.indexOf('await jail.isModerationJailed'));
});
test('Race help and tutorials expose both commands without changing economics',()=>{
 const help=JSON.parse(read('packages/content/help/events.json')),lessons=JSON.parse(read('packages/content/help/tutorial-lessons.json')).lessons;
 assert.ok(help.commands.includes('race_slash'));assert.equal(help.race,help.race_slash);
 assert.match(help.race,/!race or \/race/);assert.match(help.body,/95%/);assert.deepEqual(lessons.race,lessons.race_slash);
});
