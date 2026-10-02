import test from 'node:test';
import assert from 'node:assert/strict';
import {validateRuntimeEnvironment} from '../../.test-build/packages/core/src/runtime-environment.js';

const production={
 NODE_ENV:'production',AJ_DATABASE_PURPOSE:'production',PORT:'8080',
 DATABASE_URL:'postgresql://user:pass@postgres.railway.internal:5432/railway',
 DISCORD_TOKEN:'token',DISCORD_APPLICATION_ID:' 1524964384642957432 ',DISCORD_GUILD_ID:' 1524964384642957432 ',
};

test('worker validation accepts pasted whitespace around Discord IDs',()=>{
 assert.doesNotThrow(()=>validateRuntimeEnvironment(production,'worker'));
});

test('worker validation still rejects non-numeric Discord IDs',()=>{
 assert.throws(()=>validateRuntimeEnvironment({...production,DISCORD_APPLICATION_ID:'${{missing.application}}'},'worker'),/DISCORD_APPLICATION_ID/);
});
