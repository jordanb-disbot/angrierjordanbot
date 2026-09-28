import {mkdir,readFile,writeFile} from 'node:fs/promises';
import sharp from 'sharp';
import {rasterizeSvg} from '../dist/packages/renderer/src/raster.js';
import {renderParty,renderPartyDraft} from '../dist/packages/features-party/src/render.js';
import {renderEconomyPresentation} from '../dist/packages/features-economy/src/presentation.js';
import {renderCommunity,superlativeReviewFixture} from '../dist/packages/features-community/src/render.js';
import {renderSocialResponse} from '../dist/packages/features-social/src/render.js';
import {learningWindow} from '../dist/packages/features-learning/src/visual.js';
import {renderActivityCard} from '../dist/apps/bot/src/discord/activity-card.js';
import {renderChairism} from '../dist/packages/features-chairisms/src/render.js';

const out='review-house-style-2026-09-28';await mkdir(out,{recursive:true});
const avatar='data:image/png;base64,'+(await readFile('review-profiles/fixture-profile.png')).toString('base64');
const trio=[{userId:'a',name:'Morgan'},{userId:'b',name:'Riley'},{userId:'c',name:'Alex'}],art=Object.fromEntries(trio.map((m,n)=>[m.userId,{name:m.name,avatarData:avatar,handle:['morgan','riley','alex'][n]}]));
const fmk={id:'fixture',guildId:'fixture',channelId:'fixture',messageId:'fixture',ownerId:'chooser',state:'OPEN',version:3,expiresAt:new Date('2026-09-28T18:00:00Z'),extensionUsed:false,game:'fmk',phase:'vote',category:'Random',prompt:undefined,options:[{id:'agree',text:'Agree'},{id:'disagree',text:'Disagree'}],submissionCount:0,submissions:{},words:[],round:0,trio,assignments:{fuck:'a',marry:'b',kill:'c'},subjectCounters:{a:{fucked:4,married:2,killed:1},b:{fucked:2,married:5,killed:1},c:{fucked:0,married:1,killed:3}}};
const socialPeople=[{id:'1',name:'Morgan',avatarData:avatar},{id:'2',name:'Riley',avatarData:avatar}];
const superlative=superlativeReviewFixture();
const samples={
 'fmk-private':renderPartyDraft({trio,fuck:'a',marry:'b',subjectCounters:fmk.subjectCounters},art,'Jordan'),
 'fmk-vote':renderParty(fmk,{...art,chooser:{name:'Jordan',avatarData:avatar}}),
 'fmk-verdict':renderParty({...fmk,state:'CLOSED',phase:'done',result:{label:'Audience agrees',totals:{agree:8,disagree:2},percentages:{agree:80,disagree:20},total:10,randomResolution:false}},{...art,chooser:{name:'Jordan',avatarData:avatar}}),
 shop:renderEconomyPresentation({title:'Daily Shop',mode:'shop',summary:'3 products · Page 1 / 1 · Daily rotation',cards:[{name:'Buried Lounge Coaster',badge:'COMMON · COLLECTIBLE',motif:'Buried Lounge Coaster',price:'1,200 Ottomans',detail:'A curious find from the lounge.',quantity:'OWNED ×0'},{name:'Emerald Seat',badge:'RARE · CHAIR',motif:'Emerald Seat',price:'8,500 Ottomans',detail:'A brighter place to sit.',quantity:'OWNED ×1'},{name:'Wedding Sack',badge:'FAMILY · GIFT',motif:'Wedding Sack',price:'2,500 Ottomans',detail:'A gift for a special day.',quantity:'OWNED ×0'}]}),
 inventory:renderEconomyPresentation({title:'Your Inventory',mode:'inventory',summary:'3 items · Page 1 / 1',cards:[{name:'Family Ring',badge:'FAMILY · RARE',motif:'Family Ring',detail:'Ready for /family marry.',quantity:'QUANTITY ×1'},{name:'Buried Lounge Coaster',badge:'COMMON · COLLECTIBLE',motif:'Buried Lounge Coaster',detail:'Recovered while digging.',quantity:'QUANTITY ×2'},{name:'Folding Chair',badge:'COMMON · CHAIR',motif:'Folding Chair',detail:'Your first seat.',quantity:'QUANTITY ×1'}]}),
 superlative:renderCommunity(superlative,{'fixture-winner':avatar}),
 poll:renderCommunity({...superlative,kind:'poll',state:'OPEN',phase:'open',title:'Which lounge night?',categories:[],choices:[{id:'a',label:'Games and cocoa'},{id:'b',label:'Film and snacks'}],results:undefined}),
 giveaway:renderCommunity({...superlative,kind:'giveaway',state:'OPEN',phase:'open',title:'A gift from the lounge',categories:[],choices:[],prize:{kind:'custom',label:'A night in the VIP chair'},fee:'0',winnerCount:1,entryCount:12}),
 'social-roast':renderSocialResponse('roast','<@1> challenged <@2> to find a better seat.',{'1':'Morgan','2':'Riley'},socialPeople),
 'social-compliment':renderSocialResponse('compliment','<@1> made the lounge a better place today.',{'1':'Morgan'},socialPeople.slice(0,1)),
 'utility-help':learningWindow('Help','Choose a feature to learn the rules, controls, and what happens next.'),
 'utility-directory':learningWindow('Your command directory','GAMES\n/fight  ·  /wyr  ·  /blackjack\n\nCOMMUNITY\n/chairisms  ·  /introductions  ·  /roles\n\nSearch with /help command. Page 1 of 3.'),
 'utility-activity-snapshot':learningWindow('Chat activity snapshot','CHAT COUNTS · week\n\n128 member messages\n3,680 words\n\nActivity totals only; this does not summarize the conversation.'),
 'moderation-message-edited':renderActivityCard('MESSAGE EDITED','<@Morgan> · <#staff-review> · Jump to message\nBefore\nThe original lounge message.\nAfter\nThe clarified lounge message.','#F4C542'),
 'moderation-message-deleted':renderActivityCard('MESSAGE DELETED','<@Riley> · <#staff-review> · Message 12345\nText\nA deleted message retained for the admin-only activity log.','#B42318'),
 'moderation-member-updated':renderActivityCard('MEMBER UPDATED','<@Alex>\nRole added: Chaise Lounge\nNickname: Alex → Captain Alex','#10B981'),
 chairisms:renderChairism({quote:{userId:'fixture',displayName:'Morgan',text:'I came for the conversation. I stayed for the chair.',timestamp:'2026-09-28T18:00:00Z',avatarDataUri:avatar}},{number:42})
};
const items=[];for(const[name,svg]of Object.entries(samples)){const data=await rasterizeSvg(svg),desktop=name+'-desktop.png',mobile=name+'-mobile.png';await writeFile(out+'/'+desktop,data);await writeFile(out+'/'+mobile,await sharp(data).resize({width:390}).png().toBuffer());items.push({name,desktop,mobile});}
const html='<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><title>Angrier Jordan · House style review</title><style>body{background:#0B1220;color:#E6EAF0;font:18px Inter,Arial,sans-serif;max-width:1220px;margin:auto;padding:24px}h1,h2{font-family:"Space Grotesk",sans-serif}section{padding:18px;margin:24px 0;border:1px solid #374151;border-radius:18px;background:#051822}img{display:block;max-width:100%;height:auto;margin:16px 0}.mobile{width:390px}</style><h1>Same house style · rotating approved accents</h1><p>Fictional local fixtures rendered through runtime code. No production deployment.</p>'+items.map(i=>`<section><h2>${i.name}</h2><img src="${i.desktop}"><details><summary>Mobile width</summary><img class="mobile" src="${i.mobile}"></details></section>`).join('');
await writeFile(out+'/index.html',html);await writeFile(out+'/manifest.json',JSON.stringify({fixture:true,items},null,2)+'\n');console.log(`Rendered ${items.length} desktop/mobile runtime examples in ${out}.`);
