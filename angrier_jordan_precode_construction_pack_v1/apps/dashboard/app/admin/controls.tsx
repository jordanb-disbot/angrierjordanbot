'use client';
import { useRef, useState } from 'react';
import type { DashboardControl } from '../../lib/config-control-types';
import type { ConfigDraft, DraftCommand } from '../../../../packages/core/src/config-draft';

type Control=DashboardControl&{value:unknown;version:number;source:string};
type Revision={version:number;value:unknown;createdAt:string;rollbackSafe:boolean};
const display=(value:unknown)=>value===null?'Not configured':typeof value==='string'?value:JSON.stringify(value,null,2);

export default function SettingsControls({settings,draft,csrf,memberId,isOwner,writesEnabled,section,showDraft=true,showBrowser=true,showSections=true}:{settings:Control[];draft:ConfigDraft;csrf:string;memberId:string;isOwner:boolean;writesEnabled:boolean;section?:string;showDraft?:boolean;showBrowser?:boolean;showSections?:boolean}){
  const [busy,setBusy]=useState(false),[message,setMessage]=useState(''),[retry,setRetry]=useState(false),[history,setHistory]=useState<Record<string,Revision[]>>({});
  const [selectedSection,setSelectedSection]=useState(section??'all'),[query,setQuery]=useState('');
  const lastRequest=useRef<{requestId:string;command:DraftCommand}|null>(null);
  const [values,setValues]=useState<Record<string,unknown>>(()=>Object.fromEntries(settings.map(control=>[control.key,control.value])));
  const sections=section?[section]:[...new Set(settings.map(control=>control.section))];
  const normalizedQuery=query.trim().toLowerCase();
  const matchingSettings=settings.filter(control=>{
    if((section&&control.section!==section)||(selectedSection!=='all'&&control.section!==selectedSection))return false;
    if(!normalizedQuery)return true;
    return [control.label,control.key,control.description,control.section].some(value=>value?.toLowerCase().includes(normalizedQuery));
  });
  const visibleSections=sections.filter(section=>matchingSettings.some(control=>control.section===section));
  const ownsLock=draft.editorId===memberId;
  const disabled=!writesEnabled||busy;
  async function submit(command:DraftCommand,reuse=false){
    const envelope=reuse?lastRequest.current:{requestId:crypto.randomUUID(),command};if(!envelope)return;
    lastRequest.current=envelope;setBusy(true);setMessage('Saving…');setRetry(false);
    try{
      const response=await fetch('/api/draft',{method:'POST',headers:{'Content-Type':'application/json','x-csrf-token':csrf},body:JSON.stringify(envelope)});
      const body=await response.json();
      if(!response.ok){setMessage(body.message??body.error??'This operation could not be completed.');return;}
      window.location.reload();
    }catch{setMessage('The response was interrupted. Retry the same request to safely recover its result.');setRetry(true);}
    finally{setBusy(false);}
  }
  function value(control:Control){
    const current=values[control.key];
    if(control.kind==='number')return current===''?null:Number(current);
    if(['channel-select','role-select'].includes(control.kind))return current===''?null:current;
    return current;
  }
  async function loadHistory(key:string){
    setBusy(true);setMessage('');
    try{
      const response=await fetch(`/api/draft?history=${encodeURIComponent(key)}`,{cache:'no-store'}),body=await response.json();
      if(!response.ok){setMessage(body.message??body.error??'History unavailable.');return;}
      setHistory(previous=>({...previous,[key]:body.history}));
    }catch{setMessage('History could not be loaded. Please try again.');}finally{setBusy(false);}
  }
  return <>
    {showDraft&&<section id="draft" className="window settings-section" aria-labelledby="draft-heading"><div className="section-title"><h2 id="draft-heading">Shared draft</h2><span className="badge">Revision {draft.version}</span></div>
      <p>{draft.editorId?`Editor: ${draft.editorId===memberId?'you':draft.editorId}. The edit lock expires after 15 minutes without an edit or renewal.`:'No Administrator holds the edit lock.'}</p>
      {draft.lastActivityAt!==null&&<p className="description">Last activity: {new Date(draft.lastActivityAt).toISOString().replace('T',' ').replace('.000Z',' UTC')}</p>}
      <div className="actions"><button disabled={disabled} onClick={()=>submit({action:'acquire',expectedVersion:draft.version})}>{ownsLock?'Renew edit lock':'Acquire edit lock'}</button>
        {isOwner&&draft.editorId&&draft.editorId!==memberId&&<button disabled={disabled} onClick={()=>submit({action:'takeover',expectedVersion:draft.version})}>Take over draft</button>}
        <button disabled={disabled||!ownsLock||!Object.keys(draft.changes).length} onClick={()=>submit({action:'preview',expectedVersion:draft.version})}>Preview all changes</button>
        <button className="quiet" disabled={disabled||!ownsLock} onClick={()=>submit({action:'discard',expectedVersion:draft.version})}>Discard draft</button></div>
      {!Object.keys(draft.changes).length?<p className="description">Stage settings from any section to build one shared draft.</p>:<ul className="staged-list">{Object.entries(draft.changes).map(([key,change])=><li key={key}><div><strong>{settings.find(control=>control.key===key)?.label??key}</strong><code>{display(change.value)}</code>{change.rollbackVersion!==undefined&&<span className="meta">Restore revision {change.rollbackVersion}</span>}</div><button className="quiet" disabled={disabled||!ownsLock} onClick={()=>submit({action:'remove',key,expectedVersion:draft.version})}>Remove</button></li>)}</ul>}
      {draft.preview&&<div className="preview"><h3>Publish preview</h3><p>{draft.preview.valid?'All supported settings and direct dependencies passed validation.':'Publishing is blocked. Resolve every issue and generate a new preview.'}</p>
        {!!draft.preview.errors.length&&<ul className="validation-errors">{draft.preview.errors.map((error,index)=><li key={index}>{error}</li>)}</ul>}
        {[...new Set(draft.preview.changes.map(change=>change.section))].map(section=><div key={section}><h4>{section.replaceAll('_',' ')}</h4><div className="preview-grid">{draft.preview!.changes.filter(change=>change.section===section).map(change=><article key={change.key}><strong>{settings.find(control=>control.key===change.key)?.label??change.key}</strong><p className="meta">{change.risk} · Current revision {change.currentVersion}</p><div className="comparison"><div><span>Before</span><code>{display(change.before)}</code></div><div><span>After</span><code>{display(change.after)}</code></div></div></article>)}</div></div>)}
        <details><summary>Direct dependencies and current references</summary><ul>{draft.preview.dependencies.map(dependency=><li key={dependency.key}><code>{dependency.key}</code> · Revision {dependency.version} · {display(dependency.value)}</li>)}</ul>{Object.entries(draft.preview.references).map(([key,reference])=><p key={key}><code>{key}: {display(reference)}</code></p>)}</details>
        <p className="description">Publishing applies this entire reviewed draft at once. Current live values, dependencies and Discord references are checked again. No dependent setting is repaired automatically.</p>
        <button className="publish" disabled={disabled||!draft.preview.valid} onClick={()=>submit({action:'publish',expectedVersion:draft.version,fingerprint:draft.preview!.fingerprint})}>Publish reviewed changes</button>
      </div>}
    </section>}
    <div className="operation-status" role="status" aria-live="polite">{message}{retry&&lastRequest.current&&<button disabled={busy} onClick={()=>submit(lastRequest.current!.command,true)}>Retry same request</button>}</div>
    {showBrowser&&<section id="settings-browser" className="window settings-browser" aria-label="Browse dashboard settings"><div className="section-title"><div><h2>Settings browser</h2><p className="description">Find a setting, then stage it for review or save low-risk changes live.</p></div><span className="badge">{matchingSettings.length} of {settings.length} visible</span></div>
      <div className="settings-filter"><label className="settings-search" htmlFor="settings-search"><span>Search settings</span><input id="settings-search" type="search" value={query} placeholder="Name, key, description…" onChange={event=>setQuery(event.target.value)}/></label>
        <div className="section-filter" aria-label="Filter settings by section"><button type="button" className={selectedSection==='all'?'filter-chip active':'filter-chip'} aria-pressed={selectedSection==='all'} onClick={()=>setSelectedSection('all')}>All settings</button>{sections.map(section=><button type="button" key={section} className={selectedSection===section?'filter-chip active':'filter-chip'} aria-pressed={selectedSection===section} onClick={()=>setSelectedSection(section)}>{section.replaceAll('_',' ')}</button>)}</div>
      </div>
      {(query||selectedSection!=='all')&&<button type="button" className="quiet filter-reset" onClick={()=>{setQuery('');setSelectedSection('all')}}>Clear filters</button>}
    </section>}
    {showSections&&(visibleSections.length?visibleSections.map(section=><section id={section} className="window settings-section" key={section}><h2>{section.replaceAll('_',' ')}</h2>
      {matchingSettings.filter(control=>control.section===section).map(control=>{
        const id=`setting-${control.key}`,blocked=control.risk==='locked'||control.dashboardWrite==='blocked'||control.kind==='json-editor'||control.editableBy.length===0;
        const live=control.dashboardWrite==='live'&&control.risk==='normal'&&!control.dependsOn?.length;
        return <div className="setting" key={control.key}><div><label htmlFor={id}>{control.label}</label><p className="description" id={`${id}-help`}>{control.description||control.key}</p>
          <span className="meta">{control.source==='default'?'Default value':`Saved · Revision ${control.version}`} · {blocked?(control.kind==='json-editor'?'Specialized editor pending':'Fixed rule'):live?'Low-risk live save':'Draft review required'}{control.restartRequired?' · Restart required':''}</span></div>
          <div className="field">{control.kind==='toggle'?<input id={id} aria-describedby={`${id}-help`} type="checkbox" checked={values[control.key]===true} disabled={disabled||blocked} onChange={event=>setValues(previous=>({...previous,[control.key]:event.target.checked}))}/>:control.kind==='select'?<select id={id} aria-describedby={`${id}-help`} value={String(values[control.key]??'')} disabled={disabled||blocked} onChange={event=>setValues(previous=>({...previous,[control.key]:event.target.value}))}>{control.choices?.map(choice=><option key={choice} value={choice}>{choice}</option>)}</select>:control.kind==='json-editor'?<textarea id={id} value={display(control.value)} readOnly rows={4}/>:<input id={id} aria-describedby={`${id}-help`} type={control.kind==='number'?'number':'text'} value={String(values[control.key]??'')} min={control.min} max={control.max} readOnly={disabled||blocked} onChange={event=>setValues(previous=>({...previous,[control.key]:event.target.value}))}/>}
            {!blocked&&<div className="actions field-actions">{live&&<button disabled={disabled} onClick={()=>submit({action:'save',key:control.key,value:value(control),baseVersion:control.version})}>Save live</button>}<button disabled={disabled||!ownsLock} onClick={()=>submit({action:'stage',key:control.key,value:value(control),baseVersion:control.version,expectedVersion:draft.version})}>Stage change</button><button className="quiet" disabled={busy} onClick={()=>loadHistory(control.key)}>History</button></div>}
            {history[control.key]&&<div className="history"><p className="description">Retained configuration history</p>{history[control.key]!.length===0?<p className="meta">No saved revisions.</p>:history[control.key]!.map(revision=><div key={revision.version}><span className="meta">Revision {revision.version} · {revision.createdAt}</span><code>{display(revision.value)}</code><button disabled={disabled||!ownsLock||!revision.rollbackSafe} onClick={()=>submit({action:'rollback',key:control.key,toVersion:revision.version,baseVersion:control.version,expectedVersion:draft.version})}>Stage rollback</button></div>)}</div>}
          </div></div>;
      })}</section>):<section className="window settings-section empty-settings"><h2>No settings match</h2><p>Try a shorter search or clear the current filters.</p><button type="button" onClick={()=>{setQuery('');setSelectedSection('all')}}>Show all settings</button></section>)}
  </>;
}
