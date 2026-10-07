'use client';

import Link from 'next/link';
import {useEffect,useState,type ReactNode} from 'react';
import {usePathname,useSearchParams} from 'next/navigation';

type LinkItem={label:string;page:string};
const groups:{id:string;label:string;items:LinkItem[]}[]=[
  {id:'dashboard',label:'Dashboard',items:[{label:'Overview',page:'overview'},{label:'Recent Activity',page:'recent-activity'},{label:'Feature Status',page:'features-status'},{label:'Shared Draft',page:'draft'}]},
  {id:'people',label:'People & Server',items:[{label:'Members',page:'members'},{label:'Server',page:'server'},{label:'Channels & Roles',page:'channels_roles'},{label:'Roles Panel',page:'roles_panel'},{label:'Introductions',page:'introductions'},{label:'Onboarding',page:'onboarding'}]},
  {id:'economy',label:'Economy',items:[{label:'Economy',page:'economy-status'},{label:'Shop',page:'shop'},{label:'Crafting',page:'crafting'},{label:'Casino',page:'casino'},{label:'Lottery',page:'lottery'},{label:'Crime',page:'crime'},{label:'Family',page:'family'}]},
  {id:'community',label:'Community & Content',items:[{label:'Content',page:'content-library'},{label:'Community',page:'community'},{label:'Chairisms',page:'chairisms'},{label:'Social',page:'social'},{label:'Haiku',page:'haiku'},{label:'Custom Commands',page:'custom_commands'},{label:'Events',page:'events'},{label:'Activity',page:'activity'},{label:'Spotlight',page:'spotlight'}]},
  {id:'operations',label:'Operations',items:[{label:'Moderation',page:'moderation-status'},{label:'Security',page:'security'},{label:'Games',page:'games'},{label:'Special Commands',page:'special_commands'},{label:'Core',page:'core'},{label:'Features',page:'features-status'},{label:'Tutorial',page:'tutorial'},{label:'Dashboard',page:'dashboard'}]},
  {id:'settings',label:'Settings',items:[{label:'Settings Browser',page:'settings-browser'},{label:'Server',page:'server'},{label:'Core',page:'core'},{label:'Channels & Roles',page:'channels_roles'},{label:'Games',page:'games'},{label:'Economy',page:'economy-status'},{label:'Moderation',page:'moderation-status'},{label:'Security',page:'security'},{label:'Content',page:'content-library'},{label:'Spotlight',page:'spotlight'},{label:'Dashboard',page:'dashboard'},{label:'Tutorial',page:'tutorial'},{label:'Custom Commands',page:'custom_commands'},{label:'Introductions',page:'introductions'},{label:'Shop',page:'shop'},{label:'Crafting',page:'crafting'},{label:'Casino',page:'casino'},{label:'Crime',page:'crime'},{label:'Family',page:'family'},{label:'Community',page:'community'},{label:'Activity',page:'activity'},{label:'Special Commands',page:'special_commands'},{label:'Roles Panel',page:'roles_panel'},{label:'Onboarding',page:'onboarding'},{label:'Features',page:'features-status'},{label:'Lottery',page:'lottery'},{label:'Events',page:'events'},{label:'Chairisms',page:'chairisms'},{label:'Social',page:'social'},{label:'Haiku',page:'haiku'}]}
];
const groupFor=(page:string)=>groups.find(group=>group.items.some(item=>item.page===page))?.id??'dashboard';

export default function DashboardShell({csrf,children}:{csrf:string;children:ReactNode}){
  const params=useSearchParams(),pathname=usePathname(),route=params.get('page')??'home',requested=params.get('group');
  const [open,setOpen]=useState<string>(requested??(route==='home'?'dashboard':groupFor(route)));
  useEffect(()=>{if(requested)setOpen(requested);},[requested]);
  useEffect(()=>{if(route!=='home'||!window.location.hash)return;const page=window.location.hash.slice(1),group=groupFor(page);window.location.replace(`${pathname}?page=${page}&group=${group}`);},[pathname,route]);
  return <div className="dashboard"><header className="topbar"><Link className="brand" href="/admin">Angrier Jordan <span>Control Center</span></Link><form action="/api/auth/logout" method="post"><input type="hidden" name="csrf" value={csrf}/><button className="quiet" type="submit">Sign out</button></form></header>
    <aside className="sidebar"><p className="eyebrow">Chairs · Control Center</p><nav aria-label="Dashboard sections"><Link className={route==='home'?'nav-home active':'nav-home'} href="/admin">Home</Link>{groups.map(group=><section className="nav-group" key={group.id}><button type="button" aria-expanded={open===group.id} onClick={()=>setOpen(current=>current===group.id?'':group.id)}>{group.label}<span aria-hidden="true">{open===group.id?'−':'+'}</span></button>{open===group.id&&<div>{group.items.map((item,index)=><Link key={`${item.label}-${index}`} href={`/admin?page=${item.page}&group=${group.id}`}>{item.label}</Link>)}</div>}</section>)}</nav></aside>{children}</div>;
}
