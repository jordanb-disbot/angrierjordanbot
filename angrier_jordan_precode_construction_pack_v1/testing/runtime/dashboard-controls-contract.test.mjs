import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('every generated dashboard control preserves the schema and uses the UI control contract',()=>{
 const schema=JSON.parse(fs.readFileSync('reference/acceleration/registries/master_settings_schema.json','utf8')).settings;
 const controls=JSON.parse(fs.readFileSync('apps/dashboard/lib/generated/settings-controls.json','utf8')).controls;
 const kinds={boolean:'toggle',integer:'number',choice:'select',discord_channel:'channel-select',discord_role:'role-select',json:'json-editor',string:'text'};
 assert.equal(controls.length,schema.length);
 assert.equal(new Set(controls.map(c=>c.key)).size,schema.length);
 for(const setting of schema){
  const control=controls.find(c=>c.key===setting.key);assert.ok(control,setting.key);
  assert.equal(control.kind,kinds[setting.type]??'text',setting.key);
  assert.deepEqual(control.defaultValue,setting.default,setting.key);
  assert.equal(control.dashboardWrite,setting.dashboard_write??(setting.mutable?'draft':'blocked'),setting.key);
  assert.deepEqual(control.dependsOn,setting.depends_on??[],setting.key);
 }
 // Complex values must enter the explicitly read-only specialized-editor path.
 for(const key of ['casino.chair_symbols','casino.slots_wagers','chairisms.excluded_channel_ids'])
  assert.equal(controls.find(c=>c.key===key).kind,'json-editor',key);
});
