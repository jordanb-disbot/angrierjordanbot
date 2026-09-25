import sharp from 'sharp';
process.on('message',async(message:{id:number;svg:string})=>{
 try{const png=await sharp(Buffer.from(message.svg)).png().toBuffer();process.send?.({id:message.id,png:png.toString('base64')});}
 catch{process.send?.({id:message.id,error:'SVG rasterization failed.'});}
});
process.on('disconnect',()=>process.exit(0));
