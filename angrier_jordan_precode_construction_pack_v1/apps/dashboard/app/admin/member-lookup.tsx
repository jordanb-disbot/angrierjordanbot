'use client';
import { FormEvent, useState } from 'react';

type Member={userId:string;alias:string|null;wallet:string;bank:string;bankTier:number;inventoryEntries:number;inventoryQuantity:number;selfRoleCategories:string[];needsRulesAck:boolean;activeJail:{endsAt:string;indefinite:boolean}|null};
const number=(value:string)=>new Intl.NumberFormat('en-US').format(BigInt(value));

export default function MemberLookup(){
  const [query,setQuery]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[members,setMembers]=useState<Member[]>([]);
  async function search(event:FormEvent){
    event.preventDefault();setBusy(true);setMessage('');setMembers([]);
    try{const response=await fetch(`/api/members?q=${encodeURIComponent(query)}`,{cache:'no-store'});const body=await response.json();if(!response.ok){setMessage(body.error??'Member lookup is unavailable.');return;}setMembers(body.members);if(!body.members.length)setMessage('No saved member records match that search.');}
    catch{setMessage('Member lookup is unavailable. Please try again.');}finally{setBusy(false);}
  }
  return <><form className="member-search" onSubmit={search}><label htmlFor="member-query"><span>Discord ID or saved alias</span><input id="member-query" value={query} maxLength={64} placeholder="Search a member" onChange={event=>setQuery(event.target.value)}/></label><button disabled={busy||query.trim().length<2}>{busy?'Searching…':'Search members'}</button></form><p className="description">Reads only bot-owned records. Member corrections remain intentionally unavailable here.</p>{message&&<p className="lookup-message" role="status">{message}</p>}{members.length>0&&<div className="member-results">{members.map(member=><article key={member.userId} className="member-card"><div className="member-heading"><div><span className="member-alias">{member.alias??'Saved member'}</span><code>{member.userId}</code></div>{member.activeJail?<span className="member-alert">Jailed</span>:<span className="feature-on">Active</span>}</div><dl><div><dt>Wallet</dt><dd>{number(member.wallet)} Ottomans</dd></div><div><dt>Bank</dt><dd>{number(member.bank)} · Tier {member.bankTier}</dd></div><div><dt>Inventory</dt><dd>{member.inventoryQuantity} items · {member.inventoryEntries} entries</dd></div><div><dt>Onboarding</dt><dd>{member.needsRulesAck?'Pending rules':'Complete'}</dd></div><div><dt>Self-roles</dt><dd>{member.selfRoleCategories.length?member.selfRoleCategories.join(', '):'None selected'}</dd></div><div><dt>Jail</dt><dd>{member.activeJail?(member.activeJail.indefinite?'Active · indefinite':`Active · until ${member.activeJail.endsAt.replace('T',' ').replace('.000Z',' UTC')}`):'No active sentence'}</dd></div></dl></article>)}</div>}</>;
}
