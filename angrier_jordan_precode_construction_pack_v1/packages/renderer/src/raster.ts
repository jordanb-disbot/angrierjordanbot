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
let worker:ChildProcess|undefined;
let sequence=0;
const pending=new Map<number,{resolve:(value:Buffer)=>void;reject:(error:Error)=>void}>();
/** Native font discovery must receive its environment at process startup on Windows. */
function rendererWorker(){
 if(worker)return worker;
 const source=import.meta.url.endsWith('.ts');
 const child=fork(new URL(source?'./raster-worker.ts':'./raster-worker.js',import.meta.url),[],{env:{...process.env,FONTCONFIG_FILE:config,FONTCONFIG_PATH:cache},stdio:['ignore','ignore','inherit','ipc'],execArgv:source?process.execArgv:[]});
 worker=child;
 child.on('message',(message:{id:number;png?:string;error?:string})=>{const request=pending.get(message.id);if(!request)return;pending.delete(message.id);if(message.png)request.resolve(Buffer.from(message.png,'base64'));else request.reject(new Error(message.error??'Rasterization failed.'));if(!pending.size){child.unref();child.channel?.unref();}});
 const fail=()=>{if(worker!==child)return;worker=undefined;for(const request of pending.values())request.reject(new Error('Renderer worker stopped.'));pending.clear();};
 child.on('error',fail);child.on('exit',fail);
 return child;
}
/** All production SVG rasterization uses the bundled approved fonts and deterministic PNG encoding. */
export function rasterizeSvg(svg:string):Promise<Buffer>{
 return new Promise((resolve,reject)=>{const child=rendererWorker(),id=++sequence;pending.set(id,{resolve,reject});child.ref();child.channel?.ref();child.send({id,svg},error=>{if(error)child.kill();});});
}

/** Bounded cosmetic loops only; authoritative values are identical in every frame. */
export function rasterizeLoop(frames:string[],delayMs=50):Promise<Buffer>{
 if(frames.length<2||frames.length>32)throw new Error('Animation frame limit exceeded.');
 return new Promise((resolve,reject)=>{const child=rendererWorker(),id=++sequence;pending.set(id,{resolve,reject});child.ref();child.channel?.ref();child.send({id,frames,delayMs},error=>{if(error)child.kill();});});
}

/** One authoritative sequence, played once. Used by Line; never restarts a countdown. */
export function rasterizeSequence(frames:string[],delaysMs:number[]):Promise<Buffer>{
 if(frames.length<2||frames.length>64||frames.length!==delaysMs.length||delaysMs.some(n=>!Number.isInteger(n)||n<10||n>60_000||n%10!==0))throw new Error('Invalid one-shot animation sequence.');
 return new Promise((resolve,reject)=>{const child=rendererWorker(),id=++sequence;pending.set(id,{resolve,reject});child.ref();child.channel?.ref();child.send({id,frames,delaysMs,oneShot:true},error=>{if(error)child.kill();});});
}

/** Saved event time owns playback. Elapsed frames are removed after rasterization, before encoding. */
export function rasterizeTimeline(frames:string[],delaysMs:number[],startAtMs:number):Promise<Buffer>{
 if(frames.length<2||frames.length>64||frames.length!==delaysMs.length||!Number.isFinite(startAtMs)||delaysMs.some(n=>!Number.isInteger(n)||n<10||n>60_000||n%10!==0))throw new Error('Invalid authoritative animation timeline.');
 return new Promise((resolve,reject)=>{const child=rendererWorker(),id=++sequence;pending.set(id,{resolve,reject});child.ref();child.channel?.ref();child.send({id,frames,delaysMs,startAtMs,oneShot:true},error=>{if(error)child.kill();});});
}
