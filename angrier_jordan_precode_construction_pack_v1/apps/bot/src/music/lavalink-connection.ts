import {randomUUID} from 'node:crypto';
import WebSocket from 'ws';
import {LavalinkRestClient,LavalinkBoundaryError,type LavalinkClientOptions} from './lavalink-client.js';
import {parseLavalinkMessage,LAVALINK_MESSAGE_MAX_BYTES,type LavalinkEvent,type LavalinkReady} from './lavalink-events.js';

export interface LavalinkSocket {
 on(event:string,callback:(...args:any[])=>void):unknown;
 close():void;terminate():void;
}
export interface LavalinkConnectionOptions extends Omit<LavalinkClientOptions,'sessionId'> {
 botId:string;
 socketFactory?:(url:string,headers:Record<string,string>)=>LavalinkSocket;
 onEvent:(event:Exclude<LavalinkEvent,{kind:'ready'}>,context:{socketEpoch:string;sequence:number})=>Promise<void>;
 onUnavailable:(code:string)=>void;
 handshakeTimeoutMs?:number;
}
/** One authenticated node session. Reconnect requires explicit recovery; never reuse uncertain writes. */
export class LavalinkConnection {
 #options:LavalinkConnectionOptions;#socket:LavalinkSocket|undefined;#rest:LavalinkRestClient|undefined;
 #epoch=randomUUID();#sequence=0;#events=Promise.resolve();#closed=false;#started=false;#failed=false;#readySeen=false;
 #timer:ReturnType<typeof setTimeout>|undefined;#rejectReady:((error:Error)=>void)|undefined;
 constructor(options:LavalinkConnectionOptions){
  if(!/^[1-9]\d{16,19}$/.test(options.botId))throw new LavalinkBoundaryError('LAVALINK_BOT');
  // Validate the operator endpoint before creating any socket or sending authentication.
  new LavalinkRestClient({...options,sessionId:'pending'});
  if(options.handshakeTimeoutMs!==undefined&&(!Number.isSafeInteger(options.handshakeTimeoutMs)||options.handshakeTimeoutMs<10||options.handshakeTimeoutMs>60000))throw new LavalinkBoundaryError('LAVALINK_TIMEOUT');
  this.#options={...options};
 }
 get socketEpoch(){return this.#epoch;}
 get ready(){return Boolean(this.#rest)&&!this.#closed&&!this.#failed;}
 client(){if(!this.ready||!this.#rest)throw new LavalinkBoundaryError('LAVALINK_NOT_READY');return this.#rest;}
 start():Promise<void>{
  if(this.#started||this.#closed)throw new LavalinkBoundaryError('LAVALINK_ALREADY_STARTED');this.#started=true;
  return new Promise((resolve,reject)=>{
   this.#rejectReady=reject;const endpoint=new URL(this.#options.endpoint);endpoint.protocol=endpoint.protocol==='https:'?'wss:':'ws:';endpoint.pathname='/v4/websocket';
   const headers={Authorization:this.#options.password,'User-Id':this.#options.botId,'Client-Name':'AngrierJordan/1.0'};
   const factory=this.#options.socketFactory??((url:string,auth:Record<string,string>)=>new WebSocket(url,{headers:auth,followRedirects:false,maxPayload:LAVALINK_MESSAGE_MAX_BYTES,handshakeTimeout:this.#options.handshakeTimeoutMs??15000}));
   try{this.#socket=factory(endpoint.href,headers);}catch{this.#fail('LAVALINK_CONNECT');return;}
   this.#timer=setTimeout(()=>this.#fail('LAVALINK_READY_TIMEOUT'),this.#options.handshakeTimeoutMs??15000);
   this.#socket.on('error',()=>this.#fail('LAVALINK_CONNECTION'));
   this.#socket.on('close',()=>{if(!this.#closed)this.#fail('LAVALINK_CLOSED');});
   this.#socket.on('message',(raw:unknown)=>{
    if(this.#closed||this.#failed||!(typeof raw==='string'||raw instanceof Uint8Array))return;
    const sequence=++this.#sequence;let ready:LavalinkReady|undefined;
    const event=parseLavalinkMessage(raw,value=>{ready={...value};});if(!event)return;
    if(event.kind==='ready'){
     if(this.#readySeen||!ready||ready.resumed){this.#fail('LAVALINK_UNEXPECTED_SESSION');return;}
     this.#readySeen=true;const session=ready;
     this.#events=this.#events.then(async()=>{
      if(this.#closed||this.#failed)return;
      const rest=new LavalinkRestClient({...this.#options,sessionId:session.sessionId});
      await rest.updateSession({resuming:false,timeout:60});
      if(this.#closed||this.#failed)return;this.#rest=rest;clearTimeout(this.#timer);this.#rejectReady=undefined;resolve();
     }).catch(()=>this.#fail('LAVALINK_SESSION_SETUP'));return;
    }
    this.#events=this.#events.then(async()=>{if(!this.ready)return;await this.#options.onEvent(event,{socketEpoch:this.#epoch,sequence});}).catch(()=>this.#fail('LAVALINK_EVENT_HANDLING'));
   });
  });
 }
 #fail(code:string){
  if(this.#failed||this.#closed)return;this.#failed=true;this.#rest=undefined;clearTimeout(this.#timer);
  this.#rejectReady?.(new LavalinkBoundaryError(code));this.#rejectReady=undefined;
  try{this.#socket?.terminate();}catch{}
  try{this.#options.onUnavailable(code);}catch{}
 }
 async drain(){await this.#events;}
 close(){if(this.#closed)return;this.#closed=true;this.#rest=undefined;clearTimeout(this.#timer);this.#rejectReady?.(new LavalinkBoundaryError('LAVALINK_CLOSED'));this.#rejectReady=undefined;try{this.#socket?.close();}catch{try{this.#socket?.terminate();}catch{}}}
 toJSON(){return{ready:this.ready};}
}
