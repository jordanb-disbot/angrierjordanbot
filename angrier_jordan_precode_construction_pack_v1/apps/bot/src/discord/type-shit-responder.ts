import type {Message,MessageReaction,PartialMessageReaction,User,PartialUser} from 'discord.js';
import {createHash} from 'node:crypto';
import {isTypeShitPrefixCommand} from './type-shit-command.js';

const TYPE_SHIT_GIF='type-shit.gif';
const plainReply={content:'Shit',allowedMentions:{parse:[] as never[]}};
const replyNonce=(kind:string,id:string)=>createHash('sha256').update(`type-shit:${kind}:${id}`).digest('hex').slice(0,24);
export function isTypeShitEmojiName(name:string|null|undefined){
  return /^(?:type_shit|typeshit)$/i.test(name??'');
}

/** A single plain reply for each qualifying message or reaction event. */
export class TypeShitResponder {
 private readonly handled=new Set<string>();
 private claim(kind:string,id:string){const key=`${kind}:${id}`;
  if(this.handled.has(key))return false;
  this.handled.add(key);
  if(this.handled.size>5_000)this.handled.delete(this.handled.values().next().value!);
  return true;
 }
 private matches(message:Pick<Message,'content'|'stickers'|'attachments'>){
  return [...message.content.matchAll(/<a?:(\w+):\d+>/g)].some(match=>isTypeShitEmojiName(match[1]))
   || /\btype\s+shit\b/i.test(message.content)
   || [...message.stickers.values()].some(sticker=>sticker.name==='TS')
   || [...message.attachments.values()].some(attachment=>attachment.name?.toLowerCase()===TYPE_SHIT_GIF);
 }
 async message(message:Message):Promise<void>{
  if(!message.guild||message.author.bot||message.webhookId||isTypeShitPrefixCommand(message.content)||!this.matches(message)||!this.claim('message',message.id))return;
  await message.reply({...plainReply,nonce:replyNonce('message',message.id),enforceNonce:true});
 }
 async reaction(reaction:MessageReaction|PartialMessageReaction,user:User|PartialUser):Promise<void>{
  if(user.bot||!isTypeShitEmojiName(reaction.emoji.name))return;
  if(reaction.partial)await reaction.fetch();
  const message=reaction.message;
  if(message.partial)await message.fetch();
  const emoji=reaction.emoji.name??'type_shit';
  if(!message.guild||!message.author||message.author.bot||message.webhookId||!this.claim('reaction',`${message.id}:${user.id}:${emoji}`))return;
  await message.reply({...plainReply,nonce:replyNonce('reaction',`${message.id}:${user.id}:${emoji}`),enforceNonce:true});
 }
}
