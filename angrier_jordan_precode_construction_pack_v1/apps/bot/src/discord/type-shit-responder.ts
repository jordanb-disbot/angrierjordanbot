import type {Message,MessageReaction,PartialMessageReaction,User,PartialUser} from 'discord.js';

const TYPE_SHIT_EMOJI_IDS=new Set(['1548935774857334915','1557211130865254410']);
const TYPE_SHIT_STICKER_ID='1542447546444812338';
const TYPE_SHIT_GIF_ATTACHMENT_ID='1557692466579116042';
const plainReply={content:'Shit',allowedMentions:{parse:[] as never[]}};
export function isTypeShitEmojiName(name:string|null|undefined){
  return /^(?:type[_-]?sh+i+t|typeshit)$/i.test(name??'');
}
export function isTypeShitEmoji(id:string|null|undefined,name:string|null|undefined){
  return TYPE_SHIT_EMOJI_IDS.has(id??'')&&isTypeShitEmojiName(name);
}

/** Small server-wide call-and-response with no channel, role, or feature gate. */
export class TypeShitResponder {
  private readonly replied=new Set<string>();
  private once(key:string){
    if(this.replied.has(key))return false;
    this.replied.add(key);
    if(this.replied.size>5000)this.replied.delete(this.replied.values().next().value!);
    return true;
  }
  async message(message:Message):Promise<void>{
    if(!message.guild||message.author.bot||message.webhookId)return;
    const emojiUses=[...message.content.matchAll(/<a?:(\w+):(\d+)>/g)].filter(match=>isTypeShitEmoji(match[2],match[1])).length;
    const phraseUses=/\btype\s+shit\b/i.test(message.content)?1:0;
    const stickerUses=[...message.stickers.values()].some(sticker=>sticker.id===TYPE_SHIT_STICKER_ID)?1:0;
    const gifUses=[...message.attachments.values()].some(attachment=>attachment.id===TYPE_SHIT_GIF_ATTACHMENT_ID)?1:0;
    if(emojiUses+phraseUses+stickerUses+gifUses===0)return;
    if(!this.once(`message:${message.id}`))return;
    await message.reply(plainReply);
  }

  async reaction(reaction:MessageReaction|PartialMessageReaction,user:User|PartialUser):Promise<void>{
    if(user.bot||!isTypeShitEmoji(reaction.emoji.id,reaction.emoji.name))return;
    if(reaction.partial)await reaction.fetch();
    const message=reaction.message;
    if(message.partial)await message.fetch();
    if(!message.guild||!message.author||message.author.bot||message.webhookId)return;
    if(!this.once(`reaction:${message.id}:${user.id}:${reaction.emoji.id}`))return;
    await message.reply(plainReply);
  }
}
