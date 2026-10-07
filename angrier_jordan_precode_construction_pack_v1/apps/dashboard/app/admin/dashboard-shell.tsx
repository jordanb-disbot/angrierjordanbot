'use client';

import Link from 'next/link';
import {useEffect,useState,type ReactNode} from 'react';
import {usePathname,useSearchParams} from 'next/navigation';

type LinkItem={label:string;anchor:string};
const groups:{id:string;label:string;items:LinkItem[]}[]=[
  {id:'dashboard',label:'Dashboard',items:[{label:'Overview',anchor:'overview'},{label:'Recent Activity',anchor:'activity'},{label:'Feature Status',anchor:'features'},{label:'Shared Draft',anchor:'draft'}]},
  {id:'people',label:'People & Server',items:[{label:'Members',anchor:'members'},{label:'Server',anchor:'server'},{label:'Channels & Roles',anchor:'channels_roles'},{label:'Roles Panel',anchor:'roles_panel'},{label:'Introductions',anchor:'introductions'},{label:'Onboarding',anchor:'onboarding'}]},
  {id:'economy',label:'Economy',items:[{label:'Economy',anchor:'economy'},{label:'Shop',anchor:'shop'},{label:'Crafting',anchor:'crafting'},{label:'Casino',anchor:'casino'},{label:'Lottery',anchor:'lottery'},{label:'Crime',anchor:'crime'},{label:'Family',anchor:'family'}]},
  {id:'community',label:'Community & Content',items:[{label:'Content',anchor:'content'},{label:'Community',anchor:'community'},{label:'Chairisms',anchor:'chairisms'},{label:'Social',anchor:'social'},{label:'Haiku',anchor:'haiku'},{label:'Custom Commands',anchor:'custom_commands'},{label:'Events',anchor:'events'},{label:'Activity',anchor:'activity'},{label:'Spotlight',anchor:'spotlight'}]},
  {id:'operations',label:'Operations',items:[{label:'Moderation',anchor:'moderation'},{label:'Security',anchor:'security'},{label:'Games',anchor:'games'},{label:'Special Commands',anchor:'special_commands'},{label:'Core',anchor:'core'},{label:'Features',anchor:'features'},{label:'Tutorial',anchor:'tutorial'},{label:'Dashboard',anchor:'dashboard'}]},
  {id:'settings',label:'Settings',items:[{label:'Settings Browser',anchor:'settings-browser'},{label:'Server',anchor:'server'},{label:'Core',anchor:'core'},{label:'Channels & Roles',anchor:'channels_roles'},{label:'Games',anchor:'games'},{label:'Economy',anchor:'economy'},{label:'Moderation',anchor:'moderation'},{label:'Security',anchor:'security'},{label:'Content',anchor:'content'},{label:'Spotlight',anchor:'spotlight'},{label:'Dashboard',anchor:'dashboard'},{label:'Tutorial',anchor:'tutorial'},{label:'Custom Commands',anchor:'custom_commands'},{label:'Introductions',anchor:'introductions'},{label:'Shop',anchor:'shop'},{label:'Crafting',anchor:'crafting'},{label:'Casino',anchor:'casino'},{label:'Crime',anchor:'crime'},{label:'Family',anchor:'family'},{label:'Community',anchor:'community'},{label:'Activity',anchor:'activity'},{label:'Special Commands',anchor:'special_commands'},{label:'Roles Panel',anchor:'roles_panel'},{label:'Onboarding',anchor:'onboarding'},{label:'Features',anchor:'features'},{label:'Lottery',anchor:'lottery'},{label:'Events',anchor:'events'},{label:'Chairisms',anchor:'chairisms'},{label:'Social',anchor:'social'},{label:'Haiku',anchor:'haiku'}]}
];
const groupFor=(anchor:string)=>groups.find(group=>group.items.some(item=>item.anchor===anchor))?.id??'dashboard';

export default function DashboardShell({csrf,children}:{csrf:string;children:ReactNode}){
  const params=useSearchParams(),pathname=usePathname(),route=params.get('page')??'home',requested=params.get('group');
  const [open,setOpen]=useState<string>(requested??(route==='home'?'dashboard':'dashboard'));
  useEffect(()=>{if(requested)setOpen(requested);},[requested]);
  useEffect(()=>{if(route!=='home'||!window.location.hash)return;const anchor=window.location.hash.slice(1),group=groupFor(anchor);window.location.replace(`${pathname}?page=workspace&group=${group}#${anchor}`);},[pathname,route]);
  return <div className="dashboard"><header className="topbar"><Link className="brand" href="/admin">Angrier Jordan <span>Control Center</span></Link><form action="/api/auth/logout" method="post"><input type="hidden" name="csrf" value={csrf}/><button className="quiet" type="submit">Sign out</button></form></header>
    <aside className="sidebar"><p className="eyebrow">Chairs · Control Center</p><nav aria-label="Dashboard sections"><Link className={route==='home'?'nav-home active':'nav-home'} href="/admin">Home</Link>{groups.map(group=><section className="nav-group" key={group.id}><button type="button" aria-expanded={open===group.id} onClick={()=>setOpen(current=>current===group.id?'':group.id)}>{group.label}<span aria-hidden="true">{open===group.id?'−':'+'}</span></button>{open===group.id&&<div>{group.items.map((item,index)=><Link key={`${item.label}-${index}`} href={`/admin?page=workspace&group=${group.id}#${item.anchor}`}>{item.label}</Link>)}</div>}</section>)}</nav></aside>{children}</div>;
}
