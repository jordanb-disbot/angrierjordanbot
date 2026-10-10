import type {Message,MessageReaction,PartialMessageReaction,User,PartialUser} from 'discord.js';

const TYPE_SHIT_GIF='type-shit.gif';
const plainReply={content:'Shit',allowedMentions:{parse:[] as never[]}};
export function isTypeShitEmojiName(name:string|null|undefined){
  return /^(?:type[_-]?sh+i+t|typeshit)$/i.test(name??'');
}

/** Small server-wide call-and-response with no channel, role, or feature gate. */
export class TypeShitResponder {
  private readonly replied=new Set<string>();
  async message(message:Message):Promise<void>{
    if(!message.guild||message.author.bot||message.webhookId||this.replied.has(message.id))return;
    const emojiUses=[...message.content.matchAll(/<a?:(\w+):\d+>/g)].filter(match=>isTypeShitEmojiName(match[1])).length;
    const phraseUses=/\btype\s+shit\b/i.test(message.content)?1:0;
    const stickerUses=[...message.stickers.values()].some(sticker=>/^TS$/i.test(sticker.name??''))?1:0;
    const gifUses=[...message.attachments.values()].filter(attachment=>attachment.name?.toLowerCase()===TYPE_SHIT_GIF).length;
    if(emojiUses+phraseUses+stickerUses+gifUses===0)return;
    this.replied.add(message.id);
    if(this.replied.size>5000)this.replied.delete(this.replied.values().next().value!);
    await message.reply(plainReply);
  }

  async reaction(reaction:MessageReaction|PartialMessageReaction,user:User|PartialUser):Promise<void>{
    if(user.bot||!isTypeShitEmojiName(reaction.emoji.name))return;
    if(reaction.partial)await reaction.fetch();
    const message=reaction.message;
    if(message.partial)await message.fetch();
    if(!message.guild||!message.author||message.author.bot)return;
    await message.reply(plainReply);
  }
}
