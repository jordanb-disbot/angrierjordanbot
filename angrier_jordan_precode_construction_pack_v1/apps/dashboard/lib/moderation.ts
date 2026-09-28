import { getPrismaClient } from '../../../packages/database/src/client';

export async function readModerationOverview(guildId:string){
  const db=getPrismaClient();
  const [activeJails,openCases,recentCases]=await Promise.all([
    db.jailSentence.findMany({where:{guildId,active:true},orderBy:{startedAt:'desc'},take:8,select:{id:true,userId:true,endsAt:true,indefinite:true,reason:true}}),
    db.moderationCase.count({where:{guildId,status:'OPEN'}}),
    db.moderationCase.findMany({where:{guildId},orderBy:{updatedAt:'desc'},take:8,select:{id:true,subjectUserId:true,actionType:true,status:true,createdAt:true,updatedAt:true}}),
  ]);
  return {activeJails,openCases,recentCases};
}
