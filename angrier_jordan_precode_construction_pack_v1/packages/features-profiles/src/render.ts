export interface SpotlightRenderInput {
 weekStart:string;weekEnd:string;activeMembers:number;messages:number;words:number;voiceSeconds:number;
 categories:{title:string;winners:{name:string;avatarData:string;total:string;lifetimeWins:number;status:string;tripleThreat:boolean}[]}[];
}
const escape=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]!));
/** Deterministic runtime composition using actual frozen totals and resolved Discord identity. */
export function renderSpotlight(data:SpotlightRenderInput):string{
 const height=300+Math.max(1,...data.categories.map(c=>c.winners.length))*154;
 const text=(s:string,x:number,y:number,size=18,color='#F8FAFC',family='Poppins, Arial, sans-serif')=>`<text x="${x}" y="${y}" font-family="${family}" font-size="${size}" fill="${color}">${escape(s)}</text>`;
 let body=text('WEEKLY SPOTLIGHT',42,65,34,'#D6B76E','Cinzel, Georgia, serif')+text(data.weekStart+' — '+data.weekEnd+' · Mountain Time',42,102,17,'#94A3B8');
 for(const [n,category] of data.categories.entries()){
  const x=30+n*390;body+=`<rect x="${x}" y="130" width="370" height="${height-230}" rx="16" fill="#112039" stroke="#29435F"/>`+text(category.title,x+18,165,20,'#14B8A6');
  if(!category.winners.length)body+=text('No qualifying winner',x+18,210,16,'#94A3B8');
  category.winners.forEach((w,index)=>{const y=190+index*154;if(!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(w.avatarData))throw new Error('Spotlight requires a resolved avatar image.');body+=`<image x="${x+18}" y="${y}" width="56" height="56" href="${w.avatarData}"/>`+text(w.name.slice(0,24),x+86,y+24,18)+text(w.total,x+86,y+49,16,'#D6B76E')+text(w.status+' · '+w.lifetimeWins+' lifetime wins',x+18,y+82,13,'#94A3B8')+(w.tripleThreat?`<rect x="${x+18}" y="${y+98}" width="334" height="28" rx="8" fill="#D6B76E"/>`+text('TRIPLE THREAT · PERMANENT',x+31,y+117,12,'#0B1220'):'');});
 }
 body+=text(data.activeMembers+' active members · '+data.messages+' messages · '+data.words+' words',42,height-58,17,'#94A3B8')+text(data.voiceSeconds+' qualifying voice seconds',42,height-30,17,'#94A3B8');
 return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="${height}" viewBox="0 0 1200 ${height}"><rect width="1200" height="${height}" rx="24" fill="#0B1220"/>${body}</svg>`;
}
