import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {fork, type ChildProcess} from 'node:child_process';
const fonts=fileURLToPath(new URL('../fonts/',import.meta.url));
const manifest=JSON.parse(fs.readFileSync(path.join(fonts,'manifest.json'),'utf8')) as {files:{file:string;sha256:string}[]};
for(const entry of manifest.files)if(createHash('sha256').update(fs.readFileSync(path.join(fonts,entry.file))).digest('hex')!==entry.sha256)throw new Error('Bundled renderer font integrity check failed.');
const cache=path.join(os.tmpdir(),'angrier-jordan-font-cache',createHash('sha256').update(fonts+JSON.stringify(manifest)).digest('hex').slice(0,16));fs.mkdirSync(cache,{recursive:true});
const xml=(s:string)=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
const config=path.join(cache,'fonts.conf');fs.writeFileSync(config,`<?xml version="1.0"?><!DOCTYPE fontconfig SYSTEM "fonts.dtd"><fontconfig><dir>${xml(fonts.replaceAll('\\','/'))}</dir><cachedir>${xml(cache.replaceAll('\\','/'))}</cachedir></fontconfig>`);
let sequence=0;
type Pending={resolve:(value:Buffer)=>void;reject:(error:Error)=>void};
type Lane={worker?:ChildProcess|undefined;pending:Map<number,Pending>};
// Each lane is serial and owns at most one child. Long animations must not hold
// entry cards, button replies, or other static attachments behind their frames.
const staticLane:Lane={pending:new Map()},animationLane:Lane={pending:new Map()};
/** Native font discovery must receive its environment at process startup on Windows. */
function rendererWorker(lane:Lane){
 if(lane.worker)return lane.worker;
 const source=import.meta.url.endsWith('.ts');
 const child=fork(new URL(source?'./raster-worker.ts':'./raster-worker.js',import.meta.url),[],{env:{...process.env,FONTCONFIG_FILE:config,FONTCONFIG_PATH:cache},stdio:['ignore','ignore','inherit','ipc'],execArgv:source?process.execArgv:[]});
 lane.worker=child;
 child.on('message',(message:{id:number;png?:string;error?:string})=>{if(lane.worker!==child)return;const request=lane.pending.get(message.id);if(!request)return;lane.pending.delete(message.id);if(message.png)request.resolve(Buffer.from(message.png,'base64'));else request.reject(new Error(message.error??'Rasterization failed.'));if(!lane.pending.size){child.unref();child.channel?.unref();}});
 const fail=()=>{if(lane.worker!==child)return;lane.worker=undefined;for(const request of lane.pending.values())request.reject(new Error('Renderer worker stopped.'));lane.pending.clear();};
 child.on('error',fail);child.on('exit',fail);
 return child;
}
function request(lane:Lane,message:Record<string,unknown>):Promise<Buffer>{
 return new Promise((resolve,reject)=>{
  const child=rendererWorker(lane),id=++sequence;lane.pending.set(id,{resolve,reject});child.ref();child.channel?.ref();
  const failedSend=()=>{const pending=lane.pending.get(id);lane.pending.delete(id);pending?.reject(new Error('Renderer worker communication failed.'));child.kill();};
  try{child.send({id,...message},error=>{if(error)failedSend();});}catch{failedSend();}
 });
}
/** All production SVG rasterization uses the bundled approved fonts and deterministic PNG encoding. */
export function rasterizeSvg(svg:string):Promise<Buffer>{
 return request(staticLane,{svg});
}

/** Bounded cosmetic loops only; authoritative values are identical in every frame. */
export function rasterizeLoop(frames:string[],delayMs=50):Promise<Buffer>{
 if(frames.length<2||frames.length>32)throw new Error('Animation frame limit exceeded.');
 return request(animationLane,{frames,delayMs});
}

/** One authoritative sequence, played once. Used by Line; never restarts a countdown. */
export function rasterizeSequence(frames:string[],delaysMs:number[],assets?:string[]):Promise<Buffer>{
 if(frames.length<2||frames.length>512||frames.length!==delaysMs.length||delaysMs.some(n=>!Number.isInteger(n)||n<10||n>60_000||n%10!==0))throw new Error('Invalid one-shot animation sequence.');
 return request(animationLane,{frames,assets,delaysMs,oneShot:true});
}

/** Saved event time owns playback. Elapsed frames are removed after rasterization, before encoding. */
export function rasterizeTimeline(frames:string[],delaysMs:number[],startAtMs:number,assets?:string[]):Promise<Buffer>{
 if(frames.length<2||frames.length>512||frames.length!==delaysMs.length||!Number.isFinite(startAtMs)||delaysMs.some(n=>!Number.isInteger(n)||n<10||n>60_000||n%10!==0))throw new Error('Invalid authoritative animation timeline.');
 return request(animationLane,{frames,assets,delaysMs,startAtMs,oneShot:true});
}
