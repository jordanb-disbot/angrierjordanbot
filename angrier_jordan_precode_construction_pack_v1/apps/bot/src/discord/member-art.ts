import type {Client} from 'discord.js';
import sharp from 'sharp';
import {fetchChairismMedia} from './chairisms-security.js';

/** Cosmetic media only: the existing bounded Discord CDN decoder enforces network safety. */
export async function avatarData(value?:string):Promise<string>{
 if(!value)return'';
 try{
  if(value.startsWith('data:')){
   if(value.length>1_400_000||!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(value))return'';
   const image=sharp(Buffer.from(value.slice(value.indexOf(',')+1),'base64'),{limitInputPixels:16_000_000,animated:false});
   const meta=await image.metadata();if(!['png','jpeg','webp'].includes(meta.format??'')||(meta.pages??1)>1)return'';
   return 'data:image/png;base64,'+(await image.resize(128,128,{fit:'cover'}).png().toBuffer()).toString('base64');
  }
  return await fetchChairismMedia(value,'avatar');
 }catch{return'';}
}
/** Never changes persisted identities or eligibility. Missing Discord/media data is a cosmetic fallback. */
export async function memberArt(client:Client,serverId:string,memberId:string):Promise<{name:string;handle:string;avatarData:string}|undefined>{
 try{
  const server=await client.guilds.fetch(serverId);
  const member=await server.members.fetch({user:memberId,force:true}).catch(()=>null);
  const user=member?.user??await client.users.fetch(memberId).catch(()=>null);
  if(!member&&!user)return;
  return{name:member?.displayName??user!.displayName,handle:user?.username??'',avatarData:await avatarData((member??user!).displayAvatarURL({extension:'png',size:256}))};
 }catch{return;}
}
