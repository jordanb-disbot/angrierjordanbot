import {createHash} from 'node:crypto';
import {displayFrames,wideDisplay,createDisplay} from './wide-display.js';
import {avatarData} from './member-art.js';
import {renderCasinoResult} from '../../../../packages/features-casino/src/render.js';
import type {PrismaClient} from '@prisma/client';
import type {Client} from 'discord.js';
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
  const member=await(await client.guilds.fetch(job.guildId)).members.fetch(p.userId).catch(()=>null),user=member?.user??await client.users.fetch(p.userId);
  const lottery=job.jobType==='lottery.announce',marker='casino-event:'+job.id;
  const key='casino-award-'+createHash('sha256').update(marker).digest('hex').slice(0,24);
  const frames=await displayFrames(renderCasinoResult({title:lottery?'Weekly Lottery':'Chair Pot Jackpot',subtitle:lottery?'Winning ticket · Draw settled':'Jackpot · Settled',memberName:member?.displayName??user.displayName,avatarData:await avatarData((member??user).displayAvatarURL({extension:'png',size:128})),amount:p.amount,amountLabel:'Won',details:[{label:'Settlement',value:lottery?'The full ticket-funded pot. No rake.':'Chair Pot jackpot paid.'}]}),key,lottery?'Weekly Lottery Winner':'Chair Pot Jackpot');
  const id=await new DeliveryEngine(new PrismaJobDeliveryRepository(this.db,job.id)).deliver(marker,{
   find:async key=>{const recent=await channel.messages.fetch({limit:100});return recent.find(m=>m.author.id===client.user?.id&&(m.embeds.some(e=>e.footer?.text===key)||[...m.attachments.values()].some(a=>a.name.startsWith('casino-award-'+createHash('sha256').update(key).digest('hex').slice(0,24)))))?.id??null;},
   send:async()=>(await channel.send(createDisplay(wideDisplay(frames)))).id
  });
  if(lottery&&typeof p.roundId==='string')await this.db.lotteryRound.updateMany({where:{id:p.roundId,guildId:job.guildId},data:{messageId:id}});
 }
}
