import test from 'node:test';
import assert from 'node:assert/strict';
import {musicDiagnostic,musicTrace} from '../../dist/apps/bot/src/music/music-diagnostics.js';
test('Music diagnostic exposes reviewed boundary category but never secrets or arbitrary provider errors',()=>{
 for(const code of ['LAVALINK_NODE_POLICY','LAVALINK_SOURCE','LAVALINK_TRANSPORT','LAVALINK_SESSION_SETUP','LAVALINK_CONNECTION','LAVALINK_CLOSED','LAVALINK_READY_TIMEOUT','PRIVATE_TOKEN','LAVALINK_PRIVATE_TOKEN',null]){
  const output=musicDiagnostic(Object.assign(Error('PRIVATE_PASSWORD https://secret.invalid/?token=PRIVATE_TOKEN'),{code,cause:{password:'PRIVATE_PASSWORD'}}));
  assert.ok(!/PRIVATE|https:|password|token=/i.test(output));
 }
 assert.match(musicDiagnostic({code:'LAVALINK_NODE_POLICY'}),/^LAVALINK_NODE_POLICY:/);
 assert.equal(musicDiagnostic(null),'MUSIC_BOUNDARY: music operation could not be completed.');
});

test('Music trace projects only reviewed stages, public IDs and fixed failure categories',()=>{
 const lines=[],original=console.info;console.info=line=>lines.push(line);
 try{musicTrace('voice.join.failure',{guildId:'111111111111111111',channelId:'222222222222222222',phase:'selection.read',error:Object.assign(new Error('PRIVATE_TOKEN'),{code:'VOICE_TIMEOUT'}),token:'PRIVATE_TOKEN',sessionId:'PRIVATE_SESSION',endpoint:'https://private.invalid'});musicTrace('PRIVATE_STAGE',{guildId:'111111111111111111'});musicTrace('member.voice.detected',{guildId:'PRIVATE_TOKEN',channelId:'PRIVATE_URL'});}finally{console.info=original;}
 assert.equal(lines.length,2);assert.match(lines[0],/111111111111111111/);assert.match(lines[0],/222222222222222222/);assert.match(lines[0],/VOICE_TIMEOUT/);assert.ok(!/PRIVATE|sessionId|endpoint|token/i.test(lines.join('\n')));assert.equal(lines[1],'Music trace: member.voice.detected {}');
});

test('Recording traces hash stable references and discard secret URLs and arbitrary status values',t=>{
 const lines=[];t.mock.method(console,'info',line=>lines.push(line));const reference='https://music.youtube.com/watch?v=aaaaaaaaaaa';musicTrace('autocomplete.choice',{reference});musicTrace('provider.load.result',{reference,loadType:'track',status:200});musicTrace('provider.load.result',{reference:'https://user:PRIVATE@youtube.com/watch?v=aaaaaaaaaaa',loadType:'PRIVATE',status:999});
 const rows=lines.map(line=>JSON.parse(line.slice(line.indexOf('{'))));assert.equal(rows[0].identity,rows[1].identity);assert.match(rows[0].identity,/^[a-f0-9]{16}$/);assert.equal(rows[0].provider,'youtube_music');assert.equal(rows[1].status,'200');assert.deepEqual(rows[2],{});assert.doesNotMatch(lines.join(' '),/PRIVATE|https:|aaaaaaaaaaa/);
});
