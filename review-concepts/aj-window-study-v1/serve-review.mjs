import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root=fileURLToPath(new URL('./',import.meta.url));
const fonts=fileURLToPath(new URL('../../angrier_jordan_precode_construction_pack_v1/packages/renderer/fonts/',import.meta.url));
const types={'.html':'text/html; charset=utf-8','.png':'image/png','.gif':'image/gif','.webp':'image/webp','.ttf':'font/ttf'};
http.createServer(async(req,res)=>{
  try {
    const requested=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);
    let target;
    if(requested.endsWith('/Inter-Variable.ttf'))target=path.join(fonts,'Inter-Variable.ttf');
    else if(requested.endsWith('/SpaceGrotesk-Variable.ttf'))target=path.join(fonts,'SpaceGrotesk-Variable.ttf');
    else {
      target=path.resolve(root,requested==='/'?'line-states/index.html':'.'+requested);
      if(!target.startsWith(root))throw Error('outside review');
    }
    const type=types[path.extname(target)];
    if(!type)throw Error('unsupported review asset');
    const data=await fs.readFile(target);
    res.writeHead(200,{'Content-Type':type,'Cache-Control':'no-store'});res.end(data);
  }catch{res.writeHead(404);res.end('Review asset not found');}
}).listen(8766,'127.0.0.1',()=>console.log('Standalone Line visual review: http://127.0.0.1:8766/line-states/index.html'));
