import type {PrismaClient} from '@prisma/client';

export const FULLY_FURNISHED_END_AT=new Date('2026-10-05T05:59:00.000Z');
export const FULLY_FURNISHED_REQUIREMENTS=['chair_historian','properly_introduced','armchair_architect','house_regular','button_masher'] as const;
type Requirement=typeof FULLY_FURNISHED_REQUIREMENTS[number];
export interface FullyFurnishedProgressView {active:boolean;completed:string[];casinoRounds:number;commandNames:string[];unlocked:boolean;roleId:string|null;rolePending:boolean;}
export interface FullyFurnishedUnlock {guildId:string;userId:string;roleId:string|null;}
const definitions:Record<string,{name:string;class:string;criteria:object}>= {
 'event.chair_historian':{name:'Chair Historian',class:'lore',criteria:{event:'fully_furnished',requirement:'chair_historian'}},
 properly_introduced:{name:'Properly Introduced',class:'community',criteria:{event:'fully_furnished',requirement:'properly_introduced'}},
 armchair_architect:{name:'Armchair Architect',class:'community',criteria:{event:'fully_furnished',requirement:'armchair_architect'}},
 house_regular:{name:'House Regular',class:'casino',criteria:{event:'fully_furnished',requirement:'house_regular',rounds:10}},
 button_masher:{name:'Button Masher',class:'games',criteria:{event:'fully_furnished',requirement:'button_masher',commands:5}},
 fully_furnished:{name:'Fully Furnished',class:'prestige',criteria:{event:'fully_furnished',requires:[...FULLY_FURNISHED_REQUIREMENTS]}}
};
const achievementId=(requirement:Requirement)=>`event.${requirement}`;
const safeName=(value:string)=>value.trim().toLowerCase().replace(/^\//,'');
const excluded=new Set(['profile','achievements','lore','introduce','intro-config','suggest','status','help','tutorial','tldr','rules','roles','jail','mod','panic','dashboard']);

/** Event-only durable state.  Calls outside the active UTC window are no-ops. */
export class PrismaFullyFurnishedRepository {
 constructor(private readonly db:PrismaClient,private readonly clock:()=>Date=()=>new Date()){}
 private active(event:{enabled:boolean;startsAt:Date;endsAt:Date}|null,now:Date){return Boolean(event?.enabled&&event.startsAt<=now&&now<event.endsAt);}
 private complete(row:{chairHistorianAt:Date|null;properlyIntroducedAt:Date|null;armchairArchitectAt:Date|null;houseRegularAt:Date|null;buttonMasherAt:Date|null}){return FULLY_FURNISHED_REQUIREMENTS.filter(key=>key==='chair_historian'?row.chairHistorianAt:key==='properly_introduced'?row.properlyIntroducedAt:key==='armchair_architect'?row.armchairArchitectAt:key==='house_regular'?row.houseRegularAt:row.buttonMasherAt);}
 private async ensureDefinitions(tx:any){for(const [id,definition] of Object.entries(definitions))await tx.achievement.upsert({where:{id},create:{id,...definition},update:{name:definition.name,class:definition.class,criteria:definition.criteria,enabled:true}});}
 private async record(guildId:string,userId:string,kind:'lore'|'intro'|'suggestion'|'casino'|'command',reference:string,mutate:(tx:any,row:any,now:Date)=>Promise<any>|any):Promise<{progress:FullyFurnishedProgressView;unlock?:FullyFurnishedUnlock}> {
  const now=this.clock();
  return this.db.$transaction(async tx=>{
   const event=await tx.fullyFurnishedEvent.findUnique({where:{guildId}});
   if(!this.active(event,now))return{progress:{active:false,completed:[],casinoRounds:0,commandNames:[],unlocked:false,roleId:event?.roleId??null,rolePending:false}};
   await tx.member.upsert({where:{guildId_userId:{guildId,userId}},create:{guildId,userId},update:{}});
   await this.ensureDefinitions(tx);
   const receipt=await tx.fullyFurnishedReceipt.findUnique({where:{guildId_userId_kind_reference:{guildId,userId,kind,reference}}});
   if(!receipt)await tx.fullyFurnishedReceipt.create({data:{guildId,userId,kind,reference}});
   let row=await tx.fullyFurnishedProgress.upsert({where:{guildId_userId:{guildId,userId}},create:{guildId,userId},update:{}});
   if(!receipt)row=await mutate(tx,row,now);
   const completed=this.complete(row);
   for(const requirement of completed)await tx.memberAchievement.upsert({where:{guildId_userId_achievementId:{guildId,userId,achievementId:achievementId(requirement)}},create:{guildId,userId,achievementId:achievementId(requirement),earnedAt:now,metadata:{event:'fully_furnished',startedAt:event!.startsAt.toISOString()}},update:{}});
   let unlock:FullyFurnishedUnlock|undefined;
   if(completed.length===FULLY_FURNISHED_REQUIREMENTS.length&&!row.fullyFurnishedAt){
    row=await tx.fullyFurnishedProgress.update({where:{guildId_userId:{guildId,userId}},data:{fullyFurnishedAt:now}});
    await tx.memberAchievement.upsert({where:{guildId_userId_achievementId:{guildId,userId,achievementId:'fully_furnished'}},create:{guildId,userId,achievementId:'fully_furnished',earnedAt:now,metadata:{event:'fully_furnished',startedAt:event!.startsAt.toISOString()}},update:{}});
    unlock={guildId,userId,roleId:event!.roleId};
   }
   return{progress:{active:true,completed,casinoRounds:row.casinoRounds,commandNames:row.commandNames,unlocked:Boolean(row.fullyFurnishedAt),roleId:event!.roleId??null,rolePending:Boolean(row.fullyFurnishedAt&&!row.roleGrantedAt)},...(unlock?{unlock}:{})};
  },{isolationLevel:'Serializable'});
 }
 async recordLoreChapter(guildId:string,userId:string,chapterId:string){return this.record(guildId,userId,'lore',chapterId,async(tx,row,now)=>{const chapters=[...new Set([...row.loreChapters,chapterId])];return tx.fullyFurnishedProgress.update({where:{guildId_userId:{guildId,userId}},data:{loreChapters:chapters,...(chapters.length>=3&&!row.chairHistorianAt?{chairHistorianAt:now}:{})}});});}
 async recordIntroduction(guildId:string,userId:string,publicationId:string){return this.record(guildId,userId,'intro',publicationId,(tx,row,now)=>tx.fullyFurnishedProgress.update({where:{guildId_userId:{guildId,userId}},data:row.properlyIntroducedAt?{}:{properlyIntroducedAt:now}}));}
 async recordSuggestion(guildId:string,userId:string,suggestionId:string){return this.record(guildId,userId,'suggestion',suggestionId,(tx,row,now)=>tx.fullyFurnishedProgress.update({where:{guildId_userId:{guildId,userId}},data:row.armchairArchitectAt?{}:{armchairArchitectAt:now}}));}
 async recordCasinoRound(guildId:string,userId:string,sessionId:string){return this.record(guildId,userId,'casino',sessionId,(tx,row,now)=>{const rounds=row.casinoRounds+1;return tx.fullyFurnishedProgress.update({where:{guildId_userId:{guildId,userId}},data:{casinoRounds:rounds,...(rounds>=10&&!row.houseRegularAt?{houseRegularAt:now}:{})}});});}
 async recordCommand(guildId:string,userId:string,command:string,reference:string){const name=safeName(command);if(!name||excluded.has(name))return this.progress(guildId,userId);return this.record(guildId,userId,'command',reference,(tx,row,now)=>{const names=[...new Set([...row.commandNames,name])].sort();return tx.fullyFurnishedProgress.update({where:{guildId_userId:{guildId,userId}},data:{commandNames:names,...(names.length>=5&&!row.buttonMasherAt?{buttonMasherAt:now}:{})}});});}
 async markRoleGranted(guildId:string,userId:string){await this.db.fullyFurnishedProgress.updateMany({where:{guildId,userId,fullyFurnishedAt:{not:null},roleGrantedAt:null},data:{roleGrantedAt:this.clock()}});}
 async completers(guildId:string){return(await this.db.fullyFurnishedProgress.findMany({where:{guildId,fullyFurnishedAt:{not:null}},orderBy:{fullyFurnishedAt:'asc'},select:{userId:true}})).map(row=>row.userId);}
 async pendingRoleGrants(guildId:string):Promise<{userId:string;progress:FullyFurnishedProgressView}[]>{
  const event=await this.db.fullyFurnishedEvent.findUnique({where:{guildId}});if(!this.active(event,this.clock())||!event?.roleId)return [];
  const rows=await this.db.fullyFurnishedProgress.findMany({where:{guildId,fullyFurnishedAt:{not:null},roleGrantedAt:null},select:{userId:true,casinoRounds:true,commandNames:true,chairHistorianAt:true,properlyIntroducedAt:true,armchairArchitectAt:true,houseRegularAt:true,buttonMasherAt:true,fullyFurnishedAt:true}});
  return rows.map(row=>({userId:row.userId,progress:{active:true,completed:this.complete(row),casinoRounds:row.casinoRounds,commandNames:row.commandNames,unlocked:true,roleId:event.roleId,rolePending:true}}));
 }
 async progress(guildId:string,userId:string):Promise<{progress:FullyFurnishedProgressView;unlock?:FullyFurnishedUnlock}>{const event=await this.db.fullyFurnishedEvent.findUnique({where:{guildId}}),row=await this.db.fullyFurnishedProgress.findUnique({where:{guildId_userId:{guildId,userId}}});if(!event||!row)return{progress:{active:this.active(event,this.clock()),completed:[],casinoRounds:0,commandNames:[],unlocked:false,roleId:event?.roleId??null,rolePending:false}};const completed=this.complete(row);return{progress:{active:this.active(event,this.clock()),completed,casinoRounds:row.casinoRounds,commandNames:row.commandNames,unlocked:Boolean(row.fullyFurnishedAt),roleId:event.roleId??null,rolePending:Boolean(row.fullyFurnishedAt&&!row.roleGrantedAt)}};}
}
