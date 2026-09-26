import fs from 'node:fs';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import {renderFamily,familyDescription} from '../dist/packages/features-family/src/render.js';
import {renderCrime,crimeDescription} from '../dist/packages/features-crime/src/render.js';
import {renderParty,partyTranscript} from '../dist/packages/features-party/src/render.js';
import {rasterizeSvg} from '../dist/packages/renderer/src/raster.js';
const output=new URL('../review-gate-b/family-events/',import.meta.url);fs.mkdirSync(output,{recursive:true});
const avatar=async initials=>'data:image/png;base64,'+(await rasterizeSvg(`<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128"><rect width="128" height="128" fill="#0B1220"/><circle cx="64" cy="64" r="54" fill="#10383F" stroke="#F4C542"/><text x="64" y="81" fill="#E6EAF0" font-family="Space Grotesk" font-size="42" text-anchor="middle">${initials}</text></svg>`)).toString('base64');
const members=[{userId:'fixture-alex',name:'Alex Morgan',avatar:await avatar('AM')},{userId:'fixture-sam',name:'Sam Rivera',avatar:await avatar('SR')}];
const base={id:'fixture',guildId:'fixture',channelId:'fixture',messageId:'fixture',ownerId:'fixture-alex',state:'CLOSED',version:2,createdAt:new Date('2026-09-25T18:00:00Z'),expiresAt:null};
const family={
 marriage:{...base,type:'family_marriage',data:{kind:'marriage',members,marriedAt:'2026-09-25T18:00:00Z',proposalItem:'family.ring',compatibility:87,success:79,blessingConsumed:false,spouseCounts:{'fixture-alex':1,'fixture-sam':1},voteResult:{up:18,down:2,total:20,approval:90},firstChildBonus:true,result:'Married · community vote complete'}},
 divorce:{...base,type:'family_divorce',data:{kind:'divorce',members,payerId:'fixture-alex',receiverId:'fixture-sam',amount:'125000',result:'Divorced'}},
 inheritance:{...base,type:'family_estate',data:{kind:'estate',members,departedId:'fixture-alex',heirId:'fixture-sam',amount:'428750',assetsTransferred:12,executed:true,result:'Inheritance executed'}},
 'auction-win':{...base,type:'family_auction',data:{kind:'auction',members,auctionType:'spouse',reserve:'50000',winnerId:'fixture-sam',amount:'87500',result:'Auction complete'}}
};
const arrest={...base,robber:members[0],victim:members[1],success:true,stolen:'2400',returned:true,reports:3,caught:true,bail:'7200',sentenceId:'fixture-sentence',jailActive:true,fightBackEndsAt:'2026-09-25T18:01:00Z',reportEndsAt:'2026-09-25T18:03:00Z'};
const partyBase={...base,phase:'done',category:'Random',extensionUsed:false,submissionCount:0,submissions:{},words:[],round:2};
const fmk={...partyBase,game:'fmk',trio:[...members,{userId:'fixture-casey',name:'Casey Lee'}],assignments:{fuck:'fixture-alex',marry:'fixture-sam',kill:'fixture-casey'},subjectCounters:{'fixture-alex':{fucked:4,married:2,killed:1},'fixture-sam':{fucked:1,married:6,killed:2},'fixture-casey':{fucked:3,married:2,killed:5}},options:[{id:'agree',text:'Agree'},{id:'disagree',text:'Disagree'}],result:{label:'The lounge agrees · 80% agreement',totals:{agree:16,disagree:4},percentages:{agree:80,disagree:20}}};
const vote={...partyBase,game:'wwyd',prompt:'The lounge finds a sealed mystery box. What would you do?',options:[{id:'open',text:'Open it together'},{id:'wait',text:'Wait for the owner'},{id:'inspect',text:'Inspect the label first'}],result:{label:'The lounge chose: Open it together',winnerId:'open',totals:{open:12,wait:5,inspect:3},percentages:{open:60,wait:25,inspect:15}}};
const entries=[...Object.entries(family).map(([name,fixture])=>({name,fixture,render:renderFamily,transcript:familyDescription,source:'packages/features-family/src/render.ts'})),{name:'arrest',fixture:arrest,render:v=>renderCrime(v,members[0].avatar),transcript:crimeDescription,source:'packages/features-crime/src/render.ts'},{name:'fmk-result',fixture:fmk,render:renderParty,transcript:partyTranscript,source:'packages/features-party/src/render.ts'},{name:'voting-result',fixture:vote,render:renderParty,transcript:partyTranscript,source:'packages/features-party/src/render.ts'}];
const manifest=[];
for(const entry of entries){const png=await rasterizeSvg(entry.render(entry.fixture));for(const [size,width] of [['desktop',440],['mobile',360]]){const file=entry.name+'-'+size+'.png',buffer=await sharp(png).resize({width}).png().toBuffer();fs.writeFileSync(new URL(file,output),buffer);manifest.push({file,sha256:createHash('sha256').update(buffer).digest('hex'),renderer:entry.source,rendererSha256:createHash('sha256').update(fs.readFileSync(entry.source)).digest('hex')});}fs.writeFileSync(new URL(entry.name+'-fixture.json',output),JSON.stringify(entry.fixture,null,2)+'\n');fs.writeFileSync(new URL(entry.name+'-transcript.txt',output),entry.transcript(entry.fixture)+'\n');}
fs.writeFileSync(new URL('manifest.json',output),JSON.stringify({kind:'actual-production-renderer-fixtures',fictionalMembers:true,liveDiscordCapture:false,files:manifest},null,2)+'\n');
console.log('Seven Family/Crime/Party runtime states rendered for desktop and mobile.');
