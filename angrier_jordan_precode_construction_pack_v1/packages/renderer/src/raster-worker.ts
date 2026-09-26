import sharp from 'sharp';
import {createHash} from 'node:crypto';
import {performance} from 'node:perf_hooks';
import {sequenceLayers} from './sequence-layers.js';
const scenes=new Map<string,{data:Buffer;width:number;height:number}>();
async function renderFrame(svg:string){
 const layers=sequenceLayers(svg);
 if(!layers)return sharp(Buffer.from(svg)).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 const key=createHash('sha256').update(layers.background).digest('hex');let scene=scenes.get(key);
 if(!scene){const r=await sharp(Buffer.from(layers.background)).ensureAlpha().raw().toBuffer({resolveWithObject:true});scene={data:r.data,width:r.info.width,height:r.info.height};if(scenes.size>=6)scenes.delete(scenes.keys().next().value!);scenes.set(key,scene);}
 return sharp(scene.data,{raw:{width:scene.width,height:scene.height,channels:4}}).composite([{input:Buffer.from(layers.foreground)}]).raw().toBuffer({resolveWithObject:true});
}
process.on('message',async(message:{id:number;svg?:string;frames?:string[];delayMs?:number;delaysMs?:number[];oneShot?:boolean;startAtMs?:number})=>{
 try{
  const start=performance.now();let rasterMs=0,encodeMs=0;
  let output:Buffer;
  if(message.frames){
   if(message.frames.length<2||message.frames.length>(message.oneShot?64:32))throw new Error('Frame limit');
   if(message.oneShot&&(!message.delaysMs||message.delaysMs.length!==message.frames.length||message.delaysMs.some(n=>!Number.isInteger(n)||n<10||n>60_000||n%10!==0)))throw new Error('Invalid sequence timing');
   const buffers:Buffer[]=[];let width=0,height=0;
   for(const svg of message.frames){const r=await renderFrame(svg);if(width&&(r.info.width!==width||r.info.height!==height))throw new Error('Unequal frames');width=r.info.width;height=r.info.height;buffers.push(r.data);}
   rasterMs=performance.now()-start;
   let delays=message.oneShot?[...message.delaysMs!]:buffers.map(()=>message.delayMs??50);
   if(message.startAtMs!==undefined){
    if(!message.oneShot||!Number.isFinite(message.startAtMs))throw new Error('Invalid timeline origin');
    let elapsed=Math.max(0,Date.now()-message.startAtMs),skip=0;
    while(skip<buffers.length-1&&elapsed>=delays[skip]!){elapsed-=delays[skip]!;skip++;}
    buffers.splice(0,skip);delays=delays.slice(skip);delays[0]=Math.max(10,Math.ceil((delays[0]!-elapsed)/10)*10);
   }
   output=await sharp(Buffer.concat(buffers),{raw:{width,height:height*buffers.length,channels:4,pageHeight:height}}).gif({delay:delays,loop:message.oneShot?1:0,colours:256,dither:0,effort:1}).toBuffer();
   encodeMs=performance.now()-start-rasterMs;
  }else output=await sharp(Buffer.from(message.svg!)).png().toBuffer();
  if(process.env.EVENT_PERF==='1')console.error(JSON.stringify({scope:'event-render',frames:message.frames?.length??1,rasterMs:Math.round(rasterMs),encodeMs:Math.round(encodeMs),totalMs:Math.round(performance.now()-start),bytes:output.length}));
  process.send?.({id:message.id,png:output.toString('base64')});
 }catch{process.send?.({id:message.id,error:'SVG rasterization failed.'});}
});
process.on('disconnect',()=>process.exit(0));
