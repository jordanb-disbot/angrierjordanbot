import {createServer,type Server} from 'node:http';

/** Readiness discloses no internal error details or credentials. */
export async function startRuntimeHealth(port:number,ready:()=>boolean,probe:()=>Promise<unknown>,host='::'):Promise<Server>{
  let inFlight:Promise<boolean>|undefined;
  const databaseReady=()=>inFlight??(inFlight=(async()=>{
    let timeout:ReturnType<typeof setTimeout>|undefined;
    try{return await Promise.race([probe().then(()=>true,()=>false),new Promise<boolean>(resolve=>{timeout=setTimeout(()=>resolve(false),2000);})]);}
    finally{if(timeout)clearTimeout(timeout);inFlight=undefined;}
  })());
  const server=createServer((req,res)=>{
    if(req.method!=='GET'||!['/livez','/readyz'].includes(req.url??'')){res.writeHead(404);res.end();return;}
    void (async()=>{
      const ok=req.url==='/livez'||(ready()&&await databaseReady());
      res.writeHead(ok?200:503,{'Content-Type':'application/json','Cache-Control':'no-store'});
      res.end(JSON.stringify({status:ok?'ok':'unavailable'}));
    })().catch(()=>{res.writeHead(503);res.end('{"status":"unavailable"}');});
  });
  await new Promise<void>((resolve,reject)=>{server.once('error',reject);server.listen(port,host,resolve);});
  return server;
}
