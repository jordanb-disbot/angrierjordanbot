import { NextResponse } from 'next/server';
import { DomainError } from '../../../../../packages/core/src/errors';
import type { DraftCommand } from '../../../../../packages/core/src/config-draft';
import { errorResponse, privateHeaders, requireAdmin } from '../../../lib/auth';
import { draftService } from '../../../lib/drafts';
import { assertSettingsWriteEnabled, validateCsrf } from '../../../lib/security.mjs';

export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(request:Request){
  try{
    const {config,session,access}=await requireAdmin(),actor={...access,userId:session.userId};
    const key=new URL(request.url).searchParams.get('history');
    return NextResponse.json(key?{history:await draftService().history(config.guildId,actor,key)}:{draft:await draftService().view(config.guildId,actor)},{headers:privateHeaders});
  }catch(error){return draftError(error);}
}
export async function POST(request:Request){
  try{
    const {config,session,access}=await requireAdmin();validateCsrf(request,session,config);assertSettingsWriteEnabled();
    const text=await request.text();if(text.length>32768)return NextResponse.json({error:'REQUEST_TOO_LARGE'},{status:413,headers:privateHeaders});
    const body=JSON.parse(text) as {requestId:string;command:DraftCommand};
    const result=await draftService().execute({guildId:config.guildId,actor:{...access,userId:session.userId},requestId:body.requestId},body.command);
    return NextResponse.json({result},{headers:privateHeaders});
  }catch(error){return draftError(error);}
}
function draftError(error:unknown){
  if(error instanceof DomainError)return NextResponse.json({error:error.code,message:error.message},{status:409,headers:privateHeaders});
  if(error instanceof SyntaxError)return NextResponse.json({error:'INVALID_JSON'},{status:400,headers:privateHeaders});
  return errorResponse(error);
}
