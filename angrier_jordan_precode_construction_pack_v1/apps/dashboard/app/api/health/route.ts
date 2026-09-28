import {getPrismaClient} from '../../../../../packages/database/src/client';
export const runtime='nodejs';
export const dynamic='force-dynamic';

export async function GET(){
  let timer:ReturnType<typeof setTimeout>|undefined;
  const started=Date.now();
  try{
    const ok=await Promise.race([getPrismaClient().$queryRaw`SELECT 1`.then(()=>true,()=>false),new Promise<boolean>(resolve=>{timer=setTimeout(()=>resolve(false),2000);})]);
    return Response.json({status:ok?'ok':'unavailable',latencyMs:Date.now()-started},{status:ok?200:503,headers:{'Cache-Control':'no-store'}});
  }finally{if(timer)clearTimeout(timer);}
}
