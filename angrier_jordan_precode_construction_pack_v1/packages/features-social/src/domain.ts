import {DomainError} from '../../core/src/errors.js';
import type {SocialPolicy} from './interfaces.js';
export const SOCIAL_ACTIONS=['ts','hit','slap','pillow','cushion','stab','choke','shh','belittle','bonk','yeet','sit','standup','fold','recline','sideeye','judge','shame','boo','bruh','wtf','sus','yap','touchgrass','blame','disappoint','chaircheck','throwchair','getup','calmdown','absolutelynot','explainyourself','embarrassing','questionable','respect','compliment','wheresmyvape','hitthegeekbar'] as const;
export const HAIKU_RESPONSE='We use it for profiling purposes.';
export const NOTMAD_RESPONSE='I am not mad. I’m just disappointed.';
export function assertSocialAction(action:string){if(action!=='roast'&&!SOCIAL_ACTIONS.some(a=>a===action))throw new DomainError('SOCIAL_ACTION','Choose an available social action.');}
export function validateSocialPolicy(p:SocialPolicy){if(!Number.isInteger(p.throttleSeconds)||p.throttleSeconds<1||p.throttleSeconds>30||!Number.isInteger(p.roastBackSeconds)||p.roastBackSeconds<30||p.roastBackSeconds>3600)throw new DomainError('SOCIAL_CONFIG','Social controls are not configured correctly.');}
export function formatSocialResponse(action:string,text:string,actorId:string,targetId:string|null){
 assertSocialAction(action);if(!/^\d{15,22}$/.test(actorId)||targetId!==null&&!/^\d{15,22}$/.test(targetId))throw new DomainError('SOCIAL_MEMBER','Choose a server member.');
 const actor=`<@${actorId}>`,target=targetId?`<@${targetId}>`:'the lounge';
 let result=text.replaceAll('{actor}',actor).replaceAll('{target}',target).replaceAll('{user}',target);
 if(action==='roast')result=`${actor} → ${target}\n${result}`;
 if(action==='ts'&&!result.includes('Type Shit'))throw new DomainError('SOCIAL_CONTENT','Type Shit response content is unavailable.');
 if(!result.trim()||result.length>1800||/\{[a-z_]+\}/i.test(result))throw new DomainError('SOCIAL_CONTENT','This authored response is unavailable.');return result;
}
// English pronunciation varies. This conservative detector rejects code, links, identifiers and
// non-English tokens; its deterministic syllable estimate is intentionally not a language claim.
const SYLLABLES:Record<string,number>={a:1,i:1,the:1,are:1,were:1,one:1,once:1,two:1,every:2,family:3,different:3,chocolate:3,fire:1,hour:1,our:1,poem:2,poems:2,poet:2,poetry:3,quiet:2,science:2,business:2,people:2,beautiful:3,being:2,evening:2,heaven:2,seven:2,eleven:3,queue:1,queued:1,chair:1,chairs:1,jordan:2,angrier:3,haiku:2,haikus:2,real:1,really:2,world:1,words:1,warmed:1,loved:1,called:1,comes:1,leaves:1,makes:1,takes:1,eyes:1,smiles:1,smiled:1,ourself:2,ourselves:2,does:1,done:1,gone:1,give:1,have:1,live:1,move:1,love:1,orange:2,orangejuice:3};
export function syllableCount(word:string):number|null{
 const normalized=word.toLowerCase().replaceAll('’',"'");if(!/^[a-z]+(?:'[a-z]+)?$/.test(normalized)||normalized.length>30)return null;
 if(SYLLABLES[normalized]!==undefined)return SYLLABLES[normalized]!;
 const w=normalized.replace(/'/g,'');if(w.length<=3)return 1;
 let count=(w.match(/[aeiouy]+/g)??[]).length;if(!count)return null;
 if(/e$/.test(w)&&!/[^aeiou]le$/.test(w)&&count>1)count--;
 if(/(?:[^td]ed|[^sxz]es)$/.test(w)&&count>1&&!/(?:[aeiou]ed|[cs]hes|ges)$/.test(w))count--;
 return Math.max(1,count);
}
export function detectHaiku(text:string):readonly string[]|null{
 if(text.length>500||/https?:|[`<>@#\d_]|^\s*[!/]/i.test(text))return null;
 const lines=text.trim().split(/\r?\n/);if(lines.length!==1&&lines.length!==3)return null;
 const words=(line:string)=>line.replace(/[.,!?;:“”"()—–-]/g,' ').trim().split(/\s+/).filter(Boolean);
 if(lines.length===3){const counts=lines.map(line=>words(line).map(syllableCount));if(counts.some(c=>c.some(n=>n===null)))return null;return counts.every((c,i)=>c.reduce<number>((n,v)=>n+(v??0),0)===[5,7,5][i])?lines:null;}
 const groups:string[][]=[[],[],[]];let part=0,count=0;for(const word of words(lines[0]!)){const syllables=syllableCount(word);if(syllables===null||part>2)return null;groups[part]!.push(word);count+=syllables;const limit=[5,7,5][part]!;if(count>limit)return null;if(count===limit){part++;count=0;}}
 return part===3&&count===0?groups.map(g=>g.join(' ')):null;
}
/** Stable sampling prevents gateway replay from turning a skipped detection into a response. */
export function sampleHaiku(messageId:string,probability:number){if(!Number.isFinite(probability)||probability<0||probability>0.8)throw new DomainError('HAIKU_CONFIG','Haiku response frequency is unavailable.');let h=2166136261;for(const char of messageId)h=Math.imul(h^char.charCodeAt(0),16777619);return(h>>>0)/4294967296<probability;}
