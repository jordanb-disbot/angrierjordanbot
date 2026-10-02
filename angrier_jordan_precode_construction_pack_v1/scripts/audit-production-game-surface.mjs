import {pathToFileURL} from 'node:url';
import {productionTarget,GUILD} from './audit-production-race-line.mjs';

export const INTERACTIVE_GAME_FEATURES=[
 ['Casino and Lottery',['features.casino','features.lottery']],
 ['Solo games',['features.solo_games']],
 ['Skill games',['features.pvp']],
 ['Race',['features.race']],
 ['Fight',['features.fight']],
 ['Party games and WYR',['features.party_games']],
 ['Special commands',['features.special_commands','special_commands.enabled']],
 ['Line',['features.line']],
];
export const DEDICATED_GAME_CHANNELS=[
 ['One Word Story','channels.one_word_story_channel'],
 ['Counting','channels.counting_channel'],
 ['Last Letter','channels.last_letter_channel'],
];

const snowflake=value=>typeof value==='string'&&/^\d{17,20}$/.test(value);

/** Pure evaluation keeps the production pass read-only and easy to test. */
export function evaluateGameSurface(values){
 const shared={gamingChair:values['channels.games_channel'],botsDontSit:values['channels.bot_channel']};
 const sharedReady=snowflake(shared.gamingChair)&&snowflake(shared.botsDontSit)&&shared.gamingChair!==shared.botsDontSit;
 const interactive=INTERACTIVE_GAME_FEATURES.map(([label,keys])=>({label,keys,enabled:keys.every(key=>values[key]===true)}));
 const dedicated=DEDICATED_GAME_CHANNELS.map(([label,key])=>({label,key,channelId:values[key],enabled:values['features.channel_games']===true,configured:snowflake(values[key])}));
 return {shared,sharedReady,interactive,dedicated};
}

export async function inspectGameSurface(db,definitions){
 const keys=[
  'channels.games_channel','channels.bot_channel','features.channel_games',
  ...INTERACTIVE_GAME_FEATURES.flatMap(([,featureKeys])=>featureKeys),
  ...DEDICATED_GAME_CHANNELS.map(([,key])=>key),
 ];
 const values=await db.$transaction(async tx=>{
  await tx.$executeRawUnsafe('SET TRANSACTION READ ONLY');
  const rows=await tx.configValue.findMany({where:{guildId:GUILD,key:{in:keys}},select:{key:true,value:true}});
  return Object.fromEntries(keys.map(key=>[key,rows.find(row=>row.key===key)?.value??definitions.find(definition=>definition.key===key)?.default]));
 },{timeout:15000});
 return evaluateGameSurface(values);
}

export async function main(env=process.env,{connect,definitions,write=console.log,error=console.error}={}){
 let db;
 try{
  const target=productionTarget(env);
  db=connect?await connect(target):new (await import('@prisma/client')).PrismaClient({datasourceUrl:target.databaseUrl,log:[]});
  const found=await db.$transaction(async tx=>{await tx.$executeRawUnsafe('SET TRANSACTION READ ONLY');return tx.guild.findUnique({where:{id:GUILD},select:{id:true}});});
  if(!found)throw Error('PRODUCTION_GUILD_MISSING');
  const schema=definitions??(await import('../dist/packages/contracts/src/generated/settings.js')).SETTINGS;
  const report=await inspectGameSurface(db,schema);
  if(!report.sharedReady)throw Error('INTERACTIVE_GAME_CHANNELS_INVALID');
  write(`PASS: shared interactive channels verified: Gaming Chair=${report.shared.gamingChair}, Bots Don’t Sit=${report.shared.botsDontSit}.`);
  for(const item of report.interactive)write(`${item.enabled?'PASS':'WARN'}: ${item.label} ${item.enabled?'is enabled in both shared game channels.':'is disabled or incomplete; no command is enabled by this audit.'}`);
  for(const item of report.dedicated)write(`${item.enabled&&item.configured?'PASS':'WARN'}: ${item.label} ${item.enabled&&item.configured?`uses dedicated channel ${item.channelId}.`:'is disabled or its dedicated channel is not configured.'}`);
  write('PASS: game-surface audit finished read-only; no configuration or balances were changed.');
 }catch(cause){
  const safe=/^[A-Z][A-Z0-9_]+$/.test(cause?.message??'')?cause.message:'PRODUCTION_GAME_SURFACE_AUDIT_FAILED';
  error(`FAIL: ${safe}. No exception details displayed.`);return 1;
 }finally{if(db)try{await db.$disconnect();}catch{error('FAIL: DATABASE_DISCONNECT_FAILED.');return 1;}}
 return 0;
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)process.exitCode=await main();
