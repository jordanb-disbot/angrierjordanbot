'use client';
import { useEffect, useState } from 'react';

type Health={state:'checking'|'ok'|'unavailable';latencyMs?:number};

export default function DatabaseHealth(){
  const [health,setHealth]=useState<Health>({state:'checking'});
  useEffect(()=>{let active=true;const check=async()=>{try{const response=await fetch('/api/health',{cache:'no-store'});const body=await response.json();if(active)setHealth({state:response.ok&&body.status==='ok'?'ok':'unavailable',latencyMs:typeof body.latencyMs==='number'?body.latencyMs:undefined});}catch{if(active)setHealth({state:'unavailable'});}};void check();const interval=window.setInterval(()=>void check(),30_000);return()=>{active=false;window.clearInterval(interval);};},[]);
  const title=health.state==='ok'?'Connected':health.state==='unavailable'?'Unavailable':'Checking…';
  const detail=health.state==='ok'?`${health.latencyMs??0} ms live database probe · refreshes every 30 seconds`:health.state==='unavailable'?'The dashboard could not reach its database. Try refreshing.':'Verifying the dashboard database connection.';
  return <article className={`window overview-card health-${health.state}`}><span>Database health</span><strong>{title}</strong><p>{detail}</p></article>;
}
