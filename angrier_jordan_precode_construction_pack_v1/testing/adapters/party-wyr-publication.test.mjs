import test from 'node:test';
import assert from 'node:assert/strict';
import {DiscordWyrCoordinator} from '../../dist/apps/bot/src/discord/wyr-coordinator.js';
import {DomainError} from '../../dist/packages/core/src/index.js';

test('WYR publication survives uncertain edit and restart by completing the original reply',async()=>{
 const session={id:'round',guildId:'g',channelId:'games',messageId:'original',ownerUserId:'host',state:'OPEN',expiresAt:new Date(Date.now()+60000),extensionUsed:false,data:{extensionSeconds:30}};
 const delivery={state:'PENDING'},cards=[],publication={jobForSession:async()=>({id:'job'}),delivery:()=>({read:async()=>({...delivery}),claim:async()=>{if(delivery.state!=='PENDING')return false;delivery.state='SENDING';return true;},complete:async messageId=>{delivery.state='SENT';delivery.messageId=messageId;}})};
 let failAfterEdit=true,sends=0;
 const message={id:'original',author:{id:'bot'},edit:async card=>{cards.push(card);if(failAfterEdit){failAfterEdit=false;throw Error('Response lost after Discord accepted edit');}}};
 const client={user:{id:'bot'},channels:{fetch:async()=>({isSendable:()=>true,messages:{fetch:async id=>{assert.equal(id,'original');return message;}},send:async()=>{sends++;throw Error('No duplicate send permitted');}})}};
 const service={get:async()=>session,close:async()=>{throw new DomainError('NOT_DUE','Still open');},renderOpen:()=>'<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><rect width="20" height="20"/></svg>',attachMessage:async()=>{throw Error('Original message is already saved');}};
 await assert.rejects(()=>new DiscordWyrCoordinator(service,undefined,undefined,publication).publish(client,'round'),/Response lost/);
 assert.equal(delivery.state,'SENDING');
 await new DiscordWyrCoordinator(service,undefined,undefined,publication).publish(client,'round');
 assert.equal(delivery.state,'SENT');assert.equal(delivery.messageId,'original');assert.equal(cards.length,2);assert.equal(sends,0);
 await new DiscordWyrCoordinator(service,undefined,undefined,publication).publish(client,'round');
 assert.equal(cards.length,2);assert.deepEqual(cards[0].allowedMentions,{parse:[]});
});

test('WYR publication never edits a foreign author on its saved message ID',async()=>{
 const service={get:async()=>({id:'round',channelId:'games',messageId:'original'})};
 const publication={jobForSession:async()=>({id:'job'}),delivery:()=>({read:async()=>({state:'SENDING'}),claim:async()=>false,complete:async()=>{throw Error('Must not complete');}})};
 const client={user:{id:'bot'},channels:{fetch:async()=>({isSendable:()=>true,messages:{fetch:async()=>({author:{id:'another-bot'},edit:async()=>{throw Error('Must not edit');}})}})}};
 await assert.rejects(()=>new DiscordWyrCoordinator(service,undefined,undefined,publication).publish(client,'round'),/author mismatch/);
});
