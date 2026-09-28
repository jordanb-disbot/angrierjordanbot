import { NextRequest, NextResponse } from 'next/server';
import { getPrismaClient } from '../../../../../packages/database/src/client';
import { errorResponse, privateHeaders, requireAdmin } from '../../../lib/auth';

export const runtime='nodejs';
export const dynamic='force-dynamic';

const validQuery=(value:string)=>value.length>=2&&value.length<=64&&/^[\w .-]+$/.test(value);

export async function GET(request:NextRequest){
  try{
    const auth=await requireAdmin();
    const query=request.nextUrl.searchParams.get('q')?.trim()??'';
    if(!validQuery(query))return NextResponse.json({error:'Enter at least two letters from a saved alias or a Discord user ID.'},{status:400,headers:privateHeaders});
    const db=getPrismaClient();
    const members=await db.member.findMany({where:{guildId:auth.config.guildId,OR:[{userId:query},{alias:{contains:query,mode:'insensitive'}}]},take:12,orderBy:{updatedAt:'desc'},include:{economy:true,inventory:{select:{quantity:true}},selfRoles:{where:{active:true},select:{categoryKey:true}},presence:true}});
    const activeJails=members.length?await db.jailSentence.findMany({where:{guildId:auth.config.guildId,active:true,userId:{in:members.map(member=>member.userId)}},select:{userId:true,endsAt:true,indefinite:true}}):[];
    const jailByUser=new Map(activeJails.map(jail=>[jail.userId,jail]));
    return NextResponse.json({members:members.map(member=>{const jail=jailByUser.get(member.userId);return {userId:member.userId,alias:member.alias,wallet:member.economy?.wallet.toString()??'0',bank:member.economy?.bank.toString()??'0',bankTier:member.economy?.bankTier??1,inventoryEntries:member.inventory.length,inventoryQuantity:member.inventory.reduce((total,item)=>total+item.quantity,0),selfRoleCategories:[...new Set(member.selfRoles.map(role=>role.categoryKey))],needsRulesAck:member.presence?.needsRulesAck??true,activeJail:jail?{endsAt:jail.endsAt.toISOString(),indefinite:jail.indefinite}:null};})},{headers:privateHeaders});
  }catch(error){return errorResponse(error);}
}
