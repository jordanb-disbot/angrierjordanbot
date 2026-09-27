/** Keep fixed embedded artwork once per animation, rather than once per frame. */
export class AnimationAssets {
 readonly assets:string[]=[];
 private readonly ids=new Map<string,number>();
 pack(svg:string){return svg.replace(/data:image\/(?:png|webp|jpeg);base64,[A-Za-z0-9+/=]+/g,value=>{
  let id=this.ids.get(value);if(id===undefined){id=this.assets.length;this.ids.set(value,id);this.assets.push(value);}
  return `aj-animation-asset:${id}`;
 });}
}
export function unpackAnimationAssets(svg:string,assets:readonly string[]){return svg.replace(/aj-animation-asset:(\d+)/g,(_match,id)=>{const value=assets[Number(id)];if(!value)throw new Error('Missing animation artwork');return value;});}
