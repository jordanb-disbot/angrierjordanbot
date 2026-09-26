import sharp from 'sharp';
const root='production/event_art/v5/';
for(const name of ['lounge-stage','line-countdown','line-powder','race-stage','fight-stage',...Array.from({length:5},(_,i)=>'line-number-'+(i+1))]){
 await sharp(root+name+'.png').resize({width:name.startsWith('line-number')?400:960,withoutEnlargement:true}).png({palette:true,colours:256,dither:0}).toFile(root+name+'-runtime.png');
}
for(const kind of ['cars','robots']){
 const file=root+kind+'.png',meta=await sharp(file).metadata(),width=Math.floor(meta.width/3),height=Math.floor(meta.height/2);
 for(let i=0;i<6;i++)await sharp(file).extract({left:i%3*width,top:Math.floor(i/3)*height,width,height}).resize({width:440}).png({palette:true,colours:256,dither:0}).toFile(root+kind+'-'+(i+1)+'-runtime.png');
}
console.log('Packaged deterministic event artwork.');
