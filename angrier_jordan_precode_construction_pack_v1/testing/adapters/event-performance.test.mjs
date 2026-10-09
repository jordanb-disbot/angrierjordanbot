import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import {DiscordEventsCoordinator} from '../../dist/apps/bot/src/discord/events-coordinator.js';
import {DiscordSpecialCoordinator} from '../../dist/apps/bot/src/discord/special-coordinator.js';
import {sequenceLayers} from '../../dist/packages/renderer/src/sequence-layers.js';
import {rasterizeSvg} from '../../dist/packages/renderer/src/raster.js';
import {presentationKey} from '../../dist/packages/features-events/src/presentation-key.js';
import {renderFight} from '../../dist/packages/features-events/src/fight-render.js';
import {reviewMembers,reviewPlans} from '../../scripts/event-review-fixtures.mjs';
const view={id:'fixture',type:'fight',guildId:'g',channelId:'c',messageId:'m',state:'OPEN',expiresAt:new Date(Date.now()+60000),racers:reviewMembers.slice(0,2),pool:'0',bets:[],extensionUsed:false};

test('Fight uses one prepared GIF instead of repeatedly uploading a card during combat',async()=>{
 let current={...view,state:'LOCKED',combat:{action:{atMs:1400},hp:[91,100],finished:false}},renders=[];const edits=[];
 const c=new DiscordEventsCoordinator({publicView:async()=>current},{},async()=>true);
 c.payload=async v=>{renders.push(v.combat.action.atMs);return{files:[{name:'fight-locked.gif'}],marker:renders.length};};
 const client={user:{id:'bot'},channels:{fetch:async()=>({isTextBased:()=>true,messages:{fetch:async()=>({author:{id:'bot'},attachments:new Map(),edit:async p=>edits.push(p)})}})}};
 await c.refresh(client,'fixture');await c.refresh(client,'fixture');
 current={...current,combat:{action:{atMs:2800},hp:[91,86],finished:false}};await c.refresh(client,'fixture');
 assert.deepEqual(renders,[1400]);assert.equal(edits.length,1);
});

test('scene layer reuse preserves the approved Fight pixels',async()=>{
 const svg=renderFight(view,{waitingMs:30000},'wide'),layers=sequenceLayers(svg);assert.ok(layers);
 const full=await rasterizeSvg(svg),background=await rasterizeSvg(layers.background),foreground=await rasterizeSvg(layers.foreground);
 const expected=await sharp(full).ensureAlpha().raw().toBuffer(),actual=await sharp(background).composite([{input:foreground}]).ensureAlpha().raw().toBuffer();
 let error=0,max=0;for(let i=0;i<actual.length;i++){const delta=Math.abs(expected[i]-actual[i]);error+=delta;max=Math.max(max,delta);}
 assert.ok(error/actual.length<0.5&&max<=3,'only bounded alpha-compositing rounding may differ');
 assert.equal(sequenceLayers('<svg><g opacity=".5"><!--event-scene-end--></g></svg>'),null);
});

test('Line readiness card is one static attachment with saved deadline, not per-second message edits',async()=>{
 const c=new DiscordSpecialCoordinator({}, {},async()=>true),p=await c.payload({id:'fixture',state:'OPEN',ownerId:'fixture-0',members:reviewMembers.map(m=>({...m,status:'ready'})),remainingMs:3000,elapsedMs:0,expiresAt:new Date(Date.now()+3000)});
 assert.equal(p.files[0].name,'line.png');const buffer=p.files[0].attachment,meta=await sharp(buffer,{animated:true}).metadata();
 assert.equal(meta.width,1100);assert.equal(meta.format,'png');assert.equal(meta.pages??1,1);
 assert.equal(buffer.indexOf('NETSCAPE'),-1);
});

test('Line prepares its finale during readiness and rejects a changed member roster',async()=>{
 const c=new DiscordSpecialCoordinator({}, {},async()=>true),v={...view,ownerId:'fixture-0',members:reviewMembers.map(m=>({...m,status:'ready'}))};let renders=0;
 c.payload=async()=>({fixture:++renders});c.prepareFinale(v);await new Promise(resolve=>setImmediate(resolve));
 assert.equal(c.readyFinale(v).fixture,1);c.prepareFinale(v);assert.equal(renders,1);
 assert.equal(c.readyFinale({...v,members:v.members.slice(1)}),undefined);
});

test('late readiness rendering never overwrites the Line finale',async()=>{
 let reads=0;const v={...view,ownerId:'fixture-0',members:[],elapsedMs:9000},edits=[];
 const c=new DiscordSpecialCoordinator({publicView:async()=>({...v,state:++reads===1?'OPEN':'CLOSED'})},{},async()=>true);
 c.prepareFinale=()=>{};c.payload=async value=>({state:value.state});
 const client={user:{id:'bot'},channels:{fetch:async()=>({isTextBased:()=>true,messages:{fetch:async()=>({author:{id:'bot'},edit:async p=>edits.push(p.state)})}})}};
 await c.refresh(client,'fixture');assert.deepEqual(edits,['CLOSED']);
});

test('prepared presentation survives JSONB property ordering and fractional roundoff only',()=>{assert.equal(presentationKey({winner:'a',points:[58.333333333333336]}),presentationKey({points:[58.33333333333334],winner:'a'}));assert.notEqual(presentationKey({winner:'a'}),presentationKey({winner:'b'}));assert.notEqual(presentationKey({points:[58.333]}),presentationKey({points:[58.334]}));});
