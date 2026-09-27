/** Temporary startup telemetry: never serialize error stacks, metadata, requests, or raw messages. */
export function sanitizeStartupError(error:unknown){
 const e=error as {name?:unknown;code?:unknown;errorCode?:unknown;message?:unknown}|null;
 const allowedNames=new Set(['Error','TypeError','RangeError','SyntaxError','RuntimeConfigurationError','PrismaClientKnownRequestError','PrismaClientUnknownRequestError','PrismaClientInitializationError','PrismaClientValidationError','DiscordAPIError','DiscordjsError']);
 const name=typeof e?.name==='string'&&allowedNames.has(e.name)?e.name:'Error';
 const rawCode=e?.code??e?.errorCode;const code=typeof rawCode==='number'?rawCode:typeof rawCode==='string'&&/^(P\d{4}|E[A-Z_]{2,25}|[A-Z][A-Za-z]+Invalid|TokenInvalid|DisallowedIntents)$/.test(rawCode)?rawCode:null;
 const messages:Record<string,string>={P1000:'Database authentication failed',P1001:'Database server unreachable',P1002:'Database connection timed out',P1003:'Database does not exist',P1010:'Database access denied',P1012:'Database schema configuration invalid',P2021:'Required database table missing',P2022:'Required database column missing',P2024:'Database connection pool timed out',P2002:'Database unique constraint violation',P2003:'Database foreign key constraint violation',P2028:'Database transaction failed',ENOENT:'Required file missing',EADDRINUSE:'HTTP port already in use',EACCES:'Access denied','50001':'Discord access missing','50013':'Discord permissions missing','10004':'Discord guild unknown',TokenInvalid:'Discord token invalid',DisallowedIntents:'Discord gateway intents disallowed'};
 const raw=typeof e?.message==='string'?e.message:'';
 let message=messages[String(code)]??'Exception message withheld; inspect the reported stage and code';
 if(['Used disallowed intents','An invalid token was provided.','Missing Access','Missing Permissions','Discord login failed.','Server initialization is unavailable; retry the event after recovery.'].includes(raw))message=raw;
 if(name==='RuntimeConfigurationError'){const fields=raw.match(/\b(?:DISCORD_[A-Z_]+|DATABASE_URL|EVIDENCE_ENCRYPTION_KEY|FAMILY_COMPATIBILITY_SECRET|NODE_ENV|PORT|[A-Z_]+_SMOKE)\b/g);message='Invalid runtime configuration'+(fields?.length?': '+[...new Set(fields)].join(', '):'');}
 return {name,code,message};
}
export class StartupDiagnostics {
 stage='entry';
 mark(stage:string){this.stage=stage;console.info('Bot startup diagnostic',JSON.stringify({stage,event:'start'}));}
 fail(error:unknown){console.error('Bot startup diagnostic',JSON.stringify({stage:this.stage,event:'failed',exception:sanitizeStartupError(error)}));}
 async run<T>(stage:string,work:()=>Promise<T>):Promise<T>{this.mark(stage);try{const result=await work();console.info('Bot startup diagnostic',JSON.stringify({stage,event:'completed'}));return result;}catch(error){this.fail(error);throw error;}}
}
export const startupDiagnostics=new StartupDiagnostics();
