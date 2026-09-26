import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import {avatarData,memberArt} from '../../dist/apps/bot/src/discord/member-art.js';
import {portrait,brandedNotice} from '../../dist/packages/features-events/src/gate-b-visual.js';

test('member portrait enrichment prefers current server avatar and preserves deterministic failure fallback',async()=>{
 const png='data:image/png;base64,'+(await sharp({create:{width:16,height:16,channels:4,background:'#008577'}}).png().toBuffer()).toString('base64');
 let forced=false;
 const client={guilds:{fetch:async()=>({members:{fetch:async input=>{forced=input.force;return{displayName:'Current name',user:{displayName:'Account name'},displayAvatarURL:()=>png};}}})},users:{fetch:async()=>{throw Error('Account fallback should not be needed');}}};
 const result=await memberArt(client,'server','member');assert.equal(forced,true);assert.equal(result.name,'Current name');assert.match(result.avatarData,/^data:image\/png;base64,/);
 const unavailable={guilds:{fetch:async()=>{throw Error('Unavailable');}}};assert.equal(await memberArt(unavailable,'server','member'),undefined);
 const a=portrait('subject','Li','',220,20),b=portrait('subject','Li',undefined,220,20);assert.equal(a,b);assert.match(a,/>LI<\/text>/);
});
test('avatar inputs reject external hosts, vector/data spoofing and oversized data without leaking values',async()=>{
 for(const value of ['http://127.0.0.1/avatar','https://example.com/a.png','data:image/svg+xml;base64,PHN2Zy8+','data:image/png;base64,'+'A'.repeat(1_400_001),'data:image/png;base64,aW52YWxpZA=='])assert.equal(await avatarData(value),'');
 assert.doesNotMatch(portrait('unsafe','<Alex>','https://example.com/a.png',220,20),/href="https/);
 assert.match(brandedNotice('Warning','<Member> & saved state'),/&lt;Member&gt; &amp; saved state/);
});
