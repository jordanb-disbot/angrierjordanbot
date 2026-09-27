import fs from 'node:fs';
import sharp from 'sharp';
import {renderChairism} from '../dist/packages/features-chairisms/src/render.js';
import {renderChairismBrowser,renderChairismNotice} from '../dist/packages/features-chairisms/src/presentation.js';
import {rasterizeSvg} from '../dist/packages/renderer/src/raster.js';


const out='review-chairisms-polish-v2';
fs.mkdirSync(out,{recursive:true});
const portraitPath=`${out}/fixture-portrait-small.png`;
const avatarDataUri=fs.existsSync(portraitPath)?'data:image/png;base64,'+fs.readFileSync(portraitPath).toString('base64'):undefined;
const quote={userId:'fixture-member',displayName:'Morgan',text:'I came for the conversation. I stayed for the chair.',timestamp:'2026-09-27T18:42:00Z',avatarDataUri:avatarDataUri};
const cases={
 short:{quote},
 reply:{quote,reply:{...quote,displayName:'Alex',text:'We saved you the comfortable one.',avatarDataUri:avatarDataUri}},
 image:{quote,imageDataUri:avatarDataUri},
 long:{quote:{...quote,text:'Some evenings you arrive with a story. Other evenings you just need a place to sit and people who understand the silence. Either way, there is always another chair in this lounge.'},layout:'long'},
 'reply-image':{quote,reply:{...quote,displayName:'Alex',text:'We saved you the comfortable one.',avatarDataUri:avatarDataUri},imageDataUri:avatarDataUri},
 'long-name':{quote:{...quote,displayName:'A remarkably long member name that still deserves room',text:'Save a seat.'},reply:{...quote,displayName:'W'.repeat(100),text:'Always.'}},
};
const previews=Object.fromEntries(Object.entries(cases).map(([id,snapshot])=>[id,renderChairism(snapshot,{number:42})]));
previews.archive=renderChairismBrowser([{chairismId:42,createdAt:quote.timestamp,name:quote.displayName,avatarData:quote.avatarDataUri},{chairismId:41,createdAt:quote.timestamp,name:'Alex',avatarData:avatarDataUri}],'recent');
previews.notice=renderChairismNotice('No eligible Chairisms found.');
for(const [id,svg] of Object.entries(previews)){
 const png=await rasterizeSvg(svg);
 fs.writeFileSync(`${out}/${id}.png`,png);
 fs.writeFileSync(`${out}/${id}-mobile.png`,await sharp(png).resize({width:360}).png().toBuffer());
}
fs.writeFileSync(`${out}/index.html`,`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Chairisms polish v2</title><style>body{background:#0b1220;color:#f5eedf;font:16px system-ui;max-width:1100px;margin:32px auto;padding:0 20px}section{margin:36px 0}img{max-width:100%;height:auto}.desktop{width:660px}.mobile{width:360px}p{line-height:1.5;color:#c9c5bb}</style><h1>Chairisms polish v2</h1><p>Actual runtime renderer with fictional members and a generated fictional human portrait. Live quotes use the quoted member’s profile photo. Formatting follows the supplied portrait-and-quotation reference; amber, navy, lounge materials and approved fonts are retained. Not a production screenshot. Owner approval remains pending. No production settings changed.</p>${Object.keys(previews).map(id=>`<section><h2>${id}</h2><img class="desktop" src="${id}.png" alt="${id} desktop preview"><h3>360px mobile</h3><img class="mobile" src="${id}-mobile.png" alt="${id} mobile preview"></section>`).join('')}</html>`);
console.log('PASS: Chairisms polish v2 fixture gallery generated; no production operations.');
