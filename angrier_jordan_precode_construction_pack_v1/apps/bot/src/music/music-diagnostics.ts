/** Operator diagnostics never include exception messages, URLs, payloads or arbitrary codes. */
export function musicDiagnostic(error:unknown):string {
 const code=error&&typeof error==='object'&&'code' in error?error.code:undefined;
 switch(code){
  case 10003:case 10007:case 10065:case 50001:case 50013:return `DISCORD_${code}: Discord context or permissions could not be confirmed.`;
  case 'P1001':case 'P2003':case 'P2021':case 'P2022':case 'P2025':case 'P2028':return `${code}: Music persistence request failed.`;
  case 'LAVALINK_NODE_POLICY':return 'LAVALINK_NODE_POLICY: node sources/plugins do not match the reviewed configuration.';
  case 'LAVALINK_SOURCE':return 'LAVALINK_SOURCE: provider response could not be used.';
  case 'LAVALINK_TRANSPORT':return 'LAVALINK_TRANSPORT: node request failed or exceeded its deadline.';
  case 'LAVALINK_SESSION_SETUP':return 'LAVALINK_SESSION_SETUP: node session setup failed.';
  case 'LAVALINK_CONNECTION':case 'LAVALINK_CLOSED':case 'LAVALINK_READY_TIMEOUT':return 'LAVALINK_CONNECTION: node session is unavailable.';
  default:return error instanceof TypeError?'MUSIC_TYPE_ERROR: adapter operation failed.':'MUSIC_BOUNDARY: music operation could not be completed.';
 }
}
