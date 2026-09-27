import {randomUUID} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import {pathToFileURL} from 'node:url';
import {productionIntroductionsTarget} from './enable-production-introductions.mjs';

const presentation=['headerText','footerText','showAvatar','showDisplayName','showJoinDate','allowAdminIntroConfig'];
const expectedIds=['name','doc','opinion','last_meal','chair'];
export const approvedQuestions=[
 'What should we call you?',
 'What is your drug of choice?',
 'What is your most controversial opinion?',
 'If on death row, what would your last meal be?',
 'What is your favorite type of chair?'
];

/** Preserve stable answer IDs and retire replaced prompts; never repurpose their answers. */
export function revisedIntroductionForm(current,guildId,defaults,now=new Date()){
 if(!isDeepStrictEqual(defaults.map(p=>p.id),expectedIds)||!isDeepStrictEqual(defaults.map(p=>p.label),approvedQuestions))throw Error('Deploy the approved five-question build first');
 const ids=new Set(defaults.map(p=>guildId+'_'+p.id));
 const retired=current.prompts.filter(p=>!ids.has(p.id)).map(p=>({...p,enabled:false,deletedAt:p.deletedAt??now.toISOString()}));
 const prompts=defaults.map((p,n)=>({...p,id:guildId+'_'+p.id,sortOrder:n,placeholder:null,minLength:null,enabled:true,showOnCard:true,deletedAt:null}));
 return JSON.parse(JSON.stringify({...current,prompts:[...prompts,...retired]}));
}

export async function updateProductionIntroductionQuestions({guildId,db,config,repo,domain,write=console.log}){
 if(!await db.guild.findUnique({where:{id:guildId},select:{id:true}}))throw Error('Production guild missing');
 const [stored,channel,feature,runtime]=await Promise.all([
  config.getWithMetadata(guildId,'introductions.form'),config.getWithMetadata(guildId,'channels.introduction_channel'),config.getWithMetadata(guildId,'features.introductions'),repo.configuration(guildId)
 ]);
 if(typeof channel.value!=='string'||!/^\d{17,20}$/.test(channel.value)||runtime.config.introductionChannelId!==channel.value)throw Error('Existing introduction destination must match');
 const valid=value=>{try{domain.validateIntroForm(value,value);return true;}catch{return false;}};
 let current=stored.value;
 if(!valid(current))current={title:runtime.form.title,prompts:runtime.form.prompts.map(({formId,...p})=>p),...Object.fromEntries(presentation.map(key=>[key,runtime.config[key]]))};
 domain.validateIntroForm(current,current);
 // Include historical runtime records even if omitted from the published settings.
 const known=new Set(current.prompts.map(p=>p.id));
 current={...current,prompts:[...current.prompts,...runtime.form.prompts.filter(p=>!known.has(p.id)).map(({formId,...p})=>p)]};
 const next=revisedIntroductionForm(current,guildId,domain.INTRO_DEFAULTS);
 domain.validateIntroForm(next,next);
 if(!isDeepStrictEqual(stored.value,next))await config.set({guildId,key:'introductions.form',value:next,expectedVersion:stored.version,source:'operator.production-introduction-questions-v2',requestId:randomUUID()});
 await repo.configure(guildId,channel.value,next);
 const [verified,after,newChannel,newFeature]=await Promise.all([config.getWithMetadata(guildId,'introductions.form'),repo.configuration(guildId),config.getWithMetadata(guildId,'channels.introduction_channel'),config.getWithMetadata(guildId,'features.introductions')]);
 if(!isDeepStrictEqual(verified.value,next))throw Error('Published form verification failed');
 domain.validateIntroForm(after.form,after.config);
 const active=domain.activePrompts(after.form);
 if(!isDeepStrictEqual(active.map(p=>p.id),expectedIds.map(id=>guildId+'_'+id))||!isDeepStrictEqual(active.map(p=>p.label),approvedQuestions)||active.some(p=>!p.showOnCard))throw Error('Runtime questions verification failed');
 if(after.config.introductionChannelId!==channel.value||after.config.panelMessageId!==runtime.config.panelMessageId||!isDeepStrictEqual(newChannel,channel)||!isDeepStrictEqual(newFeature,feature)||presentation.some(key=>after.config[key]!==next[key]))throw Error('Preserved settings verification failed');
 write('PASS: introductions.form contains the five approved questions in order.');
 write('PASS: replaced prompts retired; stored answers preserved.');
 write('PASS: runtime form verified; introduction channel, feature flag, control panel and presentation preserved.');
}

export async function main(env=process.env,{connect,write=console.log,error=console.error}={}){
 let db;
 try{
  const target=productionIntroductionsTarget(env),connection=connect?await connect(target):await connectProduction(target);db=connection.db;
  await updateProductionIntroductionQuestions({...connection,guildId:target.guildId,write});
 }catch{error('FAIL: Introduction question update failed; verify target and current configuration before retrying. No exception details displayed.');return 1;}
 finally{if(db)try{await db.$disconnect();}catch{error('FAIL: Database disconnect failed.');return 1;}}
 return 0;
}

async function connectProduction(target){
 const [{PrismaClient},{PrismaConfigRepository,PrismaAuditSink},{ConfigService},{AuditService},{SETTINGS},domain,{PrismaIntroductionsRepository}]=await Promise.all([
  import('@prisma/client'),import('../dist/packages/database/src/prisma-adapters.js'),import('../dist/packages/core/src/config-service.js'),import('../dist/packages/core/src/audit.js'),import('../dist/packages/contracts/src/generated/settings.js'),import('../dist/packages/features-introductions/src/domain.js'),import('../dist/packages/features-introductions/src/prisma-repository.js')
 ]);
 const db=new PrismaClient({datasourceUrl:target.databaseUrl,log:[]});
 return {db,config:new ConfigService(SETTINGS,new PrismaConfigRepository(db),new AuditService(new PrismaAuditSink(db))),domain,repo:new PrismaIntroductionsRepository(db)};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)process.exitCode=await main();
