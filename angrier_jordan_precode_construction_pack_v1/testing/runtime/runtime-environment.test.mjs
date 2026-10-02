import test from 'node:test';
import assert from 'node:assert/strict';
import {validateRuntimeEnvironment} from '../../.test-build/packages/core/src/runtime-environment.js';

const production={
 NODE_ENV:'production',AJ_DATABASE_PURPOSE:'production',PORT:'8080',
 DATABASE_URL:'postgresql://user:pass@postgres.railway.internal:5432/railway',
 DISCORD_TOKEN:'token',DISCORD_APPLICATION_ID:' 1524964384642957432 ',DISCORD_GUILD_ID:' 1524964384642957432 ',
};

test('worker validation accepts pasted whitespace around required Discord IDs',()=>{
 assert.doesNotThrow(()=>validateRuntimeEnvironment(production,'worker'));
});

test('worker derives its application identity after login and still rejects invalid guild IDs',()=>{
 const withoutApplication={...production};delete withoutApplication.DISCORD_APPLICATION_ID;
 assert.doesNotThrow(()=>validateRuntimeEnvironment(withoutApplication,'worker'));
 assert.throws(()=>validateRuntimeEnvironment({...withoutApplication,DISCORD_GUILD_ID:'${{missing.guild}}'},'worker'),/DISCORD_GUILD_ID/);
});
