import {readFileSync,writeFileSync} from 'node:fs';
import sharp from 'sharp';
import {renderIntroductionFields,renderIntroductionHub} from '../dist/packages/features-introductions/src/render.js';
import {rasterizeSvg} from '../dist/packages/renderer/src/raster.js';

const avatar='data:image/png;base64,'+readFileSync(new URL('../review-chairisms-polish-v2/fixture-portrait-small.png',import.meta.url)).toString('base64');
const questions=[
 ['What should we call you?','Morgan'],
 ['What is your drug of choice?','Caffeine and an unreasonable amount of iced coffee.'],
 ['What is your most controversial opinion?','The best conversations start when everyone puts their phone down and actually listens.'],
 ['If on death row, what would your last meal be?','A mountain of homemade pasta, garlic bread, tiramisu, and one final espresso.'],
 ['What is your favorite type of chair?','A deep velvet armchair with enough room to disappear into a good book.']
];
const svg=renderIntroductionFields(questions.map(([label,answer])=>({label,answer})),'Morgan',avatar,true,'Welcome to Chairs. Make yourself comfortable.');
const card=await rasterizeSvg(svg);
writeFileSync(new URL('published.png',import.meta.url),card);
writeFileSync(new URL('published-mobile.png',import.meta.url),await sharp(card).resize({width:390}).png().toBuffer());
const hub=await rasterizeSvg(renderIntroductionHub('Answer all five questions in one private form, then preview and publish when ready.',questions.map(([label])=>label)));
writeFileSync(new URL('form.png',import.meta.url),hub);
writeFileSync(new URL('form-mobile.png',import.meta.url),await sharp(hub).resize({width:390}).png().toBuffer());
