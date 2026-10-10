import {readFileSync} from 'node:fs';
import {AttachmentBuilder,type Message} from 'discord.js';

export const TYPE_SHIT_MENTION_USER_ID='530456739934502937';
const TYPE_SHIT_COMMAND=/^!(?:typeshit|ts)\s*$/i;
let typeShitGif:Buffer|undefined;
const asset=()=>typeShitGif??=readFileSync(new URL('../../../../packages/features-special/assets/type-shit.gif',import.meta.url));

/** Exact legacy shortcuts only; ordinary Type Shit content remains the auto-reply's job. */
export function isTypeShitPrefixCommand(content:string){return TYPE_SHIT_COMMAND.test(content.trim());}

export class TypeShitPrefixCommand {
 private readonly handled=new Set<string>();
 private claim(id:string){if(this.handled.has(id))return false;this.handled.add(id);if(this.handled.size>5_000)this.handled.delete(this.handled.values().next().value!);return true;}
 async message(message:Message):Promise<boolean>{
  if(!message.guild||message.author.bot||message.webhookId||!isTypeShitPrefixCommand(message.content)||!this.claim(message.id))return false;
  await message.reply({content:`<@${TYPE_SHIT_MENTION_USER_ID}>`,files:[new AttachmentBuilder(asset(),{name:'type-shit.gif'})],allowedMentions:{parse:[],users:[TYPE_SHIT_MENTION_USER_ID],roles:[],repliedUser:false}});
  return true;
 }
}
