import {createRequire} from 'node:module';
import dictionary from 'dictionary-en';
const nspell=createRequire(import.meta.url)('nspell') as (dictionary:unknown)=>{correct(word:string):boolean};
const spelling=nspell(dictionary);
// Lowercase dictionary lookup excludes capitalization-only proper nouns. Words
// that are also common nouns retain their ordinary meaning (e.g. "john").
const slang=new Set(['bruh','yeet','yeeted','yeeting','sus','noob','noobs','pwn','pwned','pwns','pwnage','rizz','rizzed','rizzing','chad','chads','simp','simps','simping','sussy','based','pog','poggers','shitpost','shitposts','shitposting','shitposter','fuckboy','fuckboys','fuckery','bullshitter','bullshitters','douchebag','douchebags']);
const abbreviations=new Set(['etc','eg','ie','aka','asap','atm','lol','lmao','rofl','brb','afk','irl','idk','imo','imho','tbh','fyi','nsfw','sfw','gg','wp','dm','dms','pm','am','pc','tv','usa','uk','eu','inc','corp','ltd','co','dept','dr','mr','mrs','ms','jr','sr','st','ave','blvd','kg','km','cm','mm','lb','lbs','oz','ft','hr','hrs','min','mins','sec','secs']);
export const recognizedWord=(word:string)=>!abbreviations.has(word)&&(slang.has(word)||spelling.correct(word));
