import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import {renderEconomyPresentation,economyWrap} from '../../dist/packages/features-economy/src/presentation.js';
import {economyPresentation} from '../../dist/apps/bot/src/discord/economy-presentation.js';

const daily={title:'The Daily Lounge',description:'Three daily rituals. One place to claim them.',sections:[{name:'Claim Daily',value:'250 Ottomans · Streak 8',state:'AVAILABLE NOW'},{name:'Daily Spin',value:'A daily chance at money or items',state:'USED THIS CYCLE'},{name:'Fortune',value:'Your next fortune awaits',state:'AVAILABLE NOW'}]};
test('Economy frames use bundled lounge, approved typography and distinct centered daily sections',()=>{
 const svg=renderEconomyPresentation(daily);
 assert.match(svg,/width="1100" height="620"/);assert.match(svg,/data:image\/png;base64/);
 assert.match(svg,/Space Grotesk/);assert.match(svg,/Inter/);
 for(const accent of ['#10b981','#f4c542','#a469e2'])assert.ok(svg.includes(accent));
 for(const name of ['Claim Daily','Daily Spin','Fortune','AVAILABLE NOW','USED THIS CYCLE'])assert.ok(svg.includes(name));
 assert.equal((svg.match(/data-economy-section/g)??[]).length,3);assert.doesNotMatch(svg,/<text(?![^>]*text-anchor="middle")/);
});
test('Bounded summaries wrap long names, escape markup and preserve native exact values',async()=>{
 const exact='999,999,999,999,999,999,999 Ottomans',id='owned_very_long_item_identifier_12345678901234567890';
 const input={title:'Inventory <fixture>',description:id,fields:[{name:'Very long member name '.repeat(5),value:exact}]};
 const svg=renderEconomyPresentation(input);assert.ok(svg.includes('&lt;fixture&gt;'));assert.ok(!svg.includes('<fixture>'));
 for(const line of economyWrap('a'.repeat(200)+' a long member name',20,3))assert.ok(line.length<=20);
 const payload=await economyPresentation(input),embed=payload.embeds[0].toJSON();
 assert.equal(embed.description,id);assert.equal(embed.fields[0].value,exact);
 assert.equal(embed.image.url,'attachment://economy-window.png');assert.deepEqual(payload.attachments,[]);
 const metadata=await sharp(payload.files[0].attachment).metadata();assert.equal(metadata.width,1100);assert.equal(metadata.height,620);
 const mobile=await sharp(payload.files[0].attachment).resize({width:360}).png().toBuffer();const mobileMeta=await sharp(mobile).metadata();assert.equal(mobileMeta.width,360);assert.equal(mobileMeta.height,203);
});
test('Dense six-section inventory and empty collection remain bounded and deterministic',()=>{
 const input={title:'Collection',fields:Array.from({length:20},(_,i)=>({name:'Collection '+i,value:'Discovered pieces and progress '.repeat(15)}))};
 const a=renderEconomyPresentation(input);assert.equal((a.match(/data-economy-section/g)??[]).length,6);assert.equal(a,renderEconomyPresentation(input));
 assert.match(renderEconomyPresentation({title:'Inventory',description:'No items yet.'}),/No items yet\./);
});

test('Purpose-built product and collection cards expose bounded names, distinct motifs and large type',()=>{
 const cards=[['Folding Chair','folding chair'],['Barstool','stool'],['Recliner','recliner chair'],['Chaise Lounge','chaise chair'],['Throne','throne'],['Undiscovered','hidden']].map(([name,motif])=>({name,motif,detail:'Owned 1 · Discovered',badge:'COLLECTIBLE'}));
 const svg=renderEconomyPresentation({title:'Five Seats',mode:'collection',summary:'5 / 6 discovered',cards});
 assert.equal((svg.match(/data-item-card=/g)??[]).length,6);
 for(const card of cards)assert.ok(svg.includes(`data-item-motif="${card.motif}"`));
 assert.ok(svg.includes('font-size="28" font-weight="700"'));
 assert.ok(svg.includes('font-size="24" font-weight="600"'));
 assert.doesNotMatch(svg,/The lounge ledger/);
 assert.equal(svg,renderEconomyPresentation({title:'Five Seats',mode:'collection',summary:'5 / 6 discovered',cards}));
});
test('Shop and workshop retain empty-state instructions without inventing products',()=>{
 for(const mode of ['shop','inventory','collection','craft']){
  const svg=renderEconomyPresentation({title:mode,mode,cards:[],description:'Find a recipe through normal play.'});
  assert.ok(svg.includes('Find a recipe through normal play.'));assert.equal((svg.match(/data-item-card=/g)??[]).length,0);
 }
});
