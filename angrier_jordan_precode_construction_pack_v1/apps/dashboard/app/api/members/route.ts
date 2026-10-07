import { NextRequest, NextResponse } from 'next/server';
import { getPrismaClient } from '../../../../../packages/database/src/client';
import { directoryMatches, normalizeDirectoryQuery } from '../../../../../packages/database/src/member-directory';
import { errorResponse, privateHeaders, requireAdmin } from '../../../lib/auth';

export const runtime='nodejs';
export const dynamic='force-dynamic';

const validQuery=(value:string)=>value.length>=2&&value.length<=64&&/^[\w .-]+$/.test(value);

export async function GET(request:NextRequest){
  try{
    const auth=await requireAdmin();
    const query=request.nextUrl.searchParams.get('q')?.trim()??'';
    if(!validQuery(query)||!normalizeDirectoryQuery(query))return NextResponse.json({error:'Enter at least two letters from a Discord ID, nickname, display name, or username.'},{status:400,headers:privateHeaders});
    const db=getPrismaClient();
    const normalized=normalizeDirectoryQuery(query);
    const directory=(await db.memberDirectory.findMany({where:{guildId:auth.config.guildId,archivedAt:null,OR:[{userId:query},{searchText:{contains:normalized,mode:'insensitive'}}]},take:24,orderBy:{lastSyncedAt:'desc'}})).filter(member=>directoryMatches(member,query)).slice(0,12);
    const userIds=directory.map(member=>member.userId);
    const records=userIds.length?await db.member.findMany({where:{guildId:auth.config.guildId,userId:{in:userIds}},include:{economy:true,inventory:{select:{quantity:true}},selfRoles:{where:{active:true},select:{categoryKey:true}},presence:true}}):[];
    const recordsByUser=new Map(records.map(member=>[member.userId,member]));
    const activeJails=userIds.length?await db.jailSentence.findMany({where:{guildId:auth.config.guildId,active:true,userId:{in:userIds}},select:{userId:true,endsAt:true,indefinite:true}}):[];
    const jailByUser=new Map(activeJails.map(jail=>[jail.userId,jail]));
    return NextResponse.json({members:directory.map(entry=>{const member=recordsByUser.get(entry.userId),jail=jailByUser.get(entry.userId);return {userId:entry.userId,nickname:entry.nickname,displayName:entry.displayName,username:entry.username,lastSyncedAt:entry.lastSyncedAt.toISOString(),wallet:member?.economy?.wallet.toString()??'0',bank:member?.economy?.bank.toString()??'0',bankTier:member?.economy?.bankTier??1,inventoryEntries:member?.inventory.length??0,inventoryQuantity:member?.inventory.reduce((total,item)=>total+item.quantity,0)??0,selfRoleCategories:[...new Set(member?.selfRoles.map(role=>role.categoryKey)??[])],needsRulesAck:member?.presence?.needsRulesAck??true,activeJail:jail?{endsAt:jail.endsAt.toISOString(),indefinite:jail.indefinite}:null};}),disambiguation:directory.length>1},{headers:privateHeaders});
  }catch(error){return errorResponse(error);}
}
