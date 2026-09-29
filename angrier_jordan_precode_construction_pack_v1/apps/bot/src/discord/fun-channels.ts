import type {ConfigService} from '../../../../packages/core/src/index.js';
import {interactiveGameChannelAllowed} from './interactive-game-channels.js';

const snowflake=/^\d{17,20}$/;

/** Keep the established primary mapping; secondary channels are scoped to these flows. */
export async function funChannelAllowed(config:Pick<ConfigService,'get'>,guildId:string,channelId:string,kind:'fight'|'party'){
 if(await interactiveGameChannelAllowed(config,guildId,channelId))return true;
 const primary=await config.get(guildId,kind==='fight'?'channels.main_chat':'channels.games_channel');
 if(channelId===primary)return true;
 const extra=await config.get(guildId,kind==='fight'?'fight.additional_channel_ids':'party_games.additional_channel_ids');
 return Array.isArray(extra)&&extra.length<=10&&extra.every(id=>typeof id==='string'&&snowflake.test(id))&&extra.includes(channelId);
}
