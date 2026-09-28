import { NextRequest, NextResponse } from 'next/server';
import { getPrismaClient } from '../../../../../packages/database/src/client';
import { errorResponse, privateHeaders, requireAdmin } from '../../../lib/auth';

export const runtime='nodejs';
export const dynamic='force-dynamic';

const textOf=(payload:unknown)=>{
  if(payload&&typeof payload==='object'&&!Array.isArray(payload)){const value=(payload as Record<string,unknown>).text??(payload as Record<string,unknown>).scenario;if(typeof value==='string')return value;}
  return 'Structured content entry';
};

export async function GET(request:NextRequest){
  try{
    await requireAdmin();
    const game=request.nextUrl.searchParams.get('game')?.trim()??'';
    if(!/^[a-z_]{2,40}$/.test(game))return NextResponse.json({error:'Select a content pool.'},{status:400,headers:privateHeaders});
    const entries=await getPrismaClient().contentEntry.findMany({where:{game},orderBy:[{enabled:'desc'},{useCount:'asc'},{id:'asc'}],take:60,select:{id:true,game:true,category:true,enabled:true,useCount:true,lastUsedAt:true,payload:true,tags:true}});
    return NextResponse.json({entries:entries.map(entry=>({id:entry.id,game:entry.game,category:entry.category,enabled:entry.enabled,useCount:entry.useCount,lastUsedAt:entry.lastUsedAt?.toISOString()??null,tags:entry.tags,text:textOf(entry.payload)}))},{headers:privateHeaders});
  }catch(error){return errorResponse(error);}
}
