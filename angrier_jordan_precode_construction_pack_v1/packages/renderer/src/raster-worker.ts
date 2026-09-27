import sharp from 'sharp';
import {createHash} from 'node:crypto';
import {performance} from 'node:perf_hooks';
import {sequenceLayers} from './sequence-layers.js';
import {unpackAnimationAssets} from './animation-assets.js';
const scenes=new Map<string,{data:Buffer;width:number;height:number}>();
async function renderFrame(svg:string){
 const layers=sequenceLayers(svg);
 if(!layers)return sharp(Buffer.from(svg)).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 const key=createHash('sha256').update(layers.background).digest('hex');let scene=scenes.get(key);
 if(!scene){const r=await sharp(Buffer.from(layers.background)).ensureAlpha().raw().toBuffer({resolveWithObject:true});scene={data:r.data,width:r.info.width,height:r.info.height};if(scenes.size>=6)scenes.delete(scenes.keys().next().value!);scenes.set(key,scene);}
 return sharp(scene.data,{raw:{width:scene.width,height:scene.height,channels:4}}).composite([{input:Buffer.from(layers.foreground)}]).raw().toBuffer({resolveWithObject:true});
}
type RenderMessage={id:number;svg?:string;frames?:string[];assets?:string[];delayMs?:number;delaysMs?:number[];oneShot?:boolean;startAtMs?:number};
async function handle(message:RenderMessage){
 try{
  const start=performance.now();let rasterMs=0,encodeMs=0;
  let output:Buffer;
  if(message.frames){
   if(message.frames.length<2||message.frames.length>(message.oneShot?512:32))throw new Error('Frame limit');
   if(message.oneShot&&(!message.delaysMs||message.delaysMs.length!==message.frames.length||message.delaysMs.some(n=>!Number.isInteger(n)||n<10||n>60_000||n%10!==0)))throw new Error('Invalid sequence timing');
   const buffers:Buffer[]=[];let width=0,height=0;
   let artwork=message.assets;
   if(artwork&&message.frames.length>64){
    // Decode each fixed sprite once at its largest displayed size. Re-decoding
    // full source portraits/scenes in hundreds of SVGs dominates render time.
    const sourceWidth=Number(message.frames[0]!.match(/<svg[^>]*\bwidth="(\d+)"/)?.[1]??1200),scale=480/sourceWidth;
    const sizes=new Map<number,{width:number;height:number}>();
    for(const frame of message.frames)for(const match of frame.matchAll(/<image\b[^>]*>/g)){
     const tag=match[0],id=tag.match(/href="aj-animation-asset:(\d+)"/),w=Number(tag.match(/\bwidth="([\d.]+)"/)?.[1]),h=Number(tag.match(/\bheight="([\d.]+)"/)?.[1]);
     if(!id||!w||!h)continue;const key=Number(id[1]),prior=sizes.get(key);sizes.set(key,{width:Math.max(prior?.width??0,Math.ceil(w*scale*1.1)),height:Math.max(prior?.height??0,Math.ceil(h*scale*1.1))});
    }
    artwork=await Promise.all(artwork.map(async(value,id)=>{const size=sizes.get(id);if(!size)return value;const png=await sharp(Buffer.from(value.split(',')[1]!,'base64')).resize({...size,fit:'inside',withoutEnlargement:true}).png().toBuffer();return 'data:image/png;base64,'+png.toString('base64');}));
   }
   for(let svg of message.frames){
    if(artwork)svg=unpackAnimationAssets(svg,artwork);
    // Dense motion is delivered at Discord attachment size, keeping the raw
    // pixel budget near the previous 64-frame 1200px sequence budget.
    if(message.frames.length>64)svg=svg.replace(/(<svg[^>]*\bwidth=")(\d+)(" height=")(\d+)(")/,(_all,a,w,b,h,c)=>a+480+b+Math.round(Number(h)*480/Number(w))+c);
    const r=await renderFrame(svg);if(width&&(r.info.width!==width||r.info.height!==height))throw new Error('Unequal frames');width=r.info.width;height=r.info.height;
    if(width*height*message.frames.length>50_000_000)throw new Error('Animation pixel budget');
    buffers.push(r.data);
   }
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
}
// Keep concurrent event requests within one raw-pixel budget.
let queue=Promise.resolve();
process.on('message',(message:RenderMessage)=>{queue=queue.then(()=>handle(message));});
process.on('disconnect',()=>process.exit(0));
