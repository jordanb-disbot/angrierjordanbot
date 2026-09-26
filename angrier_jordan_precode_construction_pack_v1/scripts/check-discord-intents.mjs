import {readFileSync} from 'node:fs';
import {parseEnv} from 'node:util';
import {pathToFileURL} from 'node:url';

// Application access flags are NOT Gateway Identify intent bits.
// https://docs.discord.com/developers/resources/application#application-flags
export function applicationIntentAccess(application){
  const value=application.flags_new??application.flags;
  if(!(typeof value==='string'&&/^\d+$/.test(value))&&!(typeof value==='number'&&Number.isSafeInteger(value)&&value>=0))throw new Error('FLAGS_UNAVAILABLE');
  const flags=BigInt(value),has=bit=>(flags&(1n<<BigInt(bit)))!==0n;
  return {
    members:{full:has(14),limited:has(15)},
    messageContent:{full:has(18),limited:has(19)}
  };
}

export async function diagnoseIntents(env,{fetcher=fetch,write=console.log}={}){
  if(typeof env.DISCORD_TOKEN!=='string'||!env.DISCORD_TOKEN.trim()||env.DISCORD_TOKEN.includes('${')||!/^\d{17,20}$/.test(env.DISCORD_APPLICATION_ID??'')){
    write('FAIL: LOCAL_DISCORD_VALUES_INVALID');return false;
  }
  try{
    const response=await fetcher('https://discord.com/api/v10/oauth2/applications/@me',{
      method:'GET',headers:{Authorization:'Bot '+env.DISCORD_TOKEN},redirect:'error',signal:AbortSignal.timeout(10000)
    });
    if(!response.ok){await response.body?.cancel();write(`FAIL: DISCORD_HTTP_${Number.isInteger(response.status)?response.status:'ERROR'}`);return false;}
    const application=await response.json();
    if(application.id!==env.DISCORD_APPLICATION_ID){write('FAIL: APPLICATION_ID_MISMATCH');return false;}
    write('PASS: Authenticated application matches configured application.');
    let access;try{access=applicationIntentAccess(application);}catch{write('UNKNOWN: Application flags absent or malformed; no toggle conclusion.');return false;}
    let all=true;
    for(const [label,state] of [['Server Members',access.members],['Message Content',access.messageContent]]){
      if(state.full||state.limited)write(`PASS: ${label} access advertised (${state.full?'full':'limited/test-bot'} flag).`);
      else{write(`FAIL: ${label} access not advertised by application flags.`);all=false;}
    }
    write('NOT TESTED: Gateway Identify/READY. No Gateway or voice connection was opened.');
    return all;
  }catch{write('FAIL: DISCORD_NETWORK_OR_RESPONSE_ERROR');return false;}
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  try{
    const env=parseEnv(readFileSync(new URL('../.env.music.local',import.meta.url),'utf8'));
    if(!await diagnoseIntents(env))process.exitCode=1;
  }catch{console.log('FAIL: LOCAL_MUSIC_ENV_UNREADABLE');process.exitCode=1;}
}
