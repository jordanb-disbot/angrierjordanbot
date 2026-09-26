import type {Guild,GuildMember} from 'discord.js';
import {PermissionEngine,type ConfigService,type StaffRole} from '../../../../packages/core/src/index.js';
import {CAPABILITY_MATRIX} from '../../../../packages/contracts/src/generated/capabilities.js';
/** The interaction coordinator supplies a force-fetched member and current voice state. */
export async function musicAccess(guild:Guild,member:GuildMember,config:ConfigService,eligible:(guildId:string,memberId:string)=>Promise<boolean>){
 if(member.guild.id!==guild.id||member.user.bot||!await eligible(guild.id,member.id))return{eligible:false,isDj:false};
 const tiers=['throne','chaise_lounge','recliner'] as const;
 const roles=await Promise.all(tiers.map(tier=>config.get(guild.id,'roles.'+tier)));
 let tier:StaffRole=member.id===guild.ownerId?'throne':'member';
 if(tier==='member')for(let n=0;n<tiers.length;n++){const role=roles[n];if(typeof role==='string'&&role!==guild.id&&member.roles.cache.has(role)){tier=tiers[n]!;break;}}
 const dedicated=await config.get(guild.id,'music.dj_role');
 return{eligible:true,isDj:new PermissionEngine(CAPABILITY_MATRIX.capabilities).can(tier,'music.dj')||(typeof dedicated==='string'&&dedicated!==guild.id&&member.roles.cache.has(dedicated))};
}
