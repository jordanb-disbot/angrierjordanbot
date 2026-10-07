import type {ConfigService} from '../../../../packages/core/src/index.js';

// The production Chairs main-chat channel is a fixed safety boundary for the
// two legacy prefix commands. The persisted mapping is still preferred, but
// this fallback keeps a stale/missing mapping from silently dropping !line and
// !race while leaving slash/newer game routes config-only.
export const LEGACY_MAIN_CHAT_CHANNEL_ID='1524964386077151365';

/** Legacy !line/!race also remain valid in the configured main chat. */
export async function interactiveGameChannelAllowed(config:Pick<ConfigService,'get'>,guildId:string,channelId:string,legacyPrefix=false){
 const [games,bot,main]=await Promise.all([config.get(guildId,'channels.games_channel'),config.get(guildId,'channels.bot_channel'),config.get(guildId,'channels.main_chat')]);
 return channelId===games||channelId===bot||(legacyPrefix&&(channelId===main||channelId===LEGACY_MAIN_CHAT_CHANNEL_ID));
}
