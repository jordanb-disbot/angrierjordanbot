import type {PrismaClient} from '@prisma/client';
import {EmbedBuilder,type Client} from 'discord.js';
import {DeliveryEngine,type ConfigService,type ScheduledJob} from '../../../../packages/core/src/index.js';
import {PrismaJobDeliveryRepository} from '../../../../packages/database/src/job-delivery.js';
export class DiscordCasinoAnnouncements {
 constructor(private readonly db:PrismaClient,private readonly config:ConfigService){}
 async deliver(client:Client,job:ScheduledJob){
  const p=job.payload as {userId?:unknown;amount?:unknown;roundId?:unknown};if(typeof p?.userId!=='string'||typeof p.amount!=='string'||!/^\d+$/.test(p.amount))throw new Error('Invalid casino announcement.');
  const channelId=await this.config.get(job.guildId,'channels.bot_channel');if(typeof channelId!=='string'||!channelId)throw new Error('Casino result channel is not configured.');
  const channel=await client.channels.fetch(channelId);if(!channel?.isTextBased()||!('send' in channel))throw new Error('Casino result destination unavailable.');
  const member=await(await client.guilds.fetch(job.guildId)).members.fetch(p.userId).catch(()=>null),user=member?.user??await client.users.fetch(p.userId);
  const lottery=job.jobType==='lottery.announce',marker='casino-event:'+job.id;
  const id=await new DeliveryEngine(new PrismaJobDeliveryRepository(this.db,job.id)).deliver(marker,{
   find:async key=>{const recent=await channel.messages.fetch({limit:100});return recent.find(m=>m.author.id===client.user?.id&&m.embeds.some(e=>e.footer?.text===key))?.id??null;},
   send:async key=>(await channel.send({embeds:[new EmbedBuilder().setAuthor({name:'Angrier Jordan'}).setColor(0xD6B76E).setTitle(lottery?'Weekly Lottery Winner':'Chair Pot Jackpot').setThumbnail(member?.displayAvatarURL()??user.displayAvatarURL()).setDescription(`**${member?.displayName??user.displayName}**\nWon **${p.amount} Ottomans**${lottery?'\nThe full ticket-funded pot. No rake.':''}`).setFooter({text:key})],allowedMentions:{parse:[]}})).id
  });
  if(lottery&&typeof p.roundId==='string')await this.db.lotteryRound.updateMany({where:{id:p.roundId,guildId:job.guildId},data:{messageId:id}});
 }
}
