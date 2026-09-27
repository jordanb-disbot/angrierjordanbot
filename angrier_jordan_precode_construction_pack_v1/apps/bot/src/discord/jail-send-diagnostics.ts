export function sanitizedJailError(error:unknown){
 const e=error as {name?:unknown;code?:unknown;message?:unknown}|null;
 const type=typeof e?.name==='string'&&/^[A-Za-z][A-Za-z0-9_]{0,63}$/.test(e.name)?e.name:'UnknownError';
 const code=typeof e?.code==='number'?e.code:typeof e?.code==='string'&&/^[A-Z][A-Z0-9_]{0,63}$/.test(e.code)?e.code:null;
 const raw=typeof e?.message==='string'?e.message:'';
 // Never emit arbitrary SDK/DB messages: they may contain request bodies or credentials.
 const known=['Missing Permissions','Missing Access','Unknown Member','Unknown Role','Unknown Channel','Invalid Form Body','The server owner cannot be placed in Hotseat.','You cannot place yourself in Hotseat.'];
 let message=known.includes(raw)?raw:'Message withheld (not on diagnostic allowlist)';
 const property=/^Cannot read properties of (undefined|null) \(reading '([A-Za-z_$][A-Za-z0-9_$]{0,63})'\)$/.exec(raw);
 if(property)message=`Cannot read properties of ${property[1]} (reading '${property[2]}')`;
 if(/^Hotseat would not fully contain this member\. \d+ normal channel\(s\) remain visible\.$/.test(raw))message=raw;
 return {type,code,message};
}
let used=false;
export function beginJailDiagnostic(interactionId:string|undefined){
 if(used||process.env.NODE_ENV!=='development'||process.env.JAIL_SEND_DIAGNOSTICS!=='true')return undefined;
 used=true;const state={stage:'start',foldingRemoved:false,jailedAdded:false,hotseatView:null as boolean|null,hotseatSend:null as boolean|null,normalContainment:null as boolean|null,sentenceCreationStarted:false,sentenceCreationCompleted:false,rollbackStarted:false,rollbackCompleted:false};
 return {state,log:(error?:unknown)=>console.info('Jail send diagnostic',JSON.stringify({interactionId,...state,...(error===undefined?{}:{error:sanitizedJailError(error)})}))};
}
