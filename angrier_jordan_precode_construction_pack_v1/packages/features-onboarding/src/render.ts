import {shell,panel,text} from '../../features-events/src/visual.js';
import {wrapText} from '../../renderer/src/text-layout.js';

const brass='#CBA675',cream='#FFF1DF',muted='#DBC5C7';
export interface GuidanceSection {title:string;body:string}
/** Readable sections grow with their content; server policy is never truncated. */
export function renderOnboarding(title:string,subtitle:string,sections:readonly GuidanceSection[]){
 let y=180,body=text(58,51,'ANGRIER JORDAN · WELCOME TO CHAIRS',19,brass,'font-weight="700" letter-spacing="2"')+text(58,109,title,43,cream,'font-family="Cinzel" font-weight="700"')+text(58,148,subtitle,23,muted,'font-weight="500"');
 for(const [i,section] of sections.entries()){
  const lines=section.body.split('\n').flatMap(line=>wrapText(line,1010,30)),height=103+lines.length*43;
  body+=panel(38,y,1124,height,i%2?brass:'#B97585')+`<rect x="49" y="${y+11}" width="1102" height="${height-22}" rx="7" fill="none" stroke="${brass}" stroke-opacity=".18"/><path d="M64 ${y+46}V${y+25}H86" fill="none" stroke="${brass}"/>`;
  body+=text(82,y+48,section.title,27,brass,'font-weight="700"');
  body+=lines.map((line,n)=>text(82,y+94+n*43,line,30,cream,'font-weight="500"')).join('');y+=height+18;
 }
 body+=text(600,y+24,'SIT. PLAY. BELONG.',19,brass,'text-anchor="middle" letter-spacing="4" font-weight="600"');
 return shell(y+54,`<rect width="1200" height="${y+54}" fill="#300D20" opacity=".37"/><g font-family="Poppins">${body}</g>`,0,1200)
 .replace(/<linearGradient id="glass"[\s\S]*?<\/linearGradient>/,'<linearGradient id="glass" x2="1" y2="1"><stop stop-color="#4A2431" stop-opacity=".97"/><stop offset=".6" stop-color="#241B2A" stop-opacity=".97"/><stop offset="1" stop-color="#0B1220" stop-opacity=".97"/></linearGradient>')
 .replace('stroke="#00D7CF"',`stroke="${brass}"`);
}

export function rulesSections(content:string):GuidanceSection[][]{
 const chunks: string[]=[];
 for(const paragraph of content.split(/\n\s*\n/).filter(x=>x.trim())){
  const lines=wrapText(paragraph,1010,30);
  for(let n=0;n<lines.length;n+=8)chunks.push(lines.slice(n,n+8).join('\n'));
 }
 return chunks.map((body,i)=>[{title:`Server rules · ${i+1} of ${chunks.length}`,body}]);
}
