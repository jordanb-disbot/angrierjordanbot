import type {Message,MessageReaction,PartialMessageReaction,User,PartialUser} from 'discord.js';

const TYPE_SHIT='type_shit';
const reply={content:'Shit',allowedMentions:{parse:[] as never[]}};

/** Small server-wide call-and-response with no channel, role, or feature gate. */
export class TypeShitResponder {
  async message(message:Message):Promise<void>{
    if(!message.guild||message.author.bot)return;
    const emojiUses=(message.content.match(/<a?:type_shit:\d+>/g)??[]).length;
    const phraseUses=(message.content.match(/\btype\s+shit\b/gi)??[]).length;
    const stickerUses=[...message.stickers.values()].filter(sticker=>sticker.name==='TS').length;
    for(let count=0;count<emojiUses+phraseUses+stickerUses;count+=1)await message.reply(reply);
  }

  async reaction(reaction:MessageReaction|PartialMessageReaction,user:User|PartialUser):Promise<void>{
    if(user.bot||reaction.emoji.name!==TYPE_SHIT)return;
    if(reaction.partial)await reaction.fetch();
    const message=reaction.message;
    if(message.partial)await message.fetch();
    if(!message.guild||!message.author||message.author.bot)return;
    await message.reply(reply);
  }
}
