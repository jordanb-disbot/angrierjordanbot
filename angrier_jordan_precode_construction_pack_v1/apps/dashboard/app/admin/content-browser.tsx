'use client';
import { useEffect, useMemo, useState } from 'react';
import type { ContentGroup } from '../../lib/content';

type Entry={id:string;game:string;category:string|null;enabled:boolean;useCount:number;lastUsedAt:string|null;tags:string[];text:string};

export default function ContentBrowser({groups}:{groups:ContentGroup[]}){
  const [game,setGame]=useState(groups[0]?.game??''),[entries,setEntries]=useState<Entry[]>([]),[query,setQuery]=useState(''),[state,setState]=useState<'idle'|'loading'|'error'>('idle');
  useEffect(()=>{if(!game)return;let active=true;setState('loading');setQuery('');fetch(`/api/content?game=${encodeURIComponent(game)}`,{cache:'no-store'}).then(async response=>({response,body:await response.json()})).then(({response,body})=>{if(!active)return;if(!response.ok)throw new Error();setEntries(body.entries);setState('idle');}).catch(()=>{if(active){setEntries([]);setState('error');}});return()=>{active=false;};},[game]);
  const filtered=useMemo(()=>{const term=query.trim().toLowerCase();return term?entries.filter(entry=>[entry.text,entry.category,...entry.tags].filter((value):value is string=>typeof value==='string').some(value=>value.toLowerCase().includes(term))):entries;},[entries,query]);
  if(!groups.length)return <p className="description">No authored content pools are available.</p>;
  return <><div className="content-controls"><label htmlFor="content-pool"><span>Content pool</span><select id="content-pool" value={game} onChange={event=>setGame(event.target.value)}>{groups.map(group=><option key={group.game} value={group.game}>{group.game.replaceAll('_',' ')} · {group.enabled} live</option>)}</select></label><label htmlFor="content-search"><span>Filter loaded entries</span><input id="content-search" type="search" value={query} placeholder="Search this pool" onChange={event=>setQuery(event.target.value)}/></label></div><p className="description">Showing up to 60 entries from the selected canonical pool. Editing and reseeding remain disabled.</p>{state==='loading'?<p className="lookup-message" role="status">Loading content…</p>:state==='error'?<p className="lookup-message" role="status">The content library could not be loaded.</p>:<ol className="content-list">{filtered.map(entry=><li key={entry.id}><div><p>{entry.text}</p><span>{entry.category??'Uncategorized'} · used {entry.useCount} times{entry.tags.length?` · ${entry.tags.join(', ')}`:''}</span></div><b className={entry.enabled?'content-live':'content-disabled'}>{entry.enabled?'Live':'Disabled'}</b></li>)}</ol>}</>;
}
