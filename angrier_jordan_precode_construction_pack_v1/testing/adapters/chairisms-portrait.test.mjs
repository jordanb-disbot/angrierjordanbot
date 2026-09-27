import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import {fetchChairismMedia} from '../../dist/apps/bot/src/discord/chairisms-security.js';
test('quote portraits retain 512px detail while small source avatars are never enlarged',async()=>{
 for(const size of [128,1024]){
  const bytes=await sharp({create:{width:size,height:size,channels:3,background:'#163331'}}).png().toBuffer();
  const data=await fetchChairismMedia('https://cdn.discordapp.com/avatars/333333333333333333/portrait.png','avatar',async()=>new Response(bytes,{headers:{'content-type':'image/png'}}));
  const meta=await sharp(Buffer.from(data.split(',')[1],'base64')).metadata();
  assert.equal(meta.width,Math.min(size,512));assert.equal(meta.height,Math.min(size,512));
 }
});
