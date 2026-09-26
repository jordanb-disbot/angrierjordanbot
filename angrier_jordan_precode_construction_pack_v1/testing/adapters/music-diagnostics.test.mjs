import test from 'node:test';
import assert from 'node:assert/strict';
import {musicDiagnostic} from '../../dist/apps/bot/src/music/music-diagnostics.js';
test('Music diagnostic exposes reviewed boundary category but never secrets or arbitrary provider errors',()=>{
 for(const code of ['LAVALINK_NODE_POLICY','LAVALINK_SOURCE','LAVALINK_TRANSPORT','LAVALINK_SESSION_SETUP','LAVALINK_CONNECTION','LAVALINK_CLOSED','LAVALINK_READY_TIMEOUT','PRIVATE_TOKEN','LAVALINK_PRIVATE_TOKEN',null]){
  const output=musicDiagnostic(Object.assign(Error('PRIVATE_PASSWORD https://secret.invalid/?token=PRIVATE_TOKEN'),{code,cause:{password:'PRIVATE_PASSWORD'}}));
  assert.ok(!/PRIVATE|https:|password|token=/i.test(output));
 }
 assert.match(musicDiagnostic({code:'LAVALINK_NODE_POLICY'}),/^LAVALINK_NODE_POLICY:/);
 assert.equal(musicDiagnostic(null),'MUSIC_BOUNDARY: music operation could not be completed.');
});
