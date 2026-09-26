import {wrapText} from '../../renderer/src/text-layout.js';
import {shell,panel,text} from '../../features-events/src/visual.js';
const brass='#C6AE7A',cream='#F2E9DD',muted='#D8C6CA',wine='#592A39';
function prose(value:string,x:number,y:number,width:number,size=30,color=cream){const rows=wrapText(value,width,size),line=Math.ceil(size*1.42);return{svg:rows.map((s,n)=>text(x,y+n*line,s,size,color)).join(''),height:rows.length*line};}
function plate(label:string,value:string,x:number,y:number,width:number){const heading=prose(label,x+28,y+44,width-56,25,brass),body=prose(value,x+28,y+heading.height+61,width-56),height=heading.height+body.height+92;return{svg:`<g data-section="plate">${panel(x,y,width,height,brass)}<path d="M${x+16} ${y+43}V${y+16}H${x+43}" stroke="${brass}" fill="none"/>${heading.svg}<path d="M${x+28} ${y+heading.height+23}H${x+width-28}" stroke="${brass}" stroke-opacity=".3"/>${body.svg}</g>`,height};}
/** Distinct deterministic compositions share the approved lounge, owner-requested wine, and brass trim. */
export function learningWindow(title:string,copy:string){
 const width=1200,heading=prose(title,54,114,1092,44),top=140+heading.height;
 let body=text(54,54,'ANGRIER JORDAN · LEARN & BELONG',20,brass,'letter-spacing="2" font-weight="600"')+`<g font-family="Cinzel">${heading.svg}</g>`,y=top;
 const blocks=copy.split(/\n\s*\n/).filter(Boolean);
 if(title==='Your command directory'){
  const footer=blocks.at(-1)?.startsWith('Search with ')?blocks.pop():undefined;
  for(let n=0;n<blocks.length;n+=2){let row=0;for(let col=0;col<2;col++){const b=blocks[n+col];if(!b)continue;const [label,...lines]=b.split('\n'),p=plate(label!,lines.join('\n').replaceAll('  ·  ','\n'),42+col*567,y,549);body+=`<g data-layout="directory-column">${p.svg}</g>`;row=Math.max(row,p.height);}y+=row+20;}
  if(footer){const f=prose(footer,56,y+31,1088,25,muted);body+=f.svg;y+=f.height+24;}
 }else if(title.includes('activity snapshot')){
  const rows=copy.split('\n'),meta=rows.shift()??'',counts=rows.filter(r=>/^\d+ /.test(r));body+=text(56,y+25,meta,25,brass);y+=55;
  for(let n=0;n<counts.length;n+=2){let row=0;for(let col=0;col<2;col++){const value=counts[n+col];if(!value)continue;const match=/^(\d+) (.*)$/.exec(value)!,x=42+567*col,label=prose(match[2]!,x+32,y+145,485,29,muted),h=170+label.height;body+=`<g data-layout="count-tile">${panel(x,y,549,h,brass)}${text(x+32,y+99,match[1]!,76,cream,'font-weight="600"')}${label.svg}</g>`;row=Math.max(row,h);}y+=row+22;}
  const remaining=rows.filter(r=>!counts.includes(r)).join('\n').trim(),p=prose(remaining,56,y+34,1088,27,muted);body+=p.svg;y+=p.height+42;
 }else{
  for(const block of blocks){const [label,...rest]=block.split('\n');if(rest.length&&/^[A-Z][A-Z ·—0-9]+$/.test(label!)){const p=plate(label!,rest.join('\n'),42,y,1116);body+=p.svg;y+=p.height+20;}
   else{const p=prose(block,72,y+43,1056,30,muted),h=p.height+70;body+=`<g data-layout="guidance">${panel(42,y,1116,h,brass)}${p.svg}</g>`;y+=h+20;}}
 }
 const height=y+64;
 body+=`<path d="M54 ${y+5}H505M695 ${y+5}H1146" stroke="${brass}" stroke-opacity=".5"/>${text(600,y+13,'SIT. PLAY. BELONG.',17,brass,'text-anchor="middle" letter-spacing="2"')}`;
 return shell(height,`<rect width="1200" height="${height}" fill="${wine}" opacity=".45"/><rect x="22" y="22" width="1156" height="${height-44}" rx="12" fill="#101622" fill-opacity=".32" stroke="${brass}" stroke-opacity=".5"/><g font-family="Poppins">${body}</g>`,0,width)
 .replace(/<linearGradient id="glass"[\s\S]*?<\/linearGradient>/,'<linearGradient id="glass" x2="1" y2="1"><stop stop-color="#592A39" stop-opacity=".95"/><stop offset=".55" stop-color="#291D2D" stop-opacity=".96"/><stop offset="1" stop-color="#101622" stop-opacity=".97"/></linearGradient>')
 .replace('stroke="#00D7CF"',`stroke="${brass}"`);
}
