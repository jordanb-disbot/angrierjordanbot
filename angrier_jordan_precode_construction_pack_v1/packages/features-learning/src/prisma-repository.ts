import type {PrismaClient} from '@prisma/client';
import {PrismaAtomicOperations,requestFingerprint} from '../../database/src/atomic-operations.js';
import {DomainError} from '../../core/src/index.js';
import {chapterContent,LORE_CHAPTERS,validateReadingPage,validateTutorialStep} from './domain.js';
export class PrismaLearningRepository {
 private atomic:PrismaAtomicOperations;
 constructor(private db:PrismaClient,private readonly clock=()=>new Date()){this.atomic=new PrismaAtomicOperations(db);}
 async chapters(){const rows=await this.db.contentEntry.findMany({where:{game:'lore',enabled:true}});return LORE_CHAPTERS.flatMap(c=>{const row=rows.find(r=>r.id==='lore:'+c.id);if(!row)return[];try{return[chapterContent(c.id,row.contentVersion,row.payload)];}catch{return[];}});}
 async loreProgress(guildId:string,userId:string){return this.db.loreProgress.findMany({where:{guildId,userId}});}
 async read(guildId:string,userId:string,chapterId:string,page:number,version:number,requestId:string){
  return this.atomic.run(guildId,'lore:'+requestId,requestFingerprint({userId,chapterId,page,version}),async tx=>{
   const row=await tx.contentEntry.findUnique({where:{id:'lore:'+chapterId}});if(!row||!row.enabled||row.game!=='lore'||row.contentVersion!==version)throw new DomainError('LORE_VERSION','This chapter changed. Reopen Lore.');const chapter=chapterContent(chapterId,version,row.payload);
   const key={guildId,userId,chapterId},old=await tx.loreProgress.findUnique({where:{guildId_userId_chapterId:key}});validateReadingPage(page,chapter,old?.contentVersion===version?old.currentPage:-1);
   await tx.member.upsert({where:{guildId_userId:{guildId,userId}},create:{guildId,userId},update:{}});
   const completedAt=(old?.contentVersion===version?old.completedAt:null)??(page===chapter.pages.length-1?this.clock():null);
   await tx.loreProgress.upsert({where:{guildId_userId_chapterId:key},create:{...key,currentPage:page,contentVersion:version,completedAt,lastActivityAt:this.clock()},update:{currentPage:Math.max(page,old?.contentVersion===version?old.currentPage:0),contentVersion:version,completedAt,lastActivityAt:this.clock()}});
   const progress=await tx.loreProgress.findMany({where:{guildId,userId,completedAt:{not:null}}}),content=await tx.contentEntry.findMany({where:{game:'lore',enabled:true}});
   const allRead=LORE_CHAPTERS.every(c=>{const entry=content.find(r=>r.id==='lore:'+c.id);if(!entry)return false;try{const valid=chapterContent(c.id,entry.contentVersion,entry.payload);return progress.some(p=>p.chapterId===c.id&&p.contentVersion===entry.contentVersion&&p.currentPage===valid.pages.length-1);}catch{return false;}});
   const awardKey={guildId,userId,achievementId:'chair_historian'},earnedBefore=await tx.memberAchievement.findUnique({where:{guildId_userId_achievementId:awardKey}});
   if(allRead){await tx.achievement.upsert({where:{id:'chair_historian'},create:{id:'chair_historian',name:'Chair Historian',class:'lore',criteria:{allChapters:true}},update:{}});await tx.memberAchievement.upsert({where:{guildId_userId_achievementId:awardKey},create:{...awardKey,earnedAt:this.clock()},update:{}});}
   return{chapterId,page,version,historian:allRead||Boolean(earnedBefore),newlyAwarded:allRead&&!earnedBefore};
  });
 }
 async tutorialProgress(guildId:string,userId:string){return this.db.tutorialProgress.findMany({where:{guildId,userId}});}
 async tutorialStep(guildId:string,userId:string,lessonId:string,step:number,requestId:string,reset=false){
  validateTutorialStep(lessonId,step,reset);
  return this.atomic.run(guildId,'tutorial:'+requestId,requestFingerprint({userId,lessonId,step,reset}),async tx=>{await tx.member.upsert({where:{guildId_userId:{guildId,userId}},create:{guildId,userId},update:{}});const key={guildId,userId,lessonId},old=await tx.tutorialProgress.findUnique({where:{guildId_userId_lessonId:key}});if(!reset&&step>(old?.currentStep??-1)+1)throw new DomainError('TUTORIAL_ORDER','Continue from your saved lesson step.');const completedAt=reset?null:old?.completedAt??(step===3?this.clock():null);await tx.tutorialProgress.upsert({where:{guildId_userId_lessonId:key},create:{...key,currentStep:step,contentVersion:1,completedAt,lastActivityAt:this.clock()},update:{currentStep:step,lastActivityAt:this.clock(),completedAt}});return{step,completed:completedAt!==null};});
 }
 async restartTutorialPath(guildId:string,userId:string,lessonIds:string[],requestId:string){
  const ids=[...new Set(lessonIds)].sort();if(!ids.length||ids.length>500||ids.some(id=>!/^[a-z0-9_.-]{1,80}$/.test(id)))throw new DomainError('TUTORIAL_PATH','Choose an available learning path.');
  return this.atomic.run(guildId,'tutorial-path:'+requestId,requestFingerprint({userId,ids}),async tx=>{const result=await tx.tutorialProgress.updateMany({where:{guildId,userId,lessonId:{in:ids}},data:{currentStep:0,completedAt:null,lastActivityAt:this.clock()}});return{reset:result.count};});
 }
 async notableEvents(guildId:string,since:Date,until:Date){
  const jobs=await this.db.scheduledJob.findMany({where:{guildId,jobType:{in:['record.announce','spotlight.announce','casino.jackpot_announce','lottery.announce','family.publish']},completedAt:{gte:since,lte:until},status:'COMPLETED'},select:{jobType:true,completedAt:true,payload:true},orderBy:[{completedAt:'desc'},{id:'desc'}],take:100});
  const payload=(value:unknown)=>value&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:{};
  const keys=jobs.filter(j=>j.jobType==='spotlight.announce').map(j=>payload(j.payload).weekKey).filter((k):k is string=>typeof k==='string');
  const freezes=keys.length?await this.db.spotlightFreeze.findMany({where:{guildId,weekKey:{in:keys},deliveryState:'SENT',messageId:{not:null}},select:{weekKey:true,messageId:true}}):[];
  const seen=new Set<string>();return jobs.flatMap(job=>{const data=payload(job.payload),messageId=job.jobType==='spotlight.announce'?freezes.find(f=>f.weekKey===data.weekKey)?.messageId:data.deliveryMessageId;
   if(typeof messageId!=='string'||!/^\d{5,}$/.test(messageId)||job.jobType!=='spotlight.announce'&&data.deliveryState!=='SENT')return[];
   if(job.jobType==='family.publish'){if(typeof data.sessionId!=='string'||typeof data.channelId!=='string'||!data.sessionId||!data.channelId||seen.has(data.sessionId))return[];seen.add(data.sessionId);}
   return[{jobType:job.jobType,completedAt:job.completedAt}];
  });
 }
}
