import {mkdir,writeFile} from 'node:fs/promises';
import {performance} from 'node:perf_hooks';
import sharp from 'sharp';
import {fixtureAvatar} from './gate-b-avatar-fixtures.mjs';
import {rasterizeSvg} from '../dist/packages/renderer/src/raster.js';
import {renderPremiumSolo} from '../dist/packages/features-solo/src/premium-render.js';
import {SOLO_TITLES} from '../dist/packages/features-solo/src/render.js';
import {createPuzzle,puzzleView} from '../dist/packages/features-solo/src/domain.js';
import {renderParty,renderPartyDraft} from '../dist/packages/features-party/src/render.js';
import {renderPvp,renderPrivatePvp,renderPvpNotice,PVP_RULES} from '../dist/packages/features-pvp/src/render.js';
import {renderWyrOpen,renderWyrResults} from '../dist/packages/features-wyr/src/render.js';
const fixtures={},art={},members=['Jordan','Ocean','Riley','Morgan'].map((name,n)=>({userId:'member'+n,name}));
for(let n=0;n<members.length;n++)art[members[n].userId]={name:members[n].name,avatarData:await fixtureAvatar(n%2)};
const date=new Date('2026-09-26T12:00:30Z');
for(const game of ['hangman','wordscramble','mastermind','minesweeper']){
 const puzzle=createPuzzle(game,game==='minesweeper'?{boardSize:4}:{},()=>0),base={id:'hidden',guildId:'g',channelId:'games',ownerId:'member0',state:'OPEN',version:0,paid:'0',expiresAt:date};
 fixtures['solo-'+game]=renderPremiumSolo({...base,puzzle:puzzleView(puzzle)},SOLO_TITLES[game],art.member0);
 const won={...puzzle,outcome:'won'};if(game==='mastermind'){won.guesses=[won.code.join('')];won.feedback=[{exact:4,misplaced:0}];}if(game==='minesweeper'){won.mines=[1,4,15];won.revealed=Array.from({length:16},(_,i)=>i).filter(i=>!won.mines.includes(i));}
 fixtures['solo-'+game+'-win']=renderPremiumSolo({...base,state:'CLOSED',paid:'1',puzzle:puzzleView(won)},SOLO_TITLES[game],art.member0);
}
fixtures['solo-minesweeper-5']=renderPremiumSolo({id:'hidden',state:'OPEN',paid:'0',expiresAt:date,puzzle:puzzleView(createPuzzle('minesweeper',{boardSize:5},()=>0))},'Minesweeper',art.member0);
const party={id:'hidden',guildId:'g',channelId:'games',ownerId:'member0',state:'OPEN',version:0,expiresAt:date,extensionUsed:false,game:'truthordare',phase:'choose',category:'Casual',options:[],submissionCount:0,submissions:{},words:[],round:0};
fixtures['truthordare-choose']=renderParty({...party,target:members[0]},art);
fixtures['truthordare-dare']=renderParty({...party,target:members[0],mode:'dare',phase:'answer',prompt:'Give your chair a dramatic acceptance speech.'},art);
fixtures['truthordare-result']=renderParty({...party,target:members[0],state:'CLOSED',phase:'done',mode:'truth',prompt:'What makes this lounge feel like home?',answer:'The people who always save me a seat.'},art);
const opts=[{id:'a',text:'Offer the last seat'},{id:'b',text:'Bring another chair'},{id:'c',text:'Start a standing ovation'}],result={label:'Voting complete',total:8,totals:{a:2,b:5,c:1},percentages:{a:25,b:62.5,c:12.5},randomResolution:false};
fixtures['wwyd-vote']=renderParty({...party,game:'wwyd',phase:'vote',prompt:'The lounge is full when an old friend arrives. What would you do?',options:opts},art);
fixtures['wwyd-result']=renderParty({...party,game:'wwyd',phase:'done',state:'CLOSED',prompt:'An old friend arrives.',options:opts,result},art);
fixtures['finishsentence-choose']=renderParty({...party,game:'finishsentence'},art);
fixtures['finishsentence-submissions']=renderParty({...party,game:'finishsentence',phase:'submissions',prompt:'The empty chair was actually...',submissionCount:3},art);
const entries=[{id:'member1',userId:'member1',text:'...reserved for the cat.'},{id:'member2',userId:'member2',text:'...the quietest judge in the room.'}];
for(const phase of ['vote','runoff','done'])fixtures['finishsentence-'+phase]=renderParty({...party,game:'finishsentence',phase,state:phase==='done'?'CLOSED':'OPEN',prompt:'The empty chair was actually...',options:entries,submissions:{member1:{name:'Ocean',text:entries[0].text},member2:{name:'Riley',text:entries[1].text}},...(phase==='done'?{result:{...result,winnerId:'member1',totals:{member1:5,member2:3},percentages:{member1:62.5,member2:37.5},label:'Winner selected'}}:{})},art);
const story='Once upon a time a velvet chair rolled into the lounge and asked for a window seat';
fixtures['onewordstory']=renderParty({...party,game:'onewordstory',phase:'story',targetLength:50,words:story.split(' ').map((word,i)=>({word,userId:members[i%2].userId,name:members[i%2].name}))},art);
fixtures['onewordstory-long']=renderParty({...party,game:'onewordstory',phase:'story',targetLength:200,words:Array.from({length:160},(_,i)=>({word:story.split(' ')[i%18]??'chair',userId:members[i%2].userId,name:members[i%2].name}))},art);
const trio=members.slice(1),assignments={fuck:'member1',marry:'member2',kill:'member3'},counters={member1:{fucked:3,married:2,killed:1},member2:{fucked:1,married:5,killed:2},member3:{fucked:0,married:2,killed:4}};
fixtures['fmk-private']=renderPartyDraft({trio,fuck:'member1',marry:'member2'},art,'Jordan');
for(const finished of [false,true])fixtures['fmk-'+(finished?'result':'vote')]=renderParty({...party,game:'fmk',phase:finished?'done':'vote',state:finished?'CLOSED':'OPEN',trio,assignments,subjectCounters:counters,options:[{id:'agree',text:'Agree'},{id:'disagree',text:'Disagree'}],...(finished?{result:{label:'Audience agrees',total:8,totals:{agree:6,disagree:2},percentages:{agree:75,disagree:25},randomResolution:false}}:{})},art);
const wyr={id:'hidden',state:'OPEN',expiresAt:date,extensionUsed:false,data:{category:'Friends',question:'Would you rather host the perfect game night or discover a new favourite game?',optionA:'Host a legendary game night',optionB:'Find the next lounge favourite',durationSeconds:30,extensionSeconds:30}};
fixtures['wyr-vote']=renderWyrOpen(wyr,30);fixtures['wyr-result']=renderWyrResults(wyr,{A:5,B:3,total:8,winner:'A'});
const pvp={id:'hidden',guildId:'g',channelId:'games',version:0,state:'OPEN',players:members.slice(0,2),wager:'10',phase:'challenge',turn:0,ready:[false,false],cells:[],shots:[[],[]],expiresAt:date};
for(const game of ['tictactoe','connectfour','battleship'])for(const phase of ['challenge','playing','finished']){
 const cells=Array(game==='connectfour'?42:9).fill(0);if(game==='tictactoe')cells.splice(0,5,1,2,1,2,1);if(game==='connectfour')cells.splice(35,7,1,2,1,2,1,0,0);
 fixtures[game+'-'+phase]=renderPvp({...pvp,game,phase,cells,state:phase==='finished'?'CLOSED':phase==='challenge'?'OPEN':'LOCKED',ready:[true,true],...(phase==='finished'?{result:'win',winnerId:'member0',paid:'20'}:{})},art);
}
fixtures['tictactoe-draw']=renderPvp({...pvp,game:'tictactoe',phase:'finished',state:'CLOSED',result:'draw',paid:'0',cells:[1,2,1,1,2,2,2,1,1]},art);
fixtures['battleship-private']=renderPrivatePvp({id:'hidden',game:'battleship',version:0,phase:'playing',seat:0,turn:0,fleet:[[0,1,2,3,4],[10,11,12,13],[20,21,22],[30,31,32],[40,41]],ownShots:[{cell:3,hit:true,sunk:false},{cell:55,hit:false,sunk:false}],incomingShots:[{cell:11,hit:true,sunk:false}]},art.member0);
fixtures['pvp-rules']=renderPvpNotice('Match Rules',PVP_RULES);
await mkdir('review-games',{recursive:true});const timings=[];
for(const[name,svg]of Object.entries(fixtures)){const start=performance.now(),png=await rasterizeSvg(svg);timings.push(performance.now()-start);await writeFile('review-games/'+name+'.png',png);await writeFile('review-games/'+name+'-mobile.png',await sharp(png).resize({width:360}).png().toBuffer());}
await writeFile('review-games/index.html','<!doctype html><meta charset="utf-8"><title>AJ Games review</title><style>body{background:#0B1220;color:#E6EAF0;font:18px sans-serif;max-width:1200px;margin:auto;padding:24px}img{max-width:100%}.mobile{width:360px}a{color:#8bb7ff}</style><h1>Angrier Jordan · Games review</h1><p>Deterministic fixtures, not live acceptance. Chair portrait placeholders represent runtime member avatars. Native controls sit beneath each frame in Discord; only live relative deadlines remain outside. One Word Story/FM K full multiplayer and deeper PvP money/timeout/refund acceptance remain pending. WYR vote 30s; Finish voting 30s (submission60/runoff30 unchanged); FMK vote60s.</p>'+Object.keys(fixtures).map(name=>`<h2>${name}</h2><img src="${name}.png" alt="${name}"><p>Mobile</p><img class="mobile" src="${name}-mobile.png" alt="${name} mobile">`).join(''));
timings.sort((a,b)=>a-b);console.log(JSON.stringify({images:Object.keys(fixtures).length*2,rasterMedianMs:Math.round(timings[Math.floor(timings.length/2)]),rasterP95Ms:Math.round(timings[Math.floor(timings.length*.95)])}));
