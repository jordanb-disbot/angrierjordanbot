import type { RenderDocument, Tone, UiNode } from './dsl.js';
const esc=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]??c));
const colors={
  bg:'#0B1220',panel:'#0F1E3A',panel2:'#17243A',border:'#29435F',gold:'#F5C542',goldWarm:'#FFD880',
  teal:'#14B8A6',emerald:'#10B981',muted:'#94A3B8',text:'#F8FAFC',danger:'#EF4444',warning:'#F59E0B',purple:'#8B5CF6',
};
const toneColor=(tone:Tone|undefined)=>tone==='muted'?colors.muted:tone==='danger'?colors.danger:tone==='warning'?colors.warning:tone==='success'?colors.emerald:colors.text;
const wrap=(input:string,maxChars:number):string[]=>{
  if(input.length<=maxChars)return [input];
  const words=input.split(/\s+/);const lines:string[]=[];let line='';
  for(const word of words){const next=line?`${line} ${word}`:word;if(next.length>maxChars&&line){lines.push(line);line=word;}else line=next;}
  if(line)lines.push(line);return lines;
};
export function renderSvg(doc:RenderDocument):string{
  let y=36; const lines:string[]=[];
  const text=(t:string,x:number,yPos:number,size=22,weight=500,fill=colors.text,anchor='start',family='Poppins, Arial, sans-serif')=>`<text x="${x}" y="${yPos}" font-family="${family}" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}">${esc(t)}</text>`;
  const render=(n:UiNode)=>{
    if(n.kind==='frame'){
      lines.push(`<defs><linearGradient id="ajbg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${colors.bg}"/><stop offset="0.58" stop-color="${colors.panel}"/><stop offset="1" stop-color="#07101D"/></linearGradient></defs>`);
      lines.push(`<rect x="20" y="20" width="${doc.width-40}" height="${doc.height-40}" rx="24" fill="url(#ajbg)" stroke="${colors.border}" stroke-width="2"/>`);
      lines.push(`<rect x="20" y="20" width="6" height="${doc.height-40}" rx="3" fill="${colors.teal}"/>`);
      y=70; lines.push(text(n.title,doc.width/2,y,30,750,colors.gold,'middle','Cinzel, Georgia, serif')); y+=30;
      if(n.subtitle){lines.push(text(n.subtitle,doc.width/2,y,15,650,colors.teal,'middle'));y+=28;}
      lines.push(`<line x1="52" y1="${y}" x2="${doc.width-52}" y2="${y}" stroke="${colors.border}"/>`);y+=12;
      for(const c of n.children)render(c); return;
    }
    if(n.kind==='text'){
      y+=20;const size=n.size??20;const lineHeight=n.lineHeight??Math.round(size*1.35);const maxChars=n.maxChars??72;const chunks=wrap(n.text,maxChars);const x=n.align==='center'?doc.width/2:n.align==='right'?doc.width-55:55;const anchor=n.align==='center'?'middle':n.align==='right'?'end':'start';
      for(const chunk of chunks){lines.push(text(chunk,x,y,size,n.weight??500,toneColor(n.tone),anchor));y+=lineHeight;}y+=8;return;
    }
    if(n.kind==='options'){
      y+=10; for(const it of n.items){const pct=it.percent!==undefined?` • ${it.percent.toFixed(0)}%`:'';const votes=it.votes!==undefined?` • ${it.votes} vote${it.votes===1?'':'s'}`:'';const optionLines=wrap(it.label,62);const boxH=Math.max(64,46+Math.max(0,optionLines.length-1)*24);lines.push(`<rect x="55" y="${y}" width="${doc.width-110}" height="${boxH}" rx="14" fill="${colors.panel2}" stroke="${it.key==='A'?colors.teal:colors.gold}"/>`);lines.push(text(it.key,78,y+30,18,800,it.key==='A'?colors.teal:colors.gold));let oy=y+30;for(const [i,line] of optionLines.entries()){lines.push(text(line,112,oy,17,650,colors.text));oy+=24;if(i===0&&(votes||pct))lines.push(text(`${votes}${pct}`.replace(/^ • /,''),doc.width-76,y+30,13,650,colors.muted,'end'));}y+=boxH+14;}return;
    }
    if(n.kind==='timer'){
      const total=Math.max(1,n.totalSeconds);const ratio=Math.max(0,Math.min(1,n.remainingSeconds/total));y+=8;lines.push(text(`${n.label}: ${n.remainingSeconds}s`,55,y,15,600,colors.muted));y+=14;lines.push(`<rect x="55" y="${y}" width="${doc.width-110}" height="10" rx="5" fill="#07101D"/><rect x="55" y="${y}" width="${(doc.width-110)*ratio}" height="10" rx="5" fill="${colors.teal}"/>`);y+=30;return;
    }
    if(n.kind==='stats'){y+=10;for(const it of n.items){lines.push(text(`${it.label}: ${it.value}`,55,y,15,600,colors.muted));y+=24;}return;}
    if(n.kind==='banner'){const fill=n.tone==='danger'?colors.danger:n.tone==='success'?colors.emerald:n.tone==='warning'?colors.warning:colors.purple;y+=12;lines.push(`<rect x="55" y="${y}" width="${doc.width-110}" height="48" rx="12" fill="${fill}" fill-opacity="0.18" stroke="${fill}"/>`);lines.push(text(n.text,doc.width/2,y+30,17,750,colors.text,'middle'));y+=64;}
  };
  for(const n of doc.nodes)render(n);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${doc.width}" height="${doc.height}" viewBox="0 0 ${doc.width} ${doc.height}"><rect width="100%" height="100%" rx="26" fill="${colors.bg}"/>${lines.join('')}</svg>`;
}
