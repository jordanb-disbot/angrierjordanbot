export type RuntimeRole='worker'|'dashboard'|'migrate';
export type Environment=Record<string,string|undefined>;
export interface RuntimeEnvironment {production:boolean;port:number;databaseUrl:string;dashboardBaseUrl?:string;oauthCallbackUrl?:string;}
export class RuntimeConfigurationError extends Error {}

/** Errors deliberately contain field names only, never credential values or URL parser errors. */
export function validateRuntimeEnvironment(env:Environment,role:RuntimeRole):RuntimeEnvironment{
  const errors=new Set<string>(),production=env.NODE_ENV==='production';
  const required=(key:string,min=1)=>{const value=env[key]??'';if(value.trim().length<min||value.includes('${'))errors.add(key);return value;};
  const databaseUrl=required('DATABASE_URL');
  let database:URL|undefined;
  try{database=new URL(databaseUrl);if(!['postgres:','postgresql:'].includes(database.protocol)||!database.hostname||!database.username||!database.password||database.pathname.length<2)errors.add('DATABASE_URL');}catch{errors.add('DATABASE_URL');}
  const port=Number(env.PORT??'8080');if(!Number.isInteger(port)||port<1||port>65535)errors.add('PORT');
  if(production){
    if(env.TEST_DATABASE_URL)errors.add('TEST_DATABASE_URL (forbidden in production)');
    if(env.AJ_DATABASE_PURPOSE!=='production')errors.add('AJ_DATABASE_PURPOSE');
    if(!database?.hostname.endsWith('.railway.internal'))errors.add('DATABASE_URL (private Railway hostname required)');
    if(env.RAILWAY_PROJECT_NAME==='upbeat-kindness')errors.add('RAILWAY_PROJECT_NAME (test project forbidden)');
  }
  for(const [key,value] of Object.entries(env))if(/^ENABLE_.*_SMOKE$/.test(key)&&value!==undefined&&!['true','false'].includes(value))errors.add(key);
  if(role==='worker'){
    required('DISCORD_TOKEN');
    for(const key of ['DISCORD_APPLICATION_ID','DISCORD_GUILD_ID'])if(!/^\d{17,20}$/.test(required(key)))errors.add(key);
    if(env.ENABLE_FAMILY_SMOKE==='true')required('FAMILY_COMPATIBILITY_SECRET',32);
    if(env.ENABLE_MUSIC_SMOKE==='true'){
      const endpoint=required('LAVALINK_URL');required('LAVALINK_PASSWORD',16);
      for(const key of ['LAVALINK_ALLOW_INSECURE_HTTP','MUSIC_SPOTIFY_METADATA','MUSIC_APPLE_METADATA','MUSIC_DIRECT_AUDIO'])if(env[key]!==undefined&&!['true','false'].includes(env[key]!))errors.add(key);
      try{const url=new URL(endpoint),local=url.hostname==='localhost'||url.hostname.endsWith('.localhost')||url.hostname.endsWith('.internal')||url.hostname==='127.0.0.1'||url.hostname==='[::1]';if(url.username||url.password||url.search||url.hash||url.pathname!=='/'||!(url.protocol==='https:'||!production&&local&&env.LAVALINK_ALLOW_INSECURE_HTTP==='true'&&url.protocol==='http:'))errors.add('LAVALINK_URL');}catch{errors.add('LAVALINK_URL');}
    }
    if(production&&(env.ENABLE_MODERATION_SMOKE==='true'||env.ENABLE_SECURITY_SMOKE==='true'))required('EVIDENCE_ENCRYPTION_KEY',32);
  }
  let dashboardBaseUrl:string|undefined,oauthCallbackUrl:string|undefined;
  if(role==='dashboard'){
    required('DISCORD_OAUTH_CLIENT_SECRET',16);required('DASHBOARD_SESSION_SECRET',32);
    for(const key of ['DISCORD_OAUTH_CLIENT_ID','DISCORD_GUILD_ID'])if(!/^\d{17,20}$/.test(required(key)))errors.add(key);
    const publicBase=required('PUBLIC_DASHBOARD_URL'),callback=required('DISCORD_OAUTH_CALLBACK_URL');
    try{
      const base=new URL(publicBase),cb=new URL(callback);
      if(base.username||base.password||base.search||base.hash||base.pathname!=='/'||!['http:','https:'].includes(base.protocol))errors.add('PUBLIC_DASHBOARD_URL');
      if(production&&(base.protocol!=='https:'||base.hostname.endsWith('.internal')||base.hostname==='localhost'||base.hostname.endsWith('.localhost')||base.hostname.includes(':')||/^\d+\.\d+\.\d+\.\d+$/.test(base.hostname)))errors.add('PUBLIC_DASHBOARD_URL');
      if(cb.origin!==base.origin||cb.pathname!=='/api/auth/discord/callback'||cb.search||cb.hash||cb.username||cb.password)errors.add('DISCORD_OAUTH_CALLBACK_URL');
      dashboardBaseUrl=base.origin;oauthCallbackUrl=cb.href;
    }catch{errors.add('PUBLIC_DASHBOARD_URL / DISCORD_OAUTH_CALLBACK_URL');}
  }
  if(role==='migrate'){
    if(!production)errors.add('NODE_ENV (production migration guard)');
    if(env.AJ_PRODUCTION_MIGRATIONS_APPROVED!=='true')errors.add('AJ_PRODUCTION_MIGRATIONS_APPROVED');
    if(!/^[a-f0-9]{40}$/i.test(env.AJ_MIGRATION_RELEASE??''))errors.add('AJ_MIGRATION_RELEASE');
  }
  if(errors.size)throw new RuntimeConfigurationError('Invalid runtime configuration: '+[...errors].join(', '));
  return {production,port,databaseUrl,...(dashboardBaseUrl?{dashboardBaseUrl}:{}),...(oauthCallbackUrl?{oauthCallbackUrl}:{})};
}
