import {pathToFileURL} from 'node:url';

const GUILD='1524964384642957432';
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
export function productionBackfillTarget(env){
 if(env.NODE_ENV!=='production'||env.AJ_DATABASE_PURPOSE!=='production'||env.DISCORD_GUILD_ID!==GUILD)throw new Error('INVALID_PRODUCTION_TARGET');
 const url=new URL(env.DATABASE_URL);if(!['postgres:','postgresql:'].includes(url.protocol)||!url.hostname.endsWith('.railway.internal'))throw new Error('PRIVATE_POSTGRES_REQUIRED');
 if(typeof env.DISCORD_TOKEN!=='string'||!env.DISCORD_TOKEN.trim())throw new Error('DISCORD_TOKEN_REQUIRED');return{guildId:GUILD,databaseUrl:env.DATABASE_URL,token:env.DISCORD_TOKEN};
}
const missing=error=>error?.code===10008;
const cdnAvatar=(user,member)=>{
 const hash=member?.avatar??user.avatar;
 if(hash)return member?.avatar?`https://cdn.discordapp.com/guilds/${member.guild_id}/users/${user.id}/avatars/${hash}.png?size=256`:`https://cdn.discordapp.com/avatars/${user.id}/${hash}.png?size=256`;
 return `https://cdn.discordapp.com/embed/avatars/${Number(BigInt(user.id)>>22n)%6}.png`;
};
const asUser=(user,member)=>({id:user.id,username:user.username,displayName:user.global_name??user.username,displayAvatarURL:()=>cdnAvatar(user,member)});
const restPayload=payload=>({body:{...payload,components:payload.components?.map(component=>component.toJSON?.()??component),files:undefined},files:payload.files?.map(file=>({data:file.attachment,name:file.name,description:file.description}))});
/** A deliberately gateway-free facade for the renderers' small Discord read surface. */
export async function createRestClient(token,{Rest,Routes}){
 const rest=new Rest({version:'10'}).setToken(token),me=await rest.get(Routes.user('@me'));
 const message=async(channelId,messageId)=>{const value=await rest.get(Routes.channelMessage(channelId,messageId));return{author:{id:value.author.id},edit:payload=>rest.patch(Routes.channelMessage(channelId,messageId),restPayload(payload))};};
 return{user:{id:me.id},channels:{fetch:async channelId=>({isTextBased:()=>true,messages:{fetch:messageId=>message(channelId,messageId)}})},guilds:{fetch:async guildId=>({members:{fetch:async({user})=>{const member=await rest.get(Routes.guildMember(guildId,user));const identity=asUser(member.user,{...member,guild_id:guildId});return{user:identity,displayName:member.nick??identity.displayName,displayAvatarURL:()=>cdnAvatar(member.user,{...member,guild_id:guildId})};}}})},users:{fetch:async userId=>asUser(await rest.get(Routes.user(userId)))} };
}
async function editExisting(client,channelId,messageId,payload){const channel=await client.channels.fetch(channelId);if(!channel?.isTextBased?.()||!('messages'in channel))return'skipped';try{const message=await channel.messages.fetch(messageId);if(message.author.id!==client.user?.id)return'skipped';await message.edit(payload);return'updated';}catch(error){if(missing(error))return'skipped';throw error;}}
/** The caller owns production authentication. The operation edits only stored public message references. */
export async function backfillPublicCards({db,client,community,introductions,createDisplay,delay=pause,write=console.log}){
 const counts={suggestions:{updated:0,skipped:0},introductions:{updated:0,skipped:0}};
 const suggestions=await db.gameSession.findMany({where:{guildId:GUILD,type:'community',messageId:{not:null},data:{path:['kind'],equals:'suggest'}},orderBy:{createdAt:'asc'}});
 for(const row of suggestions){try{const view=await community.repo.publicView(row.id),payload=await community.coordinator.payload(view,client),result=await editExisting(client,row.channelId,row.messageId,createDisplay(payload));counts.suggestions[result]++;}catch{counts.suggestions.skipped++;}await delay(750);}
 const published=await db.introductionSubmission.findMany({where:{guildId:GUILD,outputMessageId:{not:null},outputChannelId:{not:null},publishedRevision:{gt:0}},orderBy:{updatedAt:'asc'}});
 const {config,form}=await introductions.repo.configuration(GUILD);
 for(const row of published){try{const draft={form,config,answers:row.answers,baseRevision:row.publishedRevision,page:0,previewedVersion:null},payload=await introductions.coordinator.cardPayload(client,GUILD,row.userId,draft,'intro:backfill:'+row.userId),result=await editExisting(client,row.outputChannelId,row.outputMessageId,createDisplay(payload));counts.introductions[result]++;}catch{counts.introductions.skipped++;}await delay(750);}
 write(`BACKFILL suggestions updated=${counts.suggestions.updated} skipped=${counts.suggestions.skipped}; introductions updated=${counts.introductions.updated} skipped=${counts.introductions.skipped}.`);return counts;
}
async function connect(target){const [{PrismaClient},{REST,Routes},{PrismaCommunityRepository},{PrismaIntroductionsRepository},{DiscordCommunityCoordinator},{DiscordIntroductionsCoordinator},{ConfigService,AuditService},{PrismaConfigRepository,PrismaAuditSink},{SETTINGS},{createDisplay}]=await Promise.all([import('@prisma/client'),import('discord.js'),import('../dist/packages/features-community/src/prisma-repository.js'),import('../dist/packages/features-introductions/src/prisma-repository.js'),import('../dist/apps/bot/src/discord/community-coordinator.js'),import('../dist/apps/bot/src/discord/introductions-coordinator.js'),import('../dist/packages/core/src/index.js'),import('../dist/packages/database/src/prisma-adapters.js'),import('../dist/packages/contracts/src/generated/settings.js'),import('../dist/apps/bot/src/discord/wide-display.js')]);
 const db=new PrismaClient({datasourceUrl:target.databaseUrl,log:[]}),config=new ConfigService(SETTINGS,new PrismaConfigRepository(db),new AuditService(new PrismaAuditSink(db))),client=await createRestClient(target.token,{Rest:REST,Routes});
 const eligible=async()=>true,canManage=async()=>false,repo=new PrismaCommunityRepository(db),introRepo=new PrismaIntroductionsRepository(db);
 return{db,client,community:{repo,coordinator:new DiscordCommunityCoordinator(repo,config,eligible)},introductions:{repo:introRepo,coordinator:new DiscordIntroductionsCoordinator(introRepo,config,eligible,canManage)},createDisplay};
}
export async function main(env=process.env,{connect:connectOverride,write=console.log,error=console.error}={}){let c;try{const target=productionBackfillTarget(env);c=connectOverride?await connectOverride(target):await connect(target);await backfillPublicCards({...c,write});return 0;}catch(cause){error(`FAIL: ${/^[A-Z_]+$/.test(cause?.message??'')?cause.message:'PUBLIC_CARD_BACKFILL_FAILED'}.`);return 1;}finally{try{await c?.db?.$disconnect();}catch{}}}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)process.exitCode=await main();
