import {readFile} from 'node:fs/promises';
import type {Message,MessageReaction,PartialMessageReaction,User,PartialUser} from 'discord.js';

const TYPE_SHIT='type_shit';
const TYPE_SHIT_GIF='type-shit.gif';
const reply={content:'Shit',allowedMentions:{parse:[] as never[]}};
const typeShitAnimation=new URL('../../../../packages/features-special/assets/type-shit.gif',import.meta.url);

/** Small server-wide call-and-response with no channel, role, or feature gate. */
export class TypeShitResponder {
  async message(message:Message):Promise<void>{
    if(!message.guild||message.author.bot)return;
    if(message.content.trim().toLowerCase()==='!typeshit'){
      if(!message.channel.isSendable())return;
      await message.delete().catch(()=>undefined);
      await message.channel.send({files:[{attachment:await readFile(typeShitAnimation),name:'type-shit.gif'}],allowedMentions:{parse:[]}});
      return;
    }
    const emojiUses=(message.content.match(/<a?:type_shit:\d+>/g)??[]).length;
    const phraseUses=(message.content.match(/\btype\s+shit\b/gi)??[]).length;
    const stickerUses=[...message.stickers.values()].filter(sticker=>sticker.name==='TS').length;
    const gifUses=[...message.attachments.values()].filter(attachment=>attachment.name?.toLowerCase()===TYPE_SHIT_GIF).length;
    for(let count=0;count<emojiUses+phraseUses+stickerUses+gifUses;count+=1)await message.reply(reply);
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
