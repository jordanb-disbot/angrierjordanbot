import type {ConfigService} from '../../../../packages/core/src/index.js';

/** The two shared launch channels for interactive games. Dedicated passive games retain their own channels. */
export async function interactiveGameChannelAllowed(config:Pick<ConfigService,'get'>,guildId:string,channelId:string){
 const [games,bot]=await Promise.all([config.get(guildId,'channels.games_channel'),config.get(guildId,'channels.bot_channel')]);
 return channelId===games||channelId===bot;
}
