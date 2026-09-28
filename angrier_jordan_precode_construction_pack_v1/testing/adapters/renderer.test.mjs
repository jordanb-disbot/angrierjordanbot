import {rasterizeSvg} from '../../dist/packages/renderer/src/raster.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const {default:sharp}=await import('sharp');
import {FixedClock} from '../../dist/packages/core/src/index.js';
import {InMemoryWyrPromptRepository,InMemoryWyrSessionRepository,SequentialIdGenerator,WyrController,WyrService} from '../../dist/packages/features-wyr/src/index.js';
test('patched Sharp renders the actual deterministic WYR output',async()=>{
 const prompts=JSON.parse(fs.readFileSync(new URL('../../packages/content/golden/wyr_sample.json',import.meta.url),'utf8'));
 const controller=new WyrController(new WyrService(new InMemoryWyrPromptRepository(prompts),new InMemoryWyrSessionRepository(),new FixedClock(new Date('2026-09-25T12:00:00Z')),new SequentialIdGenerator(),{next:()=>0}));
 const view=await controller.start({guildId:'g',channelId:'c',userId:'u',category:'Casual'});
 const render=()=>rasterizeSvg(view.renderAsset);
 const a=await render(),b=await render();assert.deepEqual(a,b);
 const metadata=await sharp(a).metadata();assert.equal(metadata.format,'png');assert.ok(metadata.width>=800);assert.ok(metadata.height>=300);
});
import {renderSpotlight} from '../../dist/packages/features-profiles/src/render.js';
test('Spotlight renders all co-winners with escaped identities and deterministic pixels',async()=>{
 const avatar=await sharp({create:{width:32,height:32,channels:4,background:'#14b8a6'}}).png().toBuffer();
 const winner={name:'Chair <&> Member',avatarData:'data:image/png;base64,'+avatar.toString('base64'),total:'42',lifetimeWins:3,status:'RETAINED',tripleThreat:true};
 const data={weekStart:'2026-09-14',weekEnd:'2026-09-21',activeMembers:2,messages:84,words:200,voiceSeconds:600,categories:['The Loudest Chair','The Wordsmith','Voice of the Lounge'].map(title=>({title,winners:[winner,{...winner,name:'Co-winner'}]}))};
 const svg=renderSpotlight(data);assert.match([...svg.matchAll(/<text[^>]*>(.*?)<\/text>/g)].map(m=>m[1]).join(' '),/Chair &lt;&amp;&gt; Member/);assert.equal((svg.match(/Co-winner/g)??[]).length,3);
 const first=await rasterizeSvg(svg),second=await rasterizeSvg(svg);assert.deepEqual(first,second);const metadata=await sharp(first).metadata();assert.equal(metadata.width,1200);assert.ok(metadata.height>=1300);
});

test('bundled Poppins and Cinzel produce distinct glyphs independent of system fonts',async()=>{
 const svg=family=>'<svg xmlns="http://www.w3.org/2000/svg" width="700" height="100"><text x="10" y="70" font-size="48" font-family="'+family+'">Angrier Jordan 123</text></svg>';
 const [poppins,cinzel]=await Promise.all([rasterizeSvg(svg('Poppins')),rasterizeSvg(svg('Cinzel'))]);assert.notDeepEqual(poppins,cinzel);
});
