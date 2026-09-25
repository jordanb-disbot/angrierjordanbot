import sharp from 'sharp';
process.on('message',async(message:{id:number;svg?:string;frames?:string[];delayMs?:number;delaysMs?:number[];oneShot?:boolean})=>{
 try{
  let output:Buffer;
  if(message.frames){
   if(message.frames.length<2||message.frames.length>(message.oneShot?64:32))throw new Error('Frame limit');
   if(message.oneShot&&(!message.delaysMs||message.delaysMs.length!==message.frames.length||message.delaysMs.some(n=>!Number.isInteger(n)||n<10||n>60_000||n%10!==0)))throw new Error('Invalid sequence timing');
   const buffers:Buffer[]=[];let width=0,height=0;
   for(const svg of message.frames){const r=await sharp(Buffer.from(svg)).ensureAlpha().raw().toBuffer({resolveWithObject:true});if(width&&(r.info.width!==width||r.info.height!==height))throw new Error('Unequal frames');width=r.info.width;height=r.info.height;buffers.push(r.data);}
   output=await sharp(Buffer.concat(buffers),{raw:{width,height:height*buffers.length,channels:4,pageHeight:height}}).gif({delay:message.oneShot?message.delaysMs!:buffers.map(()=>message.delayMs??50),loop:message.oneShot?1:0,colours:256,dither:0,effort:1}).toBuffer();
  }else output=await sharp(Buffer.from(message.svg!)).png().toBuffer();
  process.send?.({id:message.id,png:output.toString('base64')});
 }catch{process.send?.({id:message.id,error:'SVG rasterization failed.'});}
});
process.on('disconnect',()=>process.exit(0));
