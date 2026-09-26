import {mkdir,writeFile} from 'node:fs/promises';
import sharp from 'sharp';
import {fixtureAvatar} from './gate-b-avatar-fixtures.mjs';
import {rasterizeSvg} from '../dist/packages/renderer/src/raster.js';
import {renderPremiumFamily,renderFamilyTree,renderFamilyNotice,familyBranches} from '../dist/packages/features-family/src/premium-render.js';
const members=await Promise.all(['Jordan','Ocean','Alex','Sam','Riley','Morgan','Casey'].map(async(name,n)=>({userId:'m'+n,name,avatar:await fixtureAvatar(n%2)})));
const base={id:'HIDDEN_EVENT',guildId:'g',channelId:'bot',state:'CLOSED',createdAt:new Date('2026-09-26T12:00:00Z'),expiresAt:null,type:'family_marriage',data:{kind:'marriage',members:members.slice(0,2),proposalItem:'family.ring',itemEscrow:[{itemId:'family.ring',quantity:1,state:'SETTLED'}],compatibility:88,success:82,marriedAt:'2026-09-26T12:00:00Z',spouseCounts:{m0:1,m1:1},voteResult:{up:8,down:1,total:9,approval:88.89},result:'Married'}};
const event=(type,data={},state='CLOSED')=>renderPremiumFamily({...base,type,state,data:{members:members.slice(0,2),...data}});
const tree={members:members.map(m=>m.userId),marriages:[{id:'pair',userA:'m0',userB:'m1'}],adoptions:members.slice(2).map(m=>({parentPairKey:'pair',parents:['m0','m1'],childUserId:m.userId}))};
const branches=familyBranches(tree,'m0');
const fixtures={
 proposal:renderPremiumFamily({...base,state:'DRAFT',expiresAt:new Date('2026-09-27T12:00:00Z'),data:{kind:'marriage',members:members.slice(0,2),proposalItem:'family.ring',itemEscrow:[{itemId:'family.ring',quantity:1,state:'RESERVED'}],result:'Proposal pending'}}),
 wedding:renderPremiumFamily({...base,state:'OPEN',expiresAt:new Date('2026-09-26T15:00:00Z')}),
 weddingFinal:renderPremiumFamily({...base,data:{...base.data,firstChildBonus:true}}),
 declined:event('family_marriage',{kind:'marriage',proposalItem:'family.ring',itemEscrow:[{itemId:'family.ring',quantity:1,state:'REFUNDED'}],result:'Proposal declined'},'CANCELLED'),
 adoption:event('family_adoption',{kind:'adoption',result:'Adoption request pending'},'DRAFT'),adopted:event('family_adoption',{kind:'adoption',result:'Adoption accepted'}),
 divorce:event('family_divorce',{kind:'divorce',payerId:'m0',receiverId:'m1',amount:'125000',result:'Divorced'}),
 ended:event('family_ended',{kind:'ended',members:[],result:'A member became independent.'}),
 auction:event('family_auction',{kind:'auction',auctionType:'spouse',members:[members[0]],reserve:'50000',result:'Sealed bidding open'},'OPEN'),
 auctionWon:event('family_auction',{kind:'auction',auctionType:'spouse',winnerId:'m1',amount:'87500',result:'Auction finalized'}),
 estate:event('family_estate',{kind:'estate',members:[members[1]],heirId:'m1',executed:true,amount:'125000',assetsTransferred:3,result:'Inheritance executed'}),
 estatePending:event('family_estate',{kind:'estate',members:[],result:'Estate grace period'},'OPEN'),
 estateCanceled:event('family_estate',{kind:'estate',members:[],result:'Estate canceled after return'},'CANCELLED'),
 will:renderFamilyNotice('Your Will Is Saved','Beneficiary: Ocean. Your one-beneficiary will is saved. No assets transfer until estate execution.',members[1]),
 bid:renderFamilyNotice('Your Sealed Bid','Your sealed total bid is 5,000 Ottomans. Other members cannot see it. Bids may only increase and cannot be withdrawn.'),
 error:renderFamilyNotice('Family · Please Review','No eligible marriage currently has an open child slot.'),
 treeCouple:renderFamilyTree({branch:{parents:['m0','m1'],children:[],married:true},members,focus:'m1',page:0,pages:1,total:2,perk:'Midnight Family Portrait'}),
 treeChildren:renderFamilyTree({branch:branches[0],members,focus:'m0',page:0,pages:branches.length,total:7}),
 treeChildrenNext:renderFamilyTree({branch:branches[1],members,focus:'m0',page:1,pages:branches.length,total:7}),
 treeEmpty:renderFamilyTree({branch:{parents:['m0'],children:[],married:false},members,focus:'m0',page:0,pages:1,total:1}),
 extremes:renderFamilyTree({branch:branches[0],members:members.map(m=>({...m,name:'W'.repeat(40),avatar:''})),focus:'m0',page:0,pages:2,total:7,perk:'Emerald Family Portrait'})
};
await mkdir('review-family',{recursive:true});for(const[name,svg]of Object.entries(fixtures)){const png=await rasterizeSvg(svg);await writeFile('review-family/'+name+'.png',png);await writeFile('review-family/'+name+'-mobile.png',await sharp(png).resize({width:360}).png().toBuffer());}
await writeFile('review-family/index.html','<!doctype html><meta charset="utf-8"><title>Family fixture review</title><style>body{background:#141324;color:#f1eef5;font:18px sans-serif;max-width:1200px;margin:auto}img{max-width:100%}.mobile{width:360px}</style><h1>Family · deterministic fixture review</h1><p>Not live Discord screenshots. Chair portraits are deterministic fixture placeholders; live cards use member profile pictures whenever available. Plum, rose and brass Family theme. Deferred relationship/auction/estate branches remain pending live acceptance.</p>'+Object.keys(fixtures).map(name=>`<h2>${name}</h2><img src="${name}.png" alt="${name} fixture"><img class="mobile" src="${name}-mobile.png" alt="${name} mobile fixture">`).join(''));
console.log('Rendered '+Object.keys(fixtures).length*2+' Family fixtures.');
