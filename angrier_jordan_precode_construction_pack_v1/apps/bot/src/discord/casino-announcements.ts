import type {PrismaClient} from '@prisma/client';
import {EmbedBuilder,type Client} from 'discord.js';
import {DeliveryEngine,type ConfigService,type ScheduledJob} from '../../../../packages/core/src/index.js';
import {PrismaJobDeliveryRepository} from '../../../../packages/database/src/job-delivery.js';
export class DiscordCasinoAnnouncements {
 constructor(private readonly db:PrismaClient,private readonly config:ConfigService){}
 async deliver(client:Client,job:ScheduledJob){
  const feature=job.jobType==='lottery.announce'?'features.lottery':'features.casino';
  if(await this.config.get(job.guildId,feature)!==true)throw new Error('Casino announcement disabled; retain pending delivery.');
  const p=job.payload as {userId?:unknown;amount?:unknown;roundId?:unknown};if(typeof p?.userId!=='string'||typeof p.amount!=='string'||!/^\d+$/.test(p.amount))throw new Error('Invalid casino announcement.');
  const channelId=await this.config.get(job.guildId,'channels.bot_channel');if(typeof channelId!=='string'||!channelId)throw new Error('Casino result channel is not configured.');
  const channel=await client.channels.fetch(channelId);if(!channel?.isTextBased()||!('send' in channel))throw new Error('Casino result destination unavailable.');
  const lottery=job.jobType==='lottery.announce',marker='casino-event:'+job.id,bucket=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Denver',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',hourCycle:'h23'}).format(job.dueAt).replace(/[^0-9]/g,''),digest='casino-digest:'+job.guildId+':'+bucket,entry='• <@'+p.userId+'> · **'+(lottery?'Weekly Lottery':'Chair Pot')+'** — '+p.amount+' Ottomans';
  const id=await new DeliveryEngine(new PrismaJobDeliveryRepository(this.db,job.id)).deliver(marker,{
   find:async key=>{const recent=await channel.messages.fetch({limit:100}),legacy='casino-award-'+createHash('sha256').update(key).digest('hex').slice(0,24);return recent.find(m=>m.author.id===client.user?.id&&(m.embeds.some(e=>e.footer?.text===key)||[...m.attachments.values()].some(a=>a.name.startsWith(legacy))))?.id??null;},
   send:async()=>{const recent=await channel.messages.fetch({limit:100}),existing=recent.find(m=>m.author.id===client.user?.id&&m.embeds.some(e=>e.footer?.text===digest));const title='Casino Awards Digest',card=(description:string)=>new EmbedBuilder().setAuthor({name:'Angrier Jordan'}).setColor(0x00A9A5).setTitle(title).setDescription(description).setFooter({text:digest});if(existing){await existing.edit({embeds:[card(((existing.embeds[0]?.description??'')+'\n'+entry).slice(0,4000))],allowedMentions:{parse:[]}});return existing.id;}return(await channel.send({embeds:[card(entry)],allowedMentions:{parse:[]}})).id;}
  });
  if(lottery&&typeof p.roundId==='string')await this.db.lotteryRound.updateMany({where:{id:p.roundId,guildId:job.guildId},data:{messageId:id}});
 }
}
import {createHash} from 'node:crypto';
