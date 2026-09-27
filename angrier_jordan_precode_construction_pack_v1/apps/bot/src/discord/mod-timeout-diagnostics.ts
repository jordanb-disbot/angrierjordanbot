import {sanitizedJailError} from './jail-send-diagnostics.js';
let used=false;
export function beginTimeoutDiagnostic(interactionId:string){
 if(used||process.env.NODE_ENV!=='development'||process.env.MOD_TIMEOUT_DIAGNOSTICS!=='true')return undefined;
 used=true;
 return (stage:string,result:string,error?:unknown,seconds?:number)=>console.info('Moderation timeout diagnostic',JSON.stringify({interactionId,stage,result,...(seconds===undefined?{}:{seconds}),...(error===undefined?{}:{error:sanitizedJailError(error)})}));
}
