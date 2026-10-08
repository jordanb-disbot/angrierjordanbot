import {PermissionFlagsBits,type Guild} from 'discord.js';
import {DomainError,type ConfigService} from '../../../../packages/core/src/index.js';
import {specialNotificationRole} from '../../../../packages/features-special/src/domain.js';

const protectedMappings=['roles.throne','roles.chaise_lounge','roles.recliner','roles.jailed','roles.member_access'] as const;
/** Only VC/Chess have built-in case aliases. Custom command matching stays exact. */
export function normalizeNotificationTrigger(value:string){const trigger=value.trim();return /^!(?:vc|chess)$/i.test(trigger)?trigger.toLowerCase():trigger;}
/** Fresh Discord state is authoritative. Never broaden role mention permissions automatically. */
export async function notificationRole(guild:Guild,channelId:string,configuredRoleId:string|null|undefined,config:Pick<ConfigService,'get'>):Promise<string|undefined>{
 if(!configuredRoleId)return undefined;
 if(!/^\d{17,20}$/.test(configuredRoleId))throw new DomainError('NOTIFICATION_ROLE','The notification role mapping needs a valid server role.');
 const [role,protectedRoles]=await Promise.all([guild.roles.fetch(configuredRoleId,{force:true}),Promise.all(protectedMappings.map(key=>config.get(guild.id,key)))]);
 if(!role)throw new DomainError('NOTIFICATION_ROLE','The configured notification role no longer exists. Ask staff to update its mapping.');
 if(!specialNotificationRole(role,guild.id)||protectedRoles.includes(role.id))throw new DomainError('NOTIFICATION_ROLE_UNSAFE','The configured notification role is protected or has permissions and cannot be used for an opt-in ping.');
 if(role.mentionable)return role.id;
 const [member,channel]=await Promise.all([guild.members.fetchMe({force:true}),guild.channels.fetch(channelId,{force:true})]);
 if(!channel||!('permissionsFor' in channel)||!channel.permissionsFor(member)?.has(PermissionFlagsBits.MentionEveryone))throw new DomainError('NOTIFICATION_PERMISSION','The notification role cannot be mentioned here. Staff must make that opt-in role mentionable or allow AJ to mention it in this channel.');
 return role.id;
}
export function notificationMessage(roleId:string|undefined,body:string){
 // Authored callouts cannot inject additional role/user/everyone mention strings.
 const clean=body.replace(/<@(?:&|!)?\d+>/g,'').replace(/@(everyone|here)\b/gi,'@\u200b$1').trim();
 return{callout:(roleId?`<@&${roleId}> `:'')+clean,allowedMentions:{parse:[] as never[],roles:roleId?[roleId]:[],users:[] as string[],repliedUser:false}};
}
