import fs from 'node:fs';
import sharp from 'sharp';
// Mechanical extraction and encoding only. Never calls an image-generation API.
const root='production/event_art/v3/';
await sharp(root+'lounge-source.png').resize(660,990).png().toFile(root+'lounge.png');
for(const [source,columns,rows,side,prefix] of [['race-atlas.png',3,2,300,'race_chair'],['fight-atlas.png',2,2,360,'robo_fighter']]){
 const metadata=await sharp(root+source).metadata(),width=Math.floor(metadata.width/columns),height=Math.floor(metadata.height/rows);
 for(let i=0;i<columns*rows;i++)await sharp(root+source).extract({left:(i%columns)*width,top:Math.floor(i/columns)*height,width,height}).resize(side,side,{fit:'contain',background:{r:0,g:0,b:0,alpha:0}}).png().toFile(root+prefix+'_'+(i+1)+'.png');
}
console.log('Prepared fixed V3 assets from retained source artwork.');
