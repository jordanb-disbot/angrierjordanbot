/** Conservative layout bounds for Inter / Space Grotesk UI text; does not alter approved event renderers. */
const segmenter=new Intl.Segmenter('en',{granularity:'grapheme'});
const graphemes=(value:string)=>Array.from(segmenter.segment(value),entry=>entry.segment);
export function textWidth(value:string,fontSize:number):number {
  return graphemes(value).reduce((width,glyph)=>{
    if(/^\s+$/u.test(glyph))return width+fontSize*.36;
    if(/\p{Extended_Pictographic}|\p{Regional_Indicator}/u.test(glyph))return width+fontSize*1.25;
    if(/[\u2e80-\u9fff\uac00-\ud7af\uff01-\uff60]/u.test(glyph))return width+fontSize*1.05;
    const base=glyph.normalize('NFD').replace(/\p{Mark}/gu,'');
    return width+fontSize*('MW@%&#'.includes(base)?1.02:/^[A-Z]$/.test(base)?.78:/^[ilI.,:;!'|]$/.test(base)?.36:/^[0-9]$/.test(base)?.68:.7);
  },0);
}
function validate(maxWidth:number,fontSize:number){if(!Number.isFinite(maxWidth)||!Number.isFinite(fontSize)||maxWidth<=0||fontSize<=0||maxWidth<fontSize*1.25)throw new RangeError('Text layout requires a positive width large enough for one glyph.');}
export function truncateText(value:string,maxWidth:number,fontSize:number):string {
  validate(maxWidth,fontSize);if(textWidth(value,fontSize)<=maxWidth)return value;
  let result='';for(const glyph of graphemes(value)){if(textWidth(result+glyph+'…',fontSize)>maxWidth)break;result+=glyph;}return result.trimEnd()+'…';
}
export function wrapText(value:string,maxWidth:number,fontSize:number):string[] {
  validate(maxWidth,fontSize);const result:string[]=[];
  for(const paragraph of value.replace(/\r\n?/g,'\n').split('\n')){
    let line='';
    for(const word of paragraph.trim().split(/\s+/u).filter(Boolean)){
      if(line&&textWidth(line+' '+word,fontSize)<=maxWidth){line+=' '+word;continue;}
      if(line){result.push(line);line='';}
      for(const glyph of graphemes(word)){
        if(line&&textWidth(line+glyph,fontSize)>maxWidth){result.push(line);line='';}
        line+=glyph;
      }
    }
    result.push(line);
  }
  return result;
}
