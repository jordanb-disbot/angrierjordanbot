/** Durable, guild-scoped directory.  IDs remain the only canonical identity. */
export type DirectoryMemberInput={guildId:string;userId:string;nickname?:string|null;displayName?:string|null;username:string};
export type DirectoryRow={guildId:string;userId:string;nickname:string|null;displayName:string;username:string;normalizedAliases:string[];searchText:string;lastSyncedAt:Date;archivedAt:Date|null};

const compact=(value:string)=>value.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim().replace(/\s+/g,' ');
const usable=(value:string|undefined|null)=>typeof value==='string'&&value.trim().length>0?value.trim():null;

export const normalizeDirectoryQuery=(value:string)=>compact(value);
export const effectiveDisplayName=(member:Pick<DirectoryMemberInput,'nickname'|'displayName'|'username'>)=>usable(member.nickname)??usable(member.displayName)??member.username.trim();
export const normalizedMemberAliases=(member:DirectoryMemberInput)=>[member.nickname,member.displayName,member.username,effectiveDisplayName(member)].flatMap(value=>{const normalized=compact(value??'');return normalized?[normalized]:[]}).filter((value,index,values)=>values.indexOf(value)===index);
export const directorySearchText=(member:DirectoryMemberInput)=>normalizedMemberAliases(member).join(' ');
export const directoryRecord=(member:DirectoryMemberInput,now=new Date())=>({
  guildId:member.guildId,userId:member.userId,nickname:usable(member.nickname),displayName:effectiveDisplayName(member),username:member.username.trim(),normalizedAliases:normalizedMemberAliases(member),searchText:directorySearchText(member),lastSyncedAt:now,archivedAt:null,
});

export const directoryMatches=(row:Pick<DirectoryRow,'userId'|'normalizedAliases'|'searchText'>,query:string)=>{
  const needle=normalizeDirectoryQuery(query);
  return Boolean(needle)&&(row.userId===query.trim()||row.searchText.includes(needle)||row.normalizedAliases.some(alias=>alias.includes(needle)));
};

export interface MemberDirectoryStore {
  upsert(input:ReturnType<typeof directoryRecord>):Promise<void>;
  archive(guildId:string,userId:string,at:Date):Promise<void>;
  active(guildId:string):Promise<DirectoryRow[]>;
}

export class MemberDirectoryService {
  constructor(private readonly store:MemberDirectoryStore,private readonly now:()=>Date=()=>new Date()){}
  async memberObserved(member:DirectoryMemberInput){await this.store.upsert(directoryRecord(member,this.now()));}
  async memberLeft(guildId:string,userId:string){await this.store.archive(guildId,userId,this.now());}
  async reconcile(guildId:string,members:readonly DirectoryMemberInput[]){
    const at=this.now(),current=new Set<string>(),existing=await this.store.active(guildId);
    for(const member of members){if(member.guildId!==guildId)continue;current.add(member.userId);await this.store.upsert(directoryRecord(member,at));}
    const archived=existing.filter(row=>!current.has(row.userId));
    for(const row of archived)await this.store.archive(guildId,row.userId,at);
    return {synced:current.size,archived:archived.length};
  }
}

export const nextDirectoryReconciliation=(now:Date,timeZone='America/Denver')=>{
  const parts=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',hourCycle:'h23'}).formatToParts(now).filter(part=>part.type!=='literal').map(part=>[part.type,Number(part.value)])) as Record<string,number>;
  const value=(source:Record<string,number>,key:string)=>{const result=source[key];if(result===undefined)throw new Error(`Missing ${key} in timezone conversion.`);return result;};
  const year=value(parts,'year'),month=value(parts,'month'),day=value(parts,'day'),hour=value(parts,'hour');
  const base=new Date(Date.UTC(year,month-1,day+(hour>=5?1:0)));
  let guess=Date.UTC(base.getUTCFullYear(),base.getUTCMonth(),base.getUTCDate(),5);
  for(let i=0;i<3;i++){
    const local=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(new Date(guess)).filter(part=>part.type!=='literal').map(part=>[part.type,Number(part.value)])) as Record<string,number>;
    guess=Date.UTC(base.getUTCFullYear(),base.getUTCMonth(),base.getUTCDate(),5)-Date.UTC(value(local,'year'),value(local,'month')-1,value(local,'day'),value(local,'hour'),value(local,'minute'),value(local,'second'))+guess;
  }
  return new Date(guess);
};
