import {randomInt} from 'node:crypto';
import {AttachmentBuilder,EmbedBuilder,type Client} from 'discord.js';
import {DeliveryEngine,DomainError,type ConfigService} from '../../../../packages/core/src/index.js';
import {PrismaChairismRepository} from '../../../../packages/features-chairisms/src/prisma-repository.js';
import {renderChairism} from '../../../../packages/features-chairisms/src/render.js';
import type {ChairismBrowser,ChairismBrowseItem,ChairismBrowseQuery,ChairismContext,ChairismPublisher,ChairismSnapshot} from '../../../../packages/features-chairisms/src/interfaces.js';
import {rasterizeSvg} from '../../../../packages/renderer/src/raster.js';
import {DiscordChairismSecurity} from './chairisms-security.js';
export class DiscordChairismPublication implements ChairismPublisher,ChairismBrowser {
 constructor(private client:Client,private repo:PrismaChairismRepository,private security:DiscordChairismSecurity,private config:ConfigService){}
 async publish(context:ChairismContext,snapshot:ChairismSnapshot){const channel=await this.security.output(context),cooldown=await this.config.get(context.guildId,'chairisms.cooldown_seconds'),receipt=await this.repo.enqueue(context,snapshot,channel.id,Number(cooldown));return this.deliver(receipt.jobId);}
 async deliver(jobId:string){const job=await this.repo.job(jobId),p=job.payload;if(await this.config.get(job.guildId,'features.chairisms')!==true)throw new DomainError('CHAIRISMS_DISABLED','Chairisms are not enabled yet.');
  // A recorded Discord receipt may be finalized after restart without re-fetching deleted source content.
  if(p.deliveryState==='SENT')return this.repo.finalize(jobId);
  const channel=await this.security.output(p.context,p.outputChannelId),marker='chairism:'+jobId;
  await new DeliveryEngine(this.repo.delivery(jobId)).deliver(marker,{
   find:async key=>{const messages=await channel.messages.fetch({limit:100});return messages.find(m=>m.author.id===this.client.user?.id&&m.embeds.some(e=>e.footer?.text===key))?.id??null;},
   send:async key=>{if(!p.snapshot)throw new DomainError('CHAIRISM_JOB','This Chairism has no pending source.');const png=await rasterizeSvg(renderChairism(p.snapshot));await this.security.revalidate(p.context,p.snapshot);const destination=await this.security.output(p.context,p.outputChannelId);return(await destination.send({embeds:[new EmbedBuilder().setAuthor({name:'Angrier Jordan'}).setTitle('Chairisms').setColor(0xC9A768).setImage('attachment://chairism.png').setFooter({text:key})],files:[new AttachmentBuilder(png,{name:'chairism.png'})],allowedMentions:{parse:[]}})).id;}
  });return this.repo.finalize(jobId);
 }
 async list(context:ChairismContext,query:ChairismBrowseQuery):Promise<ChairismBrowseItem[]>{await this.security.assertCanBrowse(context,query.memberId?[query.memberId]:[]);if(query.mode==='member'&&!query.memberId)throw new DomainError('CHAIRISM_MEMBER','Choose a member.');let cursor=query.beforeId,eligibleCount=0;const selected:ChairismBrowseItem[]=[];
  while(true){const rows=await this.repo.metadata(context.guildId,query,cursor);if(!rows.length)break;for(const row of rows){const output=await this.repo.publishedOutput(context.guildId,row.id);if(!output||!await this.security.canBrowseOutput(context,output.outputChannelId,output.outputMessageId))continue;const item={...output,sourceUserId:row.sourceUserId,createdAt:row.createdAt.toISOString()};if(query.mode==='random'){if(randomInt(++eligibleCount)===0)selected[0]=item;}else{selected.push(item);if(selected.length===10)return selected;}}cursor=rows.at(-1)!.id;if(rows.length<100)break;}return selected;
 }
}
