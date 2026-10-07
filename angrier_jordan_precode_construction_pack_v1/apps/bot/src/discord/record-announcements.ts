import type {PrismaClient} from '@prisma/client';
import {EmbedBuilder,type Client} from 'discord.js';
import {recordTitle} from '../../../../packages/features-profiles/src/render.js';
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
  const bucket=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Denver',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',hourCycle:'h23'}).format(job.dueAt).replace(/[^0-9]/g,'');
  const digest='records-digest:'+job.guildId+':'+bucket,entry='• <@'+p.userId+'> · **'+recordTitle(p.recordKey)+'** — '+p.newValue+' ('+(p.scopeKey==='alltime'?'all time':p.scopeKey)+')';
  const marker='record:'+job.id;
  await new DeliveryEngine(new PrismaJobDeliveryRepository(this.db,job.id)).deliver(marker,{
   find:async key=>{const recent=await channel.messages.fetch({limit:100});return recent.find(m=>m.author.id===client.user?.id&&m.embeds.some(e=>e.footer?.text===key))?.id??null;},
   send:async()=>{const recent=await channel.messages.fetch({limit:100}),existing=recent.find(m=>m.author.id===client.user?.id&&m.embeds.some(e=>e.footer?.text===digest));if(existing){const prior=existing.embeds[0]?.description??'',description=(prior+'\n'+entry).slice(0,4000);await existing.edit({embeds:[new EmbedBuilder().setAuthor({name:'Angrier Jordan'}).setColor(0xC9A768).setTitle('Records Digest').setDescription(description).setFooter({text:digest})],allowedMentions:{parse:[]}});return existing.id;}return(await channel.send({embeds:[new EmbedBuilder().setAuthor({name:'Angrier Jordan'}).setColor(0xC9A768).setTitle('Records Digest').setDescription(entry).setFooter({text:digest})],allowedMentions:{parse:[]}})).id;}
  });
 }
}
