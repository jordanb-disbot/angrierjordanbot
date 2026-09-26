/** Split only at an explicit renderer-owned boundary, never infer moving regions. */
export function sequenceLayers(svg:string){
 const marker='<!--event-scene-end-->',at=svg.indexOf(marker);
 if(at<0)return null;
 const prefix=svg.slice(0,at),stack:{name:string;tag:string}[]=[];
 for(const match of prefix.matchAll(/<\/?([\w:-]+)\b[^>]*>/g)){
  const tag=match[0],name=match[1]!;
  if(tag.startsWith('</')){if(stack.pop()?.name!==name)return null;}
  else if(!tag.endsWith('/>'))stack.push({name,tag});
 }
 // Compositing groups with opacity/filter/blending would change their semantics.
 if(stack.some(s=>!['svg','g'].includes(s.name)||/\b(?:opacity|filter|mask|style)=/.test(s.tag)))return null;
 const defs=[...prefix.matchAll(/<defs>[\s\S]*?<\/defs>/g)].map(m=>m[0]).join('');
 return {background:prefix+[...stack].reverse().map(s=>`</${s.name}>`).join(''),
  foreground:stack.map((s,i)=>s.tag+(i===0?defs:'')).join('')+svg.slice(at+marker.length)};
}
