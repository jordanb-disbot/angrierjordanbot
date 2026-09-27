import fs from 'node:fs';
import sharp from 'sharp';
import {rasterizeSvg} from '../dist/packages/renderer/src/raster.js';
import {learningWindow} from '../dist/packages/features-learning/src/visual.js';
import {renderIntroductionFields,renderIntroductionHub} from '../dist/packages/features-introductions/src/render.js';
import {renderOnboarding,rulesSections} from '../dist/packages/features-onboarding/src/render.js';
import {fixtureAvatar} from './gate-b-avatar-fixtures.mjs';
const output='review-onboarding',rules=JSON.parse(fs.readFileSync('packages/content/onboarding/rules.json','utf8')),avatar=await fixtureAvatar(0);
fs.mkdirSync(output,{recursive:true});
const fixtures={
 help:learningWindow('Your command directory','ONBOARDING\n/rules  ·  /roles\n\nINTRODUCTIONS\n/introduce\n\nTUTORIAL\n/help  ·  /tutorial\n\nSearch with /help command. Page 1 of 1'),
 tutorial:learningWindow('Show Me Around','LEARNING PATHS\nChoose a subject using the menu below.\n\nYOUR JOURNEY\nLearning path → Lesson → Practice → Progress\n\nPRIVATE & SAFE\nLessons save your place. Practice never spends Ottomans or changes protected server state.'),
 tldr:learningWindow('Chat activity snapshot','CHAT COUNTS · 1h\n\n3 member messages\n5 words\n\nActivity totals only; this does not summarize the conversation.'),
 introduction:renderIntroductionFields([
  {label:'What should we call you?',answer:'Example Member'},
  {label:'What is your drug of choice?',answer:'Coffee'},
  {label:'What is your most controversial opinion?',answer:'A reading nook should have two chairs.'},
  {label:'If on death row, what would your last meal be?',answer:'Pasta and cake.'},
  {label:'What is your favorite type of chair?',answer:'A well-worn wingback by the fireplace.'}
 ],'Example Member',avatar,true),
 'introduction-hub':renderIntroductionHub('Your answers stay private until you preview and publish.',['What should we call you?','What is your drug of choice?','What is your most controversial opinion?','If on death row, what would your last meal be?','What is your favorite type of chair?']),
 roles:renderOnboarding('Your Place in Chairs','Choose the details that feel like you',[{title:'YOUR ROLES · YOUR CHOICE',body:'Select from the categories below. Clear a selection to remove it. Changes are saved immediately; reopen /roles to see your choices.'},{title:'APPROVED SELF-ASSIGNABLE ROLES',body:'Only configured member roles are available. Staff and protected roles cannot be self-assigned.'}]),
};
for(const [n,section] of rules.sections.entries())for(const [p,page]of rulesSections(section.body).entries())fixtures[`rules-${n+1}-${p+1}`]=renderOnboarding(rules.title,'Our shared space · read before acknowledging',[{title:section.title,body:page[0].body}]);
for(const [name,svg]of Object.entries(fixtures)){const png=await rasterizeSvg(svg);fs.writeFileSync(`${output}/${name}.png`,png);fs.writeFileSync(`${output}/${name}-mobile.png`,await sharp(png).resize({width:390}).png().toBuffer());}
fs.writeFileSync(`${output}/index.html`,'<!doctype html><meta charset="utf-8"><title>Onboarding review</title><style>body{background:#101622;color:#eee;font:18px sans-serif}section{padding:24px}img{max-width:100%;width:900px}</style><h1>Fixture portraits and example answers · live uses member data</h1>'+Object.keys(fixtures).map(n=>`<section><h2>${n}</h2><img src="${n}.png"></section>`).join(''));
console.log(`${Object.keys(fixtures).length*2} desktop/mobile review images rendered.`);
