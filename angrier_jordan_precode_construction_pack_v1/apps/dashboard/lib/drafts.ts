import { ConfigDraftService, type ReferenceVerifier } from '../../../packages/core/src/config-draft';
import { PermissionEngine } from '../../../packages/core/src/permissions';
import { SETTINGS } from '../../../packages/contracts/src/generated/settings';
import { CAPABILITY_MATRIX } from '../../../packages/contracts/src/generated/capabilities';
import { getPrismaClient } from '../../../packages/database/src/client';
import { PrismaConfigDraftRepository } from '../../../packages/features-dashboard/src/prisma-drafts';
import { verifyDashboardReferences } from '../../../packages/features-dashboard/src/references';
import { validateBuiltinRoleMap } from '../../../packages/features-special/src/domain';

const verifyReferences:ReferenceVerifier=async(guildId,definitions,values)=>{
  return verifyDashboardReferences(guildId,definitions,values,async(serverId,resource)=>{
    const token=process.env.DISCORD_TOKEN;if(!token)throw new Error('Reference verification unavailable.');
    const response=await fetch(`https://discord.com/api/v10/guilds/${serverId}/${resource}`,{headers:{Authorization:`Bot ${token}`},cache:'no-store',redirect:'error',signal:AbortSignal.timeout(8000)});
    if(!response.ok)throw new Error('Reference verification unavailable.');return response.json();
  });
};

export function draftService(){
  return new ConfigDraftService(SETTINGS,new PrismaConfigDraftRepository(getPrismaClient(),SETTINGS),new PermissionEngine(CAPABILITY_MATRIX.capabilities),verifyReferences,Date.now,(key,value)=>{
    if(key!=='special_commands.builtin_role_map')return false;
    validateBuiltinRoleMap(value);return true;
  });
}
