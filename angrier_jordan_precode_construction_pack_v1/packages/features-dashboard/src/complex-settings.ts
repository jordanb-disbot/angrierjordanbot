import {DomainError} from '../../core/src/errors.js';
import {validateBuiltinRoleMap} from '../../features-special/src/domain.js';
import {validateChairismExcludedChannels} from '../../features-chairisms/src/domain.js';
/** JSON settings require their feature's validation before draft preview or publish. */
export function validateDashboardComplexSetting(key:string,value:unknown){
 if(key==='special_commands.builtin_role_map'){validateBuiltinRoleMap(value);return true;}
 if(key==='chairisms.excluded_channel_ids'){if(!validateChairismExcludedChannels(value))throw new DomainError('CHAIRISM_EXCLUSIONS','Use at most 100 unique channel/category snowflake IDs.');return true;}
 if(key==='haiku.response_probability'){if(typeof value!=='number'||!Number.isFinite(value)||value<0||value>0.8)throw new DomainError('HAIKU_PROBABILITY','Use a response probability from 0 through 0.8.');return true;}
 const channelLimits:Record<string,number>={'fight.additional_channel_ids':10,'party_games.additional_channel_ids':10,'social.additional_channel_ids':10,'haiku.additional_channel_ids':20};
 const limit=channelLimits[key];
 if(limit!==undefined){if(!Array.isArray(value)||value.length>limit||value.some(id=>typeof id!=='string'||!/^\d{17,20}$/.test(id))||new Set(value).size!==value.length)throw new DomainError('DASHBOARD_CHANNEL_LIST','Use a JSON array of unique Discord channel IDs within the stated limit.');return true;}
 return false;
}
