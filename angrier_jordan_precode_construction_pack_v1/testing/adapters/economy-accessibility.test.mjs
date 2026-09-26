import test from 'node:test';
import assert from 'node:assert/strict';
import {economyPresentation} from '../../dist/apps/bot/src/discord/economy-presentation.js';
test('image-primary bank removes repeated details while preserving accessible amounts',async()=>{
 const p=await economyPresentation({title:'Bank',description:'Wallet 500; bank 250; tier 1.',imagePrimary:true});
 assert.equal(p.embeds[0].toJSON().description,undefined);
 assert.match(p.files[0].description,/Wallet 500; bank 250; tier 1/);
});
test('details exceeding image accessibility limit retain full native text',async()=>{
 const description='Exact item information '.repeat(60);
 const p=await economyPresentation({title:'Inventory',description,imagePrimary:true});
 assert.equal(p.embeds[0].toJSON().description,description);
});
