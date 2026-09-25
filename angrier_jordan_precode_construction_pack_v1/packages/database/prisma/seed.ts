import { Prisma, PrismaClient } from '@prisma/client';
import fs from 'node:fs/promises';
const prisma=new PrismaClient();
const fixture=JSON.parse(await fs.readFile(new URL('../../testing/fixtures/dev_server.json',import.meta.url),'utf8'));
const defaults=JSON.parse(await fs.readFile(new URL('../../testing/fixtures/settings_seed.json',import.meta.url),'utf8'));
await prisma.guild.upsert({where:{id:fixture.guild.id},update:{name:fixture.guild.name},create:fixture.guild});
for(const m of fixture.members){
  await prisma.member.upsert({where:{guildId_userId:{guildId:fixture.guild.id,userId:m.userId}},update:{},create:{guildId:fixture.guild.id,userId:m.userId}});
  await prisma.economyAccount.upsert({where:{guildId_userId:{guildId:fixture.guild.id,userId:m.userId}},update:{wallet:BigInt(m.wallet),bank:BigInt(m.bank)},create:{guildId:fixture.guild.id,userId:m.userId,wallet:BigInt(m.wallet),bank:BigInt(m.bank)}});
}
for(const [key,value] of Object.entries(defaults as Record<string,Prisma.InputJsonValue>)) await prisma.configValue.upsert({where:{guildId_key:{guildId:fixture.guild.id,key}},update:{value},create:{guildId:fixture.guild.id,key,value}});

const roleCategories=[
  ['gender','Gender','single'],['age','Age','single'],['regions','Regions','single'],['vices','Vices','multi'],
  ['personalities','Personalities','multi'],['pings','Pings','multi'],['dm_status','DM Status','single'],
].map(([key,label,mode])=>({key,label,mode,options:[]}));
await prisma.selfRolePanel.upsert({
  where:{guildId_name:{guildId:fixture.guild.id,name:'Default Roles'}},
  update:{enabled:true,config:{categories:roleCategories}},
  create:{guildId:fixture.guild.id,name:'Default Roles',enabled:true,config:{categories:roleCategories}},
});
await prisma.$disconnect();
