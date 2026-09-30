'use client';
import { useMemo, useState } from 'react';

export type ActivityEntry={id:string;createdAt:string;source:string;action:string;actorUserId:string|null;targetType:string|null;targetId:string|null;before:unknown;after:unknown};
const displayChange=(value:unknown)=>{
  if(value===null||value===undefined)return 'Not recorded';
  const text=typeof value==='string'?value:JSON.stringify(value);
  return text.length>220?`${text.slice(0,217)}…`:text;
};

export default function ActivityList({activity}:{activity:ActivityEntry[]}){
  const [source,setSource]=useState('all'),[query,setQuery]=useState('');
  const sources=useMemo(()=>[...new Set(activity.map(entry=>entry.source))], [activity]);
  const normalized=query.trim().toLowerCase();
  const visible=activity.filter(entry=>{
    if(source!=='all'&&entry.source!==source)return false;
    if(!normalized)return true;
    return [entry.action,entry.source,entry.targetType,entry.targetId].some(value=>value?.toLowerCase().includes(normalized));
  });
  return <><div className="activity-browser"><label className="activity-search" htmlFor="activity-search"><span>Search activity</span><input id="activity-search" type="search" value={query} placeholder="Action, source, or target…" onChange={event=>setQuery(event.target.value)}/></label><div className="activity-filter" aria-label="Filter recent activity"><button type="button" className={source==='all'?'filter-chip active':'filter-chip'} aria-pressed={source==='all'} onClick={()=>setSource('all')}>All sources</button>{sources.map(item=><button type="button" key={item} className={source===item?'filter-chip active':'filter-chip'} aria-pressed={source===item} onClick={()=>setSource(item)}>{item}</button>)}</div></div>
    {visible.length?<ol className="audit-list">{visible.map(entry=><li key={entry.id}><div><strong>{entry.action.replaceAll('.', ' ')}</strong><span>{entry.source}{entry.targetType?` · ${entry.targetType}`:''}{entry.targetId?` · ${entry.targetId}`:''}</span><span>Actor: {entry.actorUserId??'System'}</span><span>Before: {displayChange(entry.before)}</span><span>After: {displayChange(entry.after)}</span></div><time dateTime={entry.createdAt}>{entry.createdAt.replace('T',' ').replace('.000Z',' UTC')}</time></li>)}</ol>:<p className="description">No recent activity matches these filters.</p>}</>;
}
