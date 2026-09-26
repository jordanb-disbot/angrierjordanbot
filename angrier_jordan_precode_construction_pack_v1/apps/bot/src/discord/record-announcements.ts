import type {PrismaClient} from '@prisma/client';
import {AttachmentBuilder,EmbedBuilder,type Client} from 'discord.js';
import {memberArt} from './member-art.js';
import {renderRecords,recordTitle} from '../../../../packages/features-profiles/src/render.js';
import {rasterizeSvg} from '../../../../packages/renderer/src/raster.js';
import {DeliveryEngine,type ConfigService,type ScheduledJob} from '../../../../packages/core/src/index.js';
import {PrismaJobDeliveryRepository} from '../../../../packages/database/src/job-delivery.js';
export class DiscordRecordAnnouncements {
 constructor(private readonly db:PrismaClient,private readonly config:ConfigService){}
 async deliver(client:Client,job:ScheduledJob){
  if(await this.config.get(job.guildId,'features.profiles')!==true)throw new Error('Record announcements disabled; retain job.');
  const p=job.payload as {userId?:unknown;recordKey?:unknown;scopeKey?:unknown;oldValue?:unknown;newValue?:unknown;heldMs?:unknown};
  if(typeof p?.userId!=='string'||typeof p.recordKey!=='string'||typeof p.scopeKey!=='string'||typeof p.oldValue!=='string'||typeof p.newValue!=='string'||typeof p.heldMs!=='number')throw new Error('Invalid record notification.');
  const channelId=await this.config.get(job.guildId,'channels.bot_channel');if(typeof channelId!=='string'||!channelId)throw new Error('Record channel is not configured.');
  const channel=await client.channels.fetch(channelId);if(!channel?.isTextBased()||!('send' in channel))throw new Error('Record destination must be a text channel.');
  const identity=await memberArt(client,job.guildId,p.userId);
  const png=await rasterizeSvg(renderRecords({title:'New Server Record',scope:p.scopeKey==='alltime'?'All time':p.scopeKey,records:[{title:recordTitle(p.recordKey),memberName:identity?.name??'Record holder',avatarData:identity?.avatarData??'',amount:p.newValue,achievedAt:new Intl.DateTimeFormat('en-CA',{timeZone:'America/Denver',dateStyle:'medium'}).format(job.dueAt),supporting:'Previous: '+p.oldValue+' · Held for '+Math.floor(p.heldMs/1000)+' seconds.'}]}));
  const marker='record:'+job.id;
  await new DeliveryEngine(new PrismaJobDeliveryRepository(this.db,job.id)).deliver(marker,{
   find:async key=>{const recent=await channel.messages.fetch({limit:100});return recent.find(m=>m.author.id===client.user?.id&&m.embeds.some(e=>e.footer?.text===key))?.id??null;},
   send:async key=>{const card=new EmbedBuilder().setAuthor({name:'Angrier Jordan'}).setColor(0xC9A768).setTitle('New Server Record').setDescription(`<@${p.userId}> · **${p.recordKey}**\n${p.scopeKey==='alltime'?'All time':p.scopeKey}\nPrevious: ${p.oldValue}\nNew: **${p.newValue}**\nPrevious record held for ${Math.floor(Number(p.heldMs)/1000)} seconds.`).setFooter({text:key}).setImage('attachment://record-announcement.png');return(await channel.send({embeds:[card],files:[new AttachmentBuilder(png,{name:'record-announcement.png'})],allowedMentions:{parse:[]}})).id;}
  });
 }
}
