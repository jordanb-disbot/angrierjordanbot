import {Prisma,type PrismaClient} from '@prisma/client';
import {PrismaAtomicOperations,requestFingerprint} from '../../database/src/atomic-operations.js';
import {DomainError} from '../../core/src/index.js';
import {dailyCycle,weeklyCycle,zonedDateTimeToUtc} from '../../features-economy/src/service.js';
import {fmkSummary,recordMonth,compareRecord,recordDirection,earnedAchievements,learnedSpotlightHour,qualifyMessage,spotlightWinners,type ActivityTotal,type AchievementRule,type MessageObservation,type SpotlightPostingSettings} from './domain.js';
const dict=(v:unknown)=>v&&typeof v==='object'&&!Array.isArray(v)?v as Record<string,number>:{};
const dateOf=(key:string)=>new Date(key+'T00:00:00Z');
const merge=(a:unknown,b:Record<string,number>)=>{const out={...dict(a)};for(const [k,n] of Object.entries(b))out[k]=(Object.hasOwn(out,k)?out[k]??0:0)+n;return out;};
const hour=(date:Date)=>Number(new Intl.DateTimeFormat('en-US',{timeZone:'America/Denver',hour:'2-digit',hourCycle:'h23'}).format(date));
async function ensure(tx:Prisma.TransactionClient,guildId:string,userId:string){await tx.member.upsert({where:{guildId_userId:{guildId,userId}},create:{guildId,userId},update:{}});await tx.profileState.upsert({where:{guildId_userId:{guildId,userId}},create:{guildId,userId},update:{}});}
async function incrementActivity(tx:Prisma.TransactionClient,guildId:string,userId:string,date:Date,delta:{messages?:number;words?:number;vcSeconds?:number;wordCounts?:Record<string,number>;commandCounts?:Record<string,number>}){
 const where={guildId_userId_date:{guildId,userId,date}},old=await tx.activityDaily.findUnique({where});
 const data={messages:(old?.messages??0)+(delta.messages??0),words:(old?.words??0)+(delta.words??0),vcSeconds:(old?.vcSeconds??0)+(delta.vcSeconds??0),wordCounts:merge(old?.wordCounts,delta.wordCounts??{}),commandCounts:merge(old?.commandCounts,delta.commandCounts??{})};
 await tx.activityDaily.upsert({where,create:{guildId,userId,date,...data},update:data});
}
export class PrismaProfilesRepository {
 private readonly atomic:PrismaAtomicOperations;
 constructor(private readonly db:PrismaClient){this.atomic=new PrismaAtomicOperations(db);}
 async message(guildId:string,userId:string,id:string,at:Date,input:MessageObservation){
  const qualified=qualifyMessage(input);if(!qualified)return;
  await this.atomic.run(guildId,'activity:'+id,requestFingerprint({userId,id}),async tx=>{await ensure(tx,guildId,userId);await incrementActivity(tx,guildId,userId,dateOf(dailyCycle(at).key),qualified);await tx.activityObservation.create({data:{id,guildId,userId,kind:'message',occurredAt:at,hourMt:hour(at)}});return{recorded:true};});
 }
 async command(guildId:string,userId:string,id:string,command:string,at:Date){await this.atomic.run(guildId,'command:'+id,requestFingerprint({userId,command}),async tx=>{await ensure(tx,guildId,userId);await incrementActivity(tx,guildId,userId,dateOf(dailyCycle(at).key),{commandCounts:{[command]:1}});return{recorded:true};});}
 async voice(guildId:string,snapshot:{userId:string;channelId:string;qualified:boolean}[],at:Date){
  const fingerprint=requestFingerprint(snapshot.sort((a,b)=>a.userId.localeCompare(b.userId)));
  return this.atomic.run(guildId,`voice:${at.toISOString()}:${fingerprint.slice(0,12)}`,fingerprint,async tx=>{
   const previous=await tx.voicePresence.findMany({where:{guildId}}),current=new Map(snapshot.map(s=>[s.userId,s])),accruals:{userId:string;seconds:number}[]=[];
   for(const p of previous){if(p.observedAt>=at)continue;if(p.qualified){let from=new Date(Math.max(p.observedAt.getTime(),at.getTime()-60000)),earned=0;while(from<at){const cycle=dailyCycle(from),end=new Date(Math.min(at.getTime(),cycle.next.getTime()));const seconds=Math.floor((end.getTime()-from.getTime())/1000);if(seconds){await incrementActivity(tx,guildId,p.userId,dateOf(cycle.key),{vcSeconds:seconds});earned+=seconds;}from=end;}if(earned)accruals.push({userId:p.userId,seconds:earned});}if(!current.has(p.userId))await tx.voicePresence.delete({where:{guildId_userId:{guildId,userId:p.userId}}});}
   for(const p of snapshot){const old=previous.find(x=>x.userId===p.userId);if(old&&old.observedAt>=at)continue;await ensure(tx,guildId,p.userId);await tx.voicePresence.upsert({where:{guildId_userId:{guildId,userId:p.userId}},create:{guildId,...p,observedAt:at},update:{...p,observedAt:at}});}return{sampled:true,accruals};
  });
 }
 async resetVoiceAfterRestart(guildId:string){await this.db.voicePresence.deleteMany({where:{guildId}});}
 async privacy(guildId:string,userId:string,kind:'activity'|'roast',enabled:boolean){await this.db.$transaction(async tx=>{await ensure(tx,guildId,userId);if(kind==='activity')await tx.member.update({where:{guildId_userId:{guildId,userId}},data:{activityVisible:enabled}});else await tx.profileState.update({where:{guildId_userId:{guildId,userId}},data:{roastEnabled:enabled}});});}
 async profile(guildId:string,userId:string,at=new Date()){
  await this.db.$transaction(tx=>ensure(tx,guildId,userId));
  const [member,state,activity,games,economy,account,achievements,giftsSent,giftsReceived,progress,crime,family,spotlight]=await Promise.all([this.db.member.findUniqueOrThrow({where:{guildId_userId:{guildId,userId}}}),this.db.profileState.findUniqueOrThrow({where:{guildId_userId:{guildId,userId}}}),this.db.activityDaily.findMany({where:{guildId,userId}}),this.db.memberGameStats.findMany({where:{guildId,userId}}),this.db.economyActivityStat.findMany({where:{guildId,userId}}),this.db.economyAccount.findUnique({where:{guildId_userId:{guildId,userId}}}),this.db.memberAchievement.findMany({where:{guildId,userId}}),this.db.giftRecord.count({where:{guildId,senderId:userId}}),this.db.giftRecord.count({where:{guildId,recipientId:userId}}),this.db.craftingProgress.findUnique({where:{guildId_userId:{guildId,userId}}}),this.db.memberCrimeState.findUnique({where:{guildId_userId:{guildId,userId}}}),this.db.marriage.findMany({where:{guildId,status:'ACTIVE',OR:[{userA:userId},{userB:userId}]}}),this.db.weeklySpotlight.findMany({where:{guildId,userId},orderBy:{weekStart:'desc'}})]);
  const today=dailyCycle(at).key,month=today.slice(0,7),week=weeklyCycle(at),nextWeek=dailyCycle(week.next).key,total=(rows:typeof activity)=>({messages:rows.reduce((n,r)=>n+r.messages,0),words:rows.reduce((n,r)=>n+r.words,0),vcSeconds:rows.reduce((n,r)=>n+r.vcSeconds,0)});
  const ranked=(key:'wordCounts'|'commandCounts')=>Object.entries(activity.reduce((out,r)=>merge(out,dict(r[key])),{} as Record<string,number>)).sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]));
  const words=member.activityVisible?ranked('wordCounts'):[],commands=member.activityVisible?ranked('commandCounts'):[];
  return{member,state,activity:member.activityVisible?{day:total(activity.filter(r=>r.date.toISOString().slice(0,10)===today)),allTime:total(activity),week:total(activity.filter(r=>{const day=r.date.toISOString().slice(0,10);return day>=week.key&&day<nextWeek;})),month:total(activity.filter(r=>r.date.toISOString().startsWith(month))),mostWord:words[0]?.[0]??'—',topWords:words.slice(0,3).map(([word,count])=>({word,count})),mostCommand:commands[0]?.[0]??'—'}:null,games,economy,account,achievements,giftsSent,giftsReceived,progress,crime,activeMarriages:family.length,spotlight:spotlight.filter(s=>s.weekStart.getTime()===weeklyCycle(new Date(weeklyCycle(at).start.getTime()-1)).start.getTime())};
 }
 async showcase(guildId:string,userId:string,achievementIds:string[]|undefined,itemIds:string[]|undefined){await this.db.$transaction(async tx=>{
  await ensure(tx,guildId,userId);if((achievementIds?.length??0)>6||(itemIds?.length??0)>6)throw new DomainError('SHOWCASE_SIZE','Feature up to six achievements and six collectibles.');
  const owned=await tx.memberAchievement.findMany({where:{guildId,userId}}),inventory=await tx.inventoryEntry.findMany({where:{guildId,userId,quantity:{gt:0}}}),chairs=await tx.craftedChair.findMany({where:{guildId,userId}});
  if(achievementIds?.some(id=>!owned.some(a=>a.achievementId===id))||itemIds?.some(id=>!inventory.some(i=>i.itemId===id)&&!chairs.some(c=>c.chairType===id)))throw new DomainError('SHOWCASE_OWNERSHIP','Only earned achievements and owned collectibles may be featured.');
  if(itemIds){const allowed=await tx.catalogItem.count({where:{id:{in:[...new Set(itemIds)]},type:{in:['collectible','crafted_chair']}}});if(allowed!==new Set(itemIds).size)throw new DomainError('SHOWCASE_TYPE','Feature collectibles or crafted chairs.');}
  await tx.profileState.update({where:{guildId_userId:{guildId,userId}},data:{...(achievementIds?{featuredAchievements:[...new Set(achievementIds)]}:{}),...(itemIds?{featuredItems:[...new Set(itemIds)]}:{})}});
 });}
 async showcaseOptions(guildId:string,userId:string){const [earned,inventory,chairs,state]=await Promise.all([this.db.memberAchievement.findMany({where:{guildId,userId}}),this.db.inventoryEntry.findMany({where:{guildId,userId,quantity:{gt:0}}}),this.db.craftedChair.findMany({where:{guildId,userId}}),this.db.profileState.findUnique({where:{guildId_userId:{guildId,userId}}})]);const [badges,items]=await Promise.all([this.db.achievement.findMany({where:{id:{in:earned.map(a=>a.achievementId)}}}),this.db.catalogItem.findMany({where:{id:{in:[...inventory.map(i=>i.itemId),...chairs.map(c=>c.chairType)]},type:{in:['collectible','crafted_chair']}}})]);return{badges,items,state};}
 async achievements(guildId:string,userId:string){await this.db.$transaction(tx=>ensure(tx,guildId,userId));const [definitions,earned,event]=await Promise.all([this.db.achievement.findMany({where:{enabled:true},orderBy:{name:'asc'}}),this.db.memberAchievement.findMany({where:{guildId,userId}}),this.db.fullyFurnishedProgress.findUnique({where:{guildId_userId:{guildId,userId}}})]);const owned=new Map(earned.map(row=>[row.achievementId,row.earnedAt]));const progress:Record<string,string>={};if(event){progress['event.chair_historian']=event.chairHistorianAt?'1 / 1 complete':'0 / 1 complete';progress['event.properly_introduced']=event.properlyIntroducedAt?'1 / 1 complete':'0 / 1 complete';progress['event.armchair_architect']=event.armchairArchitectAt?'1 / 1 complete':'0 / 1 complete';progress['event.house_regular']=`${Math.min(10,event.casinoRounds)} / 10 rounds`;progress['event.button_masher']=`${Math.min(5,event.commandNames.length)} / 5 commands`;progress['fully_furnished']=`${[event.chairHistorianAt,event.properlyIntroducedAt,event.armchairArchitectAt,event.houseRegularAt,event.buttonMasherAt].filter(Boolean).length} / 5 complete`;}
  const visible=definitions.filter(definition=>!definition.id.startsWith('event.')||!definitions.some(candidate=>!candidate.id.startsWith('event.')&&candidate.name===definition.name));
  return visible.map(definition=>{const eventAlias=definitions.find(candidate=>candidate.id.startsWith('event.')&&candidate.name===definition.name),aliasId=eventAlias?.id,progressValue=progress[definition.id]??(aliasId?progress[aliasId]:undefined);return{id:definition.id,name:definition.name,class:definition.class,earnedAt:owned.get(definition.id)??(aliasId?owned.get(aliasId):undefined)??null,...(progressValue?{progress:progressValue}:{})};});}
 async refreshAchievements(guildId:string,userId:string){const p=await this.profile(guildId,userId),rules=await this.db.achievement.findMany({where:{enabled:true}});const metrics:Record<string,number>={gifts:p.giftsSent,crafts:p.progress?.successes??0,...Object.fromEntries(p.games.map(g=>[g.gameKey+'.wins',g.wins]))};const earned=earnedAchievements(rules.map(r=>({id:r.id,class:r.class,criteria:r.criteria as AchievementRule['criteria']})),metrics,new Set(p.achievements.map(a=>a.achievementId)));for(const achievementId of earned)await this.db.memberAchievement.upsert({where:{guildId_userId_achievementId:{guildId,userId,achievementId}},create:{guildId,userId,achievementId},update:{}});return earned;}
 async freeze(guildId:string,at=new Date(),posting?:Readonly<SpotlightPostingSettings>){
  const current=weeklyCycle(at),prior=weeklyCycle(new Date(current.start.getTime()-1));
  return this.atomic.run(guildId,'spotlight:'+prior.key,prior.key,async tx=>{
   const rows=await tx.activityDaily.findMany({where:{guildId,date:{gte:dateOf(prior.key),lt:dateOf(current.key)}}}),map=new Map<string,ActivityTotal>();for(const r of rows){const t=map.get(r.userId)??{userId:r.userId,messages:0,words:0,vcSeconds:0};t.messages+=r.messages;t.words+=r.words;t.vcSeconds+=r.vcSeconds;map.set(r.userId,t);}const result=spotlightWinners([...map.values()]);
   const recent=await tx.activityObservation.findMany({where:{guildId,kind:'message',occurredAt:{gte:new Date(current.start.getTime()-28*86400000),lt:current.start}}});const hours:Record<number,number>={};for(const o of recent){const weekday=new Intl.DateTimeFormat('en-US',{timeZone:'America/Denver',weekday:'short'}).format(o.occurredAt);if(weekday==='Mon')hours[o.hourMt]=(hours[o.hourMt]??0)+1;}const previous=await tx.spotlightFreeze.findFirst({where:{guildId},orderBy:{frozenAt:'desc'}});const postHour=learnedSpotlightHour(hours,previous?hour(previous.announceAt):undefined,posting);const [y,m,d]=current.key.split('-').map(Number);const announceAt=zonedDateTimeToUtc(y!,m!,d!,postHour);
   for(const w of result.winners)for(const userId of w.userIds){const history=await tx.weeklySpotlight.findMany({where:{guildId,category:w.category},orderBy:{weekStart:'desc'}});const precedingWeek=weeklyCycle(new Date(prior.start.getTime()-1)).start;const retained=history.some(h=>h.weekStart.getTime()===precedingWeek.getTime()&&h.userId===userId);const lifetimeWins=history.filter(h=>h.userId===userId).length+1;await tx.weeklySpotlight.create({data:{guildId,weekStart:prior.start,category:w.category,userId,winningValue:BigInt(w.value),lifetimeWins,statusLabel:retained?'RETAINED':lifetimeWins===1?'NEW WINNER':'TOOK THE TITLE'}});}
   await tx.spotlightFreeze.create({data:{guildId,weekKey:prior.key,frozenAt:current.start,snapshot:result,announceAt}});
   await tx.scheduledJob.upsert({where:{executionKey:`spotlight:announce:${guildId}:${prior.key}`},create:{guildId,jobType:'spotlight.announce',executionKey:`spotlight:announce:${guildId}:${prior.key}`,dueAt:announceAt,status:'PENDING',payload:{guildId,weekKey:prior.key}},update:{}});
   return{weekKey:prior.key,announceAt:announceAt.toISOString()};
  });
 }
 async leaderboard(guildId:string,category:string){
  if(category==='wealth'){const rows=await this.db.economyAccount.findMany({where:{guildId}});return rows.map(r=>({userId:r.userId,value:r.wallet+r.bank})).sort((a,b)=>a.value===b.value?a.userId.localeCompare(b.userId):a.value>b.value?-1:1);}
  if(category==='spotlight'){const rows=await this.db.weeklySpotlight.findMany({where:{guildId}}),map=new Map<string,number>();for(const r of rows)map.set(r.userId,(map.get(r.userId)??0)+1);return[...map].map(([userId,value])=>({userId,value})).sort((a,b)=>b.value-a.value);}
  if(category==='crime')return(await this.db.memberCrimeState.findMany({where:{guildId},orderBy:{successfulRobs:'desc'}})).map(r=>({userId:r.userId,value:r.successfulRobs}));
  if(category==='gambling'){const rows=await this.db.memberGameStats.findMany({where:{guildId,gameKey:{in:['blackjack','roulette','slots','dice','coinflip','lottery']}}}),map=new Map<string,number>();for(const r of rows)map.set(r.userId,(map.get(r.userId)??0)+r.wins);return[...map].map(([userId,value])=>({userId,value})).sort((a,b)=>b.value-a.value);}
  if(category==='wins'){const rows=await this.db.memberGameStats.findMany({where:{guildId,gameKey:{notIn:['skill_games','party_games']}}}),map=new Map<string,number>();for(const r of rows)map.set(r.userId,(map.get(r.userId)??0)+r.wins);return[...map].map(([userId,value])=>({userId,value})).sort((a,b)=>b.value-a.value);}
  if(['fmk_fucked','fmk_married','fmk_killed','fmk_agreement'].includes(category)){const key=category==='fmk_agreement'?'averageAgreement':category.slice(4),rows=await this.db.memberGameStats.findMany({where:{guildId,gameKey:category==='fmk_agreement'?'fmk':'fmk_subject'}});return rows.map(row=>({userId:row.userId,summary:fmkSummary([row])})).filter(row=>category!=='fmk_agreement'||row.summary.agreementRounds>0).map(row=>({userId:row.userId,value:row.summary[key as 'fucked'|'married'|'killed'|'averageAgreement']})).sort((a,b)=>b.value-a.value||a.userId.localeCompare(b.userId));}
  if(category==='crafting'){return(await this.db.craftingProgress.findMany({where:{guildId},orderBy:{successes:'desc'}})).map(r=>({userId:r.userId,value:r.successes}));}
  if(category==='collections'){const [sets,catalog,found]=await Promise.all([this.db.collectionSet.findMany({where:{enabled:true}}),this.db.catalogItem.findMany(),this.db.collectionDiscovery.findMany({where:{guildId}})]);const eligible=new Set(sets.flatMap(s=>s.itemIds).filter(id=>{const i=catalog.find(i=>i.id===id),meta=i?.metadata as Record<string,unknown>|null;return i&&meta?.limited!==true&&meta?.eventOnly!==true;}));const map=new Map<string,Set<string>>();for(const f of found)if(eligible.has(f.itemId)){const ids=map.get(f.userId)??new Set<string>();ids.add(f.itemId);map.set(f.userId,ids);}return[...map].map(([userId,ids])=>({userId,value:eligible.size?Math.floor(100*ids.size/eligible.size):0})).sort((a,b)=>b.value-a.value);}
  if(!['messages','words','voice'].includes(category))throw new DomainError('LEADERBOARD_CATEGORY','Choose a supported leaderboard category.');
  const visible=await this.db.member.findMany({where:{guildId,activityVisible:true}}),rows=await this.db.activityDaily.findMany({where:{guildId,userId:{in:visible.map(m=>m.userId)}}}),map=new Map<string,number>();for(const r of rows)map.set(r.userId,(map.get(r.userId)??0)+(category==='messages'?r.messages:category==='words'?r.words:r.vcSeconds));return[...map].map(([userId,value])=>({userId,value})).sort((a,b)=>b.value-a.value);
 }

 /** Shared record entry point: callers submit raw counters after committed feature results. */
 async record(guildId:string,userId:string,recordKey:string,value:bigint,requestKey:string,at=new Date()){
  if(!/^[a-z][a-z0-9_.]{0,79}$/.test(recordKey))throw new DomainError('RECORD_KEY','Invalid record category.');
  return this.atomic.run(guildId,'record:'+requestKey,requestFingerprint({userId,recordKey,value}),async tx=>{
   const changes=[];
   for(const scopeKey of ['alltime',recordMonth(at)]){
    const where={guildId_recordKey_scopeKey:{guildId,recordKey,scopeKey}},old=await tx.recordValue.findUnique({where});
    const oldData=old?.value as {amount?:string}|undefined;
    const change=compareRecord(value,old&&oldData?.amount?{value:oldData.amount,achievedAt:old.achievedAt.toISOString()}:null,at,recordDirection(recordKey));
    if(!change)continue;
    await tx.recordValue.upsert({where,create:{guildId,recordKey,scopeKey,userId,value:{amount:value.toString()},achievedAt:at},update:{userId,value:{amount:value.toString()},achievedAt:at}});
    const executionKey='record:announce:'+guildId+':'+requestKey+':'+scopeKey;
    await tx.scheduledJob.upsert({where:{executionKey},create:{guildId,executionKey,jobType:'record.announce',dueAt:at,status:'PENDING',payload:{guildId,userId,recordKey,scopeKey,...change}},update:{}});
    changes.push({scopeKey,...change});
   }
   return{changes};
  });
 }
 async records(guildId:string,scope:'alltime'|'monthly',at=new Date()){
  return this.db.recordValue.findMany({where:{guildId,scopeKey:scope==='monthly'?recordMonth(at):'alltime'},orderBy:{recordKey:'asc'}});
 }
 async awardDetails(guildId:string,weekKey:string){return this.db.weeklySpotlight.findMany({where:{guildId,weekStart:weeklyCycle(new Date(dateOf(weekKey).getTime()+12*3600000)).start},orderBy:[{category:'asc'},{userId:'asc'}]});}
 async announcement(guildId:string,weekKey:string){return this.db.spotlightFreeze.findUnique({where:{guildId_weekKey:{guildId,weekKey}}});}
 async claimAnnouncement(guildId:string,weekKey:string){return(await this.db.spotlightFreeze.updateMany({where:{guildId,weekKey,deliveryState:'PENDING'},data:{deliveryState:'SENDING'}})).count===1;}
 /**
  * Publication is the achievement boundary: Triple Threat is not awarded merely
  * because a week was frozen.  This transaction finalizes the exact Spotlight
  * delivery, links its winners to the public message, and grants the permanent
  * honor from that immutable weekly snapshot.  DeliveryEngine retries call this
  * same method after finding an already-sent message, so neither the award nor
  * its publication linkage can be duplicated after a restart.
  */
 async delivered(guildId:string,weekKey:string,messageId:string){await this.db.$transaction(async tx=>{
   const freeze=await tx.spotlightFreeze.findUniqueOrThrow({where:{guildId_weekKey:{guildId,weekKey}}});
   const result=freeze.snapshot as unknown as {tripleThreat?:unknown};
   const tripleThreat=Array.isArray(result.tripleThreat)?result.tripleThreat.filter((userId):userId is string=>typeof userId==='string'):[];
   for(const userId of new Set(tripleThreat)){
    await ensure(tx,guildId,userId);
    await tx.profileState.updateMany({where:{guildId,userId,tripleThreatAt:null},data:{tripleThreatAt:freeze.frozenAt}});
    await tx.memberAchievement.upsert({where:{guildId_userId_achievementId:{guildId,userId,achievementId:'spotlight.triple_threat'}},create:{guildId,userId,achievementId:'spotlight.triple_threat'},update:{}});
   }
   await tx.spotlightFreeze.update({where:{guildId_weekKey:{guildId,weekKey}},data:{deliveryState:'SENT',messageId}});
   await tx.weeklySpotlight.updateMany({where:{guildId,weekStart:weeklyCycle(new Date(dateOf(weekKey).getTime()+12*3600000)).start},data:{postedMessageId:messageId}});
  });}
 async reconcile(guildId:string,at=new Date(),posting?:Readonly<SpotlightPostingSettings>){
  const latest=await this.db.spotlightFreeze.findFirst({where:{guildId},orderBy:{frozenAt:'desc'}});
  const earliest=await this.db.activityDaily.findFirst({where:{guildId},orderBy:{date:'asc'}});
  const current=weeklyCycle(at);
  let boundary=latest?weeklyCycle(latest.frozenAt).next:earliest?weeklyCycle(new Date(earliest.date.getTime()+12*3600000)).next:current.start;
  while(boundary<=current.start){await this.freeze(guildId,boundary,posting);boundary=weeklyCycle(boundary).next;}
  await this.schedule(guildId,at);
 }
 async schedule(guildId:string,at=new Date()){const cycle=weeklyCycle(at);await this.db.scheduledJob.upsert({where:{executionKey:`spotlight:freeze:${guildId}:${cycle.key}`},create:{guildId,jobType:'spotlight.freeze',executionKey:`spotlight:freeze:${guildId}:${cycle.key}`,dueAt:cycle.next,status:'PENDING',payload:{guildId}},update:{}});}
}

