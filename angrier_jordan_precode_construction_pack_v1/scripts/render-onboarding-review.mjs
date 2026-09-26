import fs from 'node:fs';
import sharp from 'sharp';
import {rasterizeSvg} from '../dist/packages/renderer/src/raster.js';
import {learningWindow} from '../dist/packages/features-learning/src/visual.js';
import {renderIntroduction,renderIntroductionHub} from '../dist/packages/features-introductions/src/render.js';
import {renderOnboarding,rulesSections} from '../dist/packages/features-onboarding/src/render.js';
import {fixtureAvatar} from './gate-b-avatar-fixtures.mjs';
const output='review-onboarding',rules=JSON.parse(fs.readFileSync('packages/content/onboarding/rules.json','utf8')),avatar=await fixtureAvatar(0);
fs.mkdirSync(output,{recursive:true});
const fixtures={
 help:learningWindow('Your command directory','ONBOARDING\n/rules  ·  /roles\n\nINTRODUCTIONS\n/introduce\n\nTUTORIAL\n/help  ·  /tutorial\n\nSearch with /help command. Page 1 of 1'),
 tutorial:learningWindow('Show Me Around','LEARNING PATHS\nChoose a subject using the menu below.\n\nYOUR JOURNEY\nLearning path → Lesson → Practice → Progress\n\nPRIVATE & SAFE\nLessons save your place. Practice never spends Ottomans or changes protected server state.'),
 tldr:learningWindow('Chat activity snapshot','CHAT COUNTS · 1h\n\n3 member messages\n5 words\n\nActivity totals only; this does not summarize the conversation.'),
 introduction:renderIntroduction("Name\nExample Member\n\nLocation\nThe mountains\n\nDOC\nPrefer to share privately\n\nHow'd you find the server\nA friend invited me to pull up a chair.\n\nFun fact about you?\nI build tiny furniture for a very opinionated cat.\n\nFavorite type of chair?\nA well-worn wingback by the fireplace.",'Example Member',avatar,true,0,1),
 'introduction-hub':renderIntroductionHub('Your answers stay private until you preview and publish.',['Name','Location','DOC',"How'd you find the server",'Fun fact about you?','Favorite type of chair?']),
 roles:renderOnboarding('Your Place in Chairs','Choose the details that feel like you',[{title:'YOUR ROLES · YOUR CHOICE',body:'Select from the categories below. Clear a selection to remove it. Changes are saved immediately; reopen /roles to see your choices.'},{title:'APPROVED SELF-ASSIGNABLE ROLES',body:'Only configured member roles are available. Staff and protected roles cannot be self-assigned.'}]),
};
for(const [n,section] of rules.sections.entries())for(const [p,page]of rulesSections(section.body).entries())fixtures[`rules-${n+1}-${p+1}`]=renderOnboarding(rules.title,'Our shared space · read before acknowledging',[{title:section.title,body:page[0].body}]);
for(const [name,svg]of Object.entries(fixtures)){const png=await rasterizeSvg(svg);fs.writeFileSync(`${output}/${name}.png`,png);fs.writeFileSync(`${output}/${name}-mobile.png`,await sharp(png).resize({width:390}).png().toBuffer());}
fs.writeFileSync(`${output}/index.html`,'<!doctype html><meta charset="utf-8"><title>Onboarding review</title><style>body{background:#101622;color:#eee;font:18px sans-serif}section{padding:24px}img{max-width:100%;width:900px}</style><h1>Fixture portraits and example answers · live uses member data</h1>'+Object.keys(fixtures).map(n=>`<section><h2>${n}</h2><img src="${n}.png"></section>`).join(''));
console.log(`${Object.keys(fixtures).length*2} desktop/mobile review images rendered.`);
