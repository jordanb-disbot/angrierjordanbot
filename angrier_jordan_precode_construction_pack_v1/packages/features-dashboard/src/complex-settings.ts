import {DomainError} from '../../core/src/errors.js';
import {validateBuiltinRoleMap} from '../../features-special/src/domain.js';
import {validateChairismExcludedChannels} from '../../features-chairisms/src/domain.js';
/** JSON settings require their feature's validation before draft preview or publish. */
export function validateDashboardComplexSetting(key:string,value:unknown){
 if(key==='special_commands.builtin_role_map'){validateBuiltinRoleMap(value);return true;}
 if(key==='chairisms.excluded_channel_ids'){if(!validateChairismExcludedChannels(value))throw new DomainError('CHAIRISM_EXCLUSIONS','Use at most 100 unique channel/category snowflake IDs.');return true;}
 return false;
}
