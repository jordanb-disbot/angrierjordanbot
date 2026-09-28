import {wrapText} from '../../renderer/src/text-layout.js';
import {shell,panel,text} from '../../features-events/src/visual.js';
const brass='#C6AE7A',cream='#F2E9DD',muted='#D8C6CA',wine='#592A39';
function prose(value:string,x:number,y:number,width:number,size=30,color=cream){const rows=wrapText(value,width,size),line=Math.ceil(size*1.42);return{svg:rows.map((s,n)=>text(x,y+n*line,s,size,color)).join(''),height:rows.length*line};}
function plate(label:string,value:string,x:number,y:number,width:number){const heading=prose(label,x+28,y+44,width-56,25,brass),body=prose(value,x+28,y+heading.height+61,width-56),height=heading.height+body.height+66;return{svg:`<g data-section="plate">${panel(x,y,width,height,brass)}<path d="M${x+16} ${y+43}V${y+16}H${x+43}" stroke="${brass}" fill="none"/>${heading.svg}<path d="M${x+28} ${y+heading.height+23}H${x+width-28}" stroke="${brass}" stroke-opacity=".3"/>${body.svg}</g>`,height};}
/** Distinct deterministic compositions share the approved lounge, owner-requested wine, and brass trim. */
export function learningWindow(title:string,copy:string){
 const width=1200,heading=prose(title,38,105,1124,44),top=112+heading.height;
 let body=text(38,48,'ANGRIER JORDAN · LEARN & BELONG',20,brass,'letter-spacing="2" font-weight="600"')+`<g font-family="Space Grotesk">${heading.svg}</g>`,y=top;
 const blocks=copy.split(/\n\s*\n/).filter(Boolean);
 if(title==='Your command directory'){
  const footer=blocks.at(-1)?.startsWith('Search with ')?blocks.pop():undefined;
  const columns=[y,y];
  for(const block of blocks){const [label,...rows]=block.split('\n'),commands=rows.join('\n').split('  ·  ').flatMap(v=>v.split('\n')).filter(Boolean),wide=commands.length>10;
   const col=columns[0]!<=columns[1]!?0:1,x=wide?24:24+col*584,w=wide?1152:568,start=wide?Math.max(...columns):columns[col]!,innerColumns=wide?2:1;
   const count=Math.ceil(commands.length/innerColumns),parts=Array.from({length:innerColumns},(_,n)=>commands.slice(n*count,(n+1)*count)),colWidth=(w-56-(innerColumns-1)*28)/innerColumns;
   const headingRows=prose(label!,x+24,start+37,w-48,26,brass),textTop=start+headingRows.height+51;
   const rendered=parts.map((part,n)=>prose(part.join('\n'),x+28+n*(colWidth+28),textTop,colWidth,32));
   const h=headingRows.height+Math.max(...rendered.map(p=>p.height))+64;
   body+=`<g data-layout="directory-column">${panel(x,start,w,h,brass)}${headingRows.svg}<path d="M${x+24} ${start+headingRows.height+14}H${x+w-24}" stroke="${brass}" stroke-opacity=".3"/>${rendered.map(p=>p.svg).join('')}</g>`;
   if(wide){columns[0]=columns[1]=start+h+16;}else columns[col]=start+h+16;
  }
  y=Math.max(...columns);
  if(footer){const f=prose(footer,38,y+29,1124,28,muted);body+=f.svg;y+=f.height+20;}
 }else if(title.includes('activity snapshot')){
  const rows=copy.split('\n'),meta=rows.shift()??'',counts=rows.filter(r=>/^\d+ /.test(r));body+=text(56,y+25,meta,25,brass);y+=55;
  for(let n=0;n<counts.length;n+=2){let row=0;for(let col=0;col<2;col++){const value=counts[n+col];if(!value)continue;const match=/^(\d+) (.*)$/.exec(value)!,x=42+567*col,label=prose(match[2]!,x+32,y+145,485,29,muted),h=170+label.height;body+=`<g data-layout="count-tile">${panel(x,y,549,h,brass)}${text(x+32,y+99,match[1]!,76,cream,'font-weight="600"')}${label.svg}</g>`;row=Math.max(row,h);}y+=row+22;}
  const remaining=rows.filter(r=>!counts.includes(r)).join('\n').trim(),p=prose(remaining,56,y+34,1088,27,muted);body+=p.svg;y+=p.height+42;
 }else{
  for(const block of blocks){if(/^LESSON \d+ OF 4$/.test(block)){body+=text(38,y+26,block,27,brass);y+=50;continue;}const [label,...rest]=block.split('\n');if(rest.length&&/^[A-Z][A-Z ·—0-9]+$/.test(label!)){const p=plate(label!,rest.join('\n'),24,y,1152);body+=p.svg;y+=p.height+20;}
   else{const p=prose(block,52,y+39,1096,32,muted),h=p.height+48;body+=`<g data-layout="guidance">${panel(24,y,1152,h,brass)}${p.svg}</g>`;y+=h+20;}}
 }
 const height=y+64;
 body+=`<path d="M54 ${y+5}H465M735 ${y+5}H1146" stroke="${brass}" stroke-opacity=".5"/>${text(600,y+13,'SIT. PLAY. BELONG.',21,brass,'text-anchor="middle" letter-spacing="2"')}`;
 return shell(height,`<rect width="1200" height="${height}" fill="${wine}" opacity=".45"/><rect x="22" y="22" width="1156" height="${height-44}" rx="12" fill="#101622" fill-opacity=".32" stroke="${brass}" stroke-opacity=".5"/><g font-family="Inter">${body}</g>`,0,width)
 .replace(/<linearGradient id="glass"[\s\S]*?<\/linearGradient>/,'<linearGradient id="glass" x2="1" y2="1"><stop stop-color="#592A39" stop-opacity=".95"/><stop offset=".55" stop-color="#291D2D" stop-opacity=".96"/><stop offset="1" stop-color="#101622" stop-opacity=".97"/></linearGradient>')
 .replace('stroke="#00D7CF"',`stroke="${brass}"`);
}
