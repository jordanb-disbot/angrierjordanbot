import {Events} from 'discord.js';
import {normalizeServerBootstrapInput,type ServerBootstrapRepository,type ServerBootstrapSource} from '../../../../packages/core/src/server-bootstrap.js';

export interface ObservedDiscordServer {id:string;name?:string|null;}
export interface DiscordServerBootstrapOptions {maxCachedServers?:number;cacheTtlMs?:number;now?:()=>number;onFailure?:(error:unknown)=>void;}
const record=(value:unknown):Record<string,unknown>|null=>typeof value==='object'&&value!==null?value as Record<string,unknown>:null;
const unavailable=()=>new Error('Server initialization is unavailable; retry the event after recovery.');
/** Bot observations only. Jobs/member input must never invent server records here. */
export class DiscordServerBootstrap {
 #pending=new Map<string,Promise<void>>();#successful=new Map<string,number>();#max:number;#ttl:number;#now:()=>number;
 constructor(private repository:ServerBootstrapRepository,private options:DiscordServerBootstrapOptions={}){
  this.#max=options.maxCachedServers??1000;this.#ttl=options.cacheTtlMs??300000;this.#now=options.now??Date.now;
  if(!Number.isSafeInteger(this.#max)||this.#max<1||this.#max>10000||!Number.isSafeInteger(this.#ttl)||this.#ttl<1||this.#ttl>3600000)throw unavailable();
 }
 ensure(server:ObservedDiscordServer,source:ServerBootstrapSource='bot.event'):Promise<void>{
  // Snapshot/validate before caching: a mutable gateway object cannot change the
  // server identity while another event waits for its durable prerequisite.
  let input;try{input=normalizeServerBootstrapInput({guildId:server.id,...(server.name===undefined?{}:{name:server.name}),source});}catch{return Promise.reject(unavailable());}
  const pending=this.#pending.get(input.guildId);if(pending)return pending;
  const expires=this.#successful.get(input.guildId);if(expires!==undefined&&expires>this.#now()){this.#successful.delete(input.guildId);this.#successful.set(input.guildId,expires);return Promise.resolve();}
  this.#successful.delete(input.guildId);
  const operation=Promise.resolve().then(()=>this.repository.ensure(input)).then(()=>{
   this.#successful.delete(input.guildId);this.#successful.set(input.guildId,this.#now()+this.#ttl);
   while(this.#successful.size>this.#max)this.#successful.delete(this.#successful.keys().next().value!);
  }).catch(error=>{try{this.options.onFailure?.(error);}catch{}throw unavailable();}).finally(()=>{if(this.#pending.get(input.guildId)===operation)this.#pending.delete(input.guildId);});
  this.#pending.set(input.guildId,operation);return operation;
 }
 /** Full barrier: finish every observed server prerequisite before startup work. */
 async census(servers:Iterable<ObservedDiscordServer>):Promise<void>{
  const attempts=[...servers].map(server=>this.ensure(server,'bot.startup')),results=await Promise.allSettled(attempts);if(results.some(result=>result.status==='rejected'))throw unavailable();
 }
 private observed(value:unknown,fallback:unknown=undefined):ObservedDiscordServer|null{
  const guild=record(value),id=guild?.id??fallback;if(id===undefined||id===null)return null;
  if(typeof id!=='string')throw unavailable();return{id,...(typeof guild?.name==='string'?{name:guild.name}:{})};
 }
 async beforeEvent(event:string,args:readonly unknown[]):Promise<void>{
  const first=record(args[0]);let server:ObservedDiscordServer|null=null,required=true;
  switch(event){
   case Events.GuildCreate:server=this.observed(args[0]);break;
   case Events.GuildMemberAdd:case Events.GuildMemberRemove:case Events.GuildBanAdd:case Events.ChannelCreate:server=this.observed(first?.guild);break;
   case Events.GuildAuditLogEntryCreate:server=this.observed(args[1]);break;
   case Events.VoiceStateUpdate:server=this.observed(record(args[1])?.guild);break;
   case Events.MessageCreate:case Events.InteractionCreate:required=false;server=this.observed(first?.guild,first?.guildId);break;
   default:return;
  }
  if(!server){if(required)throw unavailable();return;}
  await this.ensure(server,event===Events.GuildCreate?'bot.guild-create':'bot.event');
 }
 async run<T>(event:string,args:readonly unknown[],work:()=>T|Promise<T>):Promise<T>{await this.beforeEvent(event,args);return work();}
}
