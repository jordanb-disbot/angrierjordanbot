import fs from 'node:fs';
const commands=JSON.parse(fs.readFileSync('reference/acceleration/registries/master_command_registry.json','utf8')).commands;
const settings=JSON.parse(fs.readFileSync('reference/acceleration/registries/master_settings_schema.json','utf8')).settings;
const capabilities=JSON.parse(fs.readFileSync('reference/acceleration/registries/capability_matrix.json','utf8'));
const commandContracts=commands.map(c=>({id:c.id,preferred:c.preferred_invocation??c.command,registered:c.registration_path??c.command,type:c.type,module:c.module,handler:c.handler,featureFlag:c.feature_flag,permissions:c.permissions??[],channels:c.channels??[],options:c.options??[],ephemeralDefault:Boolean(c.ephemeral_default),helpId:c.help_id??null,tutorialId:c.tutorial_id??null}));
fs.writeFileSync('packages/contracts/src/generated/commands.ts',`import type { CommandContract } from '../types.js';\nexport const COMMANDS = ${JSON.stringify(commandContracts,null,2)} as const satisfies readonly CommandContract[];\n`);
fs.writeFileSync('packages/contracts/src/generated/settings.ts',`import type { SettingContract } from '../types.js';\nexport const SETTINGS = ${JSON.stringify(settings,null,2)} as const satisfies readonly SettingContract[];\n`);
fs.writeFileSync('packages/contracts/src/generated/capabilities.ts',`export const CAPABILITY_MATRIX = ${JSON.stringify(capabilities,null,2)} as const;\n`);
console.log(`Generated contracts: ${commandContracts.length} commands, ${settings.length} settings, ${Object.keys(capabilities.capabilities??{}).length} capabilities.`);
