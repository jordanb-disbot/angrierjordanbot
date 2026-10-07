import type {ConfigService} from '../../../../packages/core/src/index.js';

/** Legacy !line/!race also remain valid in the configured main chat. */
export async function interactiveGameChannelAllowed(config:Pick<ConfigService,'get'>,guildId:string,channelId:string,legacyPrefix=false){
 const [games,bot,main]=await Promise.all([config.get(guildId,'channels.games_channel'),config.get(guildId,'channels.bot_channel'),config.get(guildId,'channels.main_chat')]);
 return channelId===games||channelId===bot||(legacyPrefix&&channelId===main);
}
