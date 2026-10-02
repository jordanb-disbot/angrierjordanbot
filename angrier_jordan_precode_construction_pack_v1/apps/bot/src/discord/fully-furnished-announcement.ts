export const FULLY_FURNISHED_ANNOUNCEMENT_CHANNEL='1524964386077151365';

const plainName=(value:string)=>value.replace(/<@!?\d+>/g,'').replace(/[@\r\n\t]/g,' ').replace(/\s+/g,' ').trim().slice(0,80)||'A member';

/** Completion announcements intentionally contain only plain display names, never Discord mentions. */
export function fullyFurnishedCompletionAnnouncement(winner:string,completed:string[]){
 const names=completed.map(plainName);
 return {
  content:`🪑 **Fully Furnished complete!**\n${plainName(winner)} has completed every launch-event goal.\n\n**Completed (${names.length})**\n${names.map((name,index)=>`${index+1}. ${name}`).join('\n')}`,
  allowedMentions:{parse:[] as never[]},
 };
}
