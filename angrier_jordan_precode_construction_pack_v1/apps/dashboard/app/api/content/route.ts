import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { getPrismaClient } from '../../../../../packages/database/src/client';
import { errorResponse, privateHeaders, requireAdmin } from '../../../lib/auth';
import { assertSettingsWriteEnabled, validateCsrf } from '../../../lib/security.mjs';

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

export async function POST(request:NextRequest){
  try{
    const {config,session}=await requireAdmin();
    validateCsrf(request,session,config);assertSettingsWriteEnabled();
    const raw=await request.text();if(raw.length>2048)return NextResponse.json({error:'REQUEST_TOO_LARGE'},{status:413,headers:privateHeaders});
    const body=JSON.parse(raw) as {id?:unknown;enabled?:unknown};
    if(typeof body.id!=='string'||body.id.length>160||!/^[-a-zA-Z0-9_.:]+$/.test(body.id)||typeof body.enabled!=='boolean')return NextResponse.json({error:'INVALID_CONTENT_UPDATE'},{status:400,headers:privateHeaders});
    const id=body.id,enabled=body.enabled;
    const db=getPrismaClient();
    const result=await db.$transaction(async tx=>{
      const current=await tx.contentEntry.findUnique({where:{id}});if(!current)return null;
      if(current.enabled===enabled)return {entry:current,changed:false};
      const entry=await tx.contentEntry.update({where:{id:current.id},data:{enabled}});
      await tx.auditEvent.create({data:{guildId:config.guildId,actorUserId:session.userId,source:'dashboard',action:'dashboard.content.enabled',targetType:'content_entry',targetId:entry.id,before:{enabled:current.enabled},after:{enabled:entry.enabled},requestId:randomUUID(),createdAt:new Date()}});
      return {entry,changed:true};
    });
    if(!result)return NextResponse.json({error:'CONTENT_NOT_FOUND'},{status:404,headers:privateHeaders});
    return NextResponse.json({id:result.entry.id,enabled:result.entry.enabled,changed:result.changed},{headers:privateHeaders});
  }catch(error){return errorResponse(error);}
}
