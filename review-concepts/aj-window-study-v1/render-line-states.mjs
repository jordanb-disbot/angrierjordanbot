import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { rasterizeSvg } from '../../angrier_jordan_precode_construction_pack_v1/dist/packages/renderer/src/raster.js';
const sharp=createRequire(new URL('../../angrier_jordan_precode_construction_pack_v1/package.json',import.meta.url))('sharp');

// Review-only visual fixtures. Nothing here imports or changes event behavior.
const dir = new URL('./line-states/', import.meta.url);
fs.mkdirSync(dir, { recursive: true });
const original = fs.readFileSync(new URL('line-command.svg', import.meta.url), 'utf8');
const defs = original.match(/<defs>[\s\S]*?<\/defs>/)[0].replace('</defs>', `
  <clipPath id="center"><rect x="25" y="258" width="600" height="465" rx="12"/></clipPath>
  <radialGradient id="dust"><stop stop-color="#FFFFFF" stop-opacity=".94"/><stop offset=".28" stop-color="#F7F6F0" stop-opacity=".8"/><stop offset=".6" stop-color="#CAD7D7" stop-opacity=".32"/><stop offset="1" stop-color="#C8D7DB" stop-opacity="0"/></radialGradient>
  <radialGradient id="halo"><stop stop-color="#824CCA" stop-opacity=".3"/><stop offset="1" stop-color="#824CCA" stop-opacity="0"/></radialGradient>
  <linearGradient id="brass"><stop stop-color="#77521F"/><stop offset=".5" stop-color="#E0C37D"/><stop offset="1" stop-color="#785023"/></linearGradient>
  </defs>`);
const lounge = 'data:image/png;base64,' + fs.readFileSync(new URL('lounge.png', import.meta.url)).toString('base64');
const esc = s => String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const text = (x,y,s,size=20,color='#E6EAF0',extra='') => `<text x="${x}" y="${y}" font-family="Inter" font-size="${size}" fill="${color}" ${extra}>${esc(s)}</text>`;
const heading = (x,y,s,size=38,color='#E6EAF0',extra='') => text(x,y,s,size,color,`style="font-family:Space Grotesk" font-weight="700" ${extra}`);
const mid = 'text-anchor="middle"';
const panel = (x,y,w,h,color='#436369') => `<rect x="${x}" y="${y+4}" width="${w}" height="${h}" rx="12" fill="#000" opacity=".35"/><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="12" fill="url(#panel)" stroke="${color}"/><path d="M${x+13} ${y+1}H${x+w-13}" stroke="#DBFFF0" stroke-opacity=".17"/>`;
const pill = (x,y,w,s,color='#CFACFF') => `<rect x="${x}" y="${y}" width="${w}" height="30" rx="15" fill="#081B25" fill-opacity=".94" stroke="${color}" stroke-opacity=".75"/>`+text(x+w/2,y+20,s,12,color,`${mid} font-weight="600" letter-spacing="1.3"`);
const button = (x,y,w,label,skin='ghost',disabled=false,small=false) => `<g opacity="${disabled?.48:1}"><rect x="${x}" y="${y+4}" width="${w}" height="${small?48:57}" rx="9" fill="#000" opacity=".5"/><rect x="${x}" y="${y}" width="${w}" height="${small?48:57}" rx="9" fill="url(#${skin})" stroke="${skin==='purple'?'#C4A0FF':'#638087'}"/><path d="M${x+10} ${y+2}H${x+w-10}" stroke="#FFF" stroke-opacity=".25"/>${text(x+w/2,y+(small?30:36),label,small?16:21,'#F6F4FF',`${mid} font-weight="600"`)}</g>`;
const chair = `<circle cx="48" cy="46" r="24" fill="#061C25" stroke="#10C8BB"/><path d="M37 33Q35 26 42 26H54Q61 26 59 33L57 44H39ZM35 40Q30 35 30 42V52H66V42Q66 35 61 40M36 52V60M60 52V60" fill="#DBAE45" stroke="#FFE09A" stroke-width="1.3" transform="translate(7 10) scale(.86)"/>`;
const sender = chair + text(84,43,'Angrier Jordan',21,'#E6EAF0','font-weight="600"') + '<rect x="250" y="28" width="36" height="20" rx="4" fill="#5865F2"/>' + text(268,43,'APP',11,'white',`${mid} font-weight="600"`) + text(606,42,'Today at 4:20 PM',15,'#A8CCD7','text-anchor="end"');
const frame = body => `<svg xmlns="http://www.w3.org/2000/svg" width="650" height="996" viewBox="0 0 650 996">${defs}<g clip-path="url(#clip)"><image href="${lounge}" width="650" height="996" preserveAspectRatio="xMidYMid slice"/><rect width="650" height="996" fill="url(#wash)"/><rect x="12" y="12" width="626" height="68" rx="12" fill="#081B25" fill-opacity=".8"/>${sender}${body}</g><rect x="1" y="1" width="648" height="994" rx="18" fill="none" stroke="#A469E2" stroke-width="1.8"/><rect x="6" y="6" width="638" height="984" rx="14" fill="none" stroke="#ACE0D2" stroke-opacity=".15"/><path d="M14 34V14H34M616 982H636V962" stroke="#F4C542" fill="none" stroke-opacity=".7"/></svg>`;
const header = (subtitle,state,color) => '<circle cx="52" cy="130" r="28" fill="#301E48" fill-opacity=".8" stroke="#B481F6"/><path d="M42 130H62M42 136H62M42 124H62" stroke="#DCBFFF" stroke-width="2"/>' + heading(95,142,'Line Time',41) + pill(536,116,86,'!line','#D3B4FF') + text(26,185,subtitle,24) + pill(26,207,208,state,color);
const footer = (copy='One community. One countdown.',sub='SIT. PLAY. BELONG.') => text(325,943,copy,18,'#E1E5D9',mid)+text(325,972,sub,13,'#BECEC4',`${mid} letter-spacing="1.3"`);
const names = ['Jordan','Alex','Sam','Morgan','Taylor','Casey','Riley','Jamie'];
const mixed = names.map((name,i)=>({name,ready:i<5}));
const all = mixed.map(m=>({...m,ready:true}));
const initial = mixed.slice(0,1);
function stats(members,y=372) {
  const ready=members.filter(m=>m.ready).length;
  return [[24,members.length,'GATHERED','#D3B4FF'],[232,ready,'READY','#56E3B6'],[440,members.length-ready,'NEED A SECOND','#F4CF78']].map(([x,n,label,c])=>panel(x,y,186,91)+heading(x+93,y+42,n,33,c,mid)+text(x+93,y+68,label,12,'#C8DCD9',`${mid} letter-spacing="1.2"`)).join('');
}
function roster(members) {
  let out = panel(24,484,602,240) + text(43,514,'MEMBER CHECK-IN',13,'#D7C5F1','font-weight="600" letter-spacing="1.7"') + text(604,514,'Jordan · Host',12,'#DFCA98','text-anchor="end"');
  for (let i=0;i<members.length;i++) {
    const m=members[i], x=44+Math.floor(i/4)*294, y=550+(i%4)*45;
    out += `<circle cx="${x+12}" cy="${y-6}" r="13" fill="#28484B" stroke="#4D7978"/>` + text(x+12,y-1,m.name[0],12,'#EBF1EC',mid) + text(x+36,y,m.name,17) + text(x+247,y,m.ready?'Ready':'One second',12,m.ready?'#68E0B7':'#F3CD80','text-anchor="end"');
  }
  if(members.length===1) out+=text(325,624,'The host is in. Your chair is waiting.',19,'#C5D8D3',mid)+text(325,657,'Join when you’re ready.',16,'#A5C5C4',mid);
  return out;
}
function readiness({kind='open',members=mixed,seconds=42,extended=false}) {
  const locked=kind==='locked';
  let body=header(locked?'The lounge is set. Host, take it from here.':'The Chairs are gathering.',locked?'ENTRIES LOCKED':extended?'READINESS EXTENDED':'READINESS OPEN');
  body+=panel(24,257,602,95,'#835CAF')+'<circle cx="57" cy="297" r="16" stroke="#CEADFF" fill="none" stroke-width="2"/>'+(locked?'<path d="M50 295V290A7 7 0 0 1 64 290V295M49 295H65V307H49Z" fill="none" stroke="#CEADFF" stroke-width="1.7"/>':'<path d="M57 286V297L64 301" stroke="#CEADFF" fill="none" stroke-width="2"/>');
  body+=text(88,286,locked?'Readiness window closed':'Readiness closes in',16,'#C6CED8')+heading(88,318,locked?'Waiting for Jordan':`${seconds} seconds`,27,'#F2E9FF')+text(602,306,locked?'Entry is closed.':extended?'+30 seconds added.':'One shared start.',17,'#D1E3DD','text-anchor="end"');
  body+='<rect x="42" y="334" width="566" height="4" rx="2" fill="#283643"/>'+(locked?'':`<rect x="42" y="334" width="${566*seconds/(extended?90:60)}" height="4" rx="2" fill="url(#purple)"/>`)+stats(members)+roster(members);
  if(locked) body+=panel(24,746,602,57)+text(325,782,'Check-ins saved · only the host can continue',18,'#C5D8D3',mid);
  else body+=button(24,746,293,'I’m In','purple')+button(333,746,293,'I Need a Second');
  body+=text(325,836,'HOST CONTROLS · JORDAN',11,'#DFC68A',`${mid} letter-spacing="1.6"`);
  if(locked) body+=button(24,852,293,'Start Countdown','purple',false,true)+button(333,852,293,'Cancel Line','ghost',false,true);
  else body+=button(24,852,174,extended?'+30 Used':'+30 Seconds','ghost',extended,true)+button(210,852,228,'Start Countdown','purple',false,true)+button(450,852,176,'Cancel Line','ghost',false,true);
  body+=footer(undefined,locked?'YOUR CHECK-IN STAYS VISIBLE':extended?'EXTENSION USED · 90-SECOND MAXIMUM':'60 SECONDS · ONE HOST EXTENSION');
  return frame(body);
}
const shameSource=JSON.parse(fs.readFileSync(new URL('../../angrier_jordan_precode_construction_pack_v1/reference/acceleration/content/line_shame_120.json',import.meta.url),'utf8'))[0];
const shame=shameSource.text.replace('{user}','Casey');
function eventBase(state='COUNTDOWN LIVE') {
  return header('One room. One shared moment.',state) + panel(24,257,602,467,'#835CAF') + '<rect x="34" y="267" width="582" height="447" rx="8" fill="none" stroke="#D4BA77" stroke-opacity=".22"/>';
}
function settledInfo(mode='countdown') {
  if(mode==='complete') return panel(24,746,602,161)+heading(325,792,'8 members. One shared moment.',25,'#F1ECF5',mid)+text(325,831,'The countdown is complete.',19,'#C8D9D3',mid)+text(325,872,'Thanks for showing up, Chairs.',17,'#C8D9D3',mid);
  return panel(24,746,602,161)+text(325,779,'8 gathered · 5 ready · 3 needed a second',17,'#DFC6FB',mid)+text(325,814,'Jordan started the countdown.',17,'#D1E2DA',mid)+text(325,854,'Wonderful. Casey needed more time.',16,'#E7DCC4',mid)+text(325,878,'We are starting anyway.',16,'#E7DCC4',mid);
}
function countdown(n,progress=0) {
  const ring=(n-progress)/5*2*Math.PI*139;
  return frame(eventBase()+'<g clip-path="url(#center)"><ellipse cx="325" cy="480" rx="258" ry="225" fill="url(#halo)"/><circle cx="325" cy="484" r="151" fill="#071C25" fill-opacity=".6" stroke="#967846" stroke-opacity=".55"/><circle cx="325" cy="484" r="139" fill="none" stroke="#5F4B74" stroke-opacity=".4" stroke-width="3"/>'+`<circle cx="325" cy="484" r="139" fill="none" stroke="#C8A1FF" stroke-width="3" stroke-linecap="round" stroke-dasharray="${ring} 1000" transform="rotate(-90 325 484)"/>`+text(325,306,'THE COUNTDOWN',13,'#D6C3F1',`${mid} letter-spacing="2.6"`)+heading(325,541,n,166,'#F3ECFF',mid)+text(325,676,'Together in the lounge.',19,'#C7DCD4',mid)+'</g>'+settledInfo()+footer());
}
// Fixed-seed, bounded powder and brief wood/brass fragments; no runtime generation.
const fract=n=>n-Math.floor(n);
const rnd=i=>fract(Math.sin(i*123.731+73.1)*47321.9123);
function burst(p=.48) {
  const expansion=.3+Math.sin(Math.min(p,1)*Math.PI/2)*.9;
  const alpha=p>.65?Math.max(0,(1-p)/.35):1;
  let fx=`<g clip-path="url(#center)" opacity="${alpha}">`;
  for(let i=0;i<72;i++) {
    const angle=rnd(i)*Math.PI*2, r=(12+rnd(i+100)*175)*expansion;
    const x=325+Math.cos(angle)*r*1.12,y=492+Math.sin(angle)*r*.74+p*24;
    fx+=`<ellipse cx="${x}" cy="${y}" rx="${30+rnd(i+200)*67}" ry="${25+rnd(i+300)*49}" fill="url(#dust)" opacity="${.48+rnd(i+400)*.44}"/>`;
  }
  for(let i=0;i<220;i++) {
    const a=rnd(i+500)*Math.PI*2,r=(65+rnd(i+600)*172)*expansion;
    fx+=`<circle cx="${325+Math.cos(a)*r}" cy="${486+Math.sin(a)*r*.79+p*p*65}" r="${.4+rnd(i+700)*1.6}" fill="#F2F4F0" opacity="${.25+rnd(i+800)*.6}"/>`;
  }
  for(let i=0;i<7;i++) {
    const a=(i/7)*Math.PI*2+.2,r=(139+rnd(i+900)*56)*expansion;
    const x=325+Math.cos(a)*r,y=490+Math.sin(a)*r*.72+p*p*35;
    fx+=`<g transform="translate(${x} ${y}) rotate(${i*43+p*75})" opacity="${Math.max(0,1-p*1.2)}"><path d="M-3 -17Q2 -12 3 0L1 18H-2L-4 -4Z" fill="url(#brass)" stroke="#372416"/><path d="M-4 -10H4V-4H-3Z" fill="#674329"/></g>`;
  }
  fx+='</g>';
  return frame(eventBase('THE MOMENT')+text(325,306,'ALL TOGETHER',13,'#D6C3F1',`${mid} letter-spacing="2.6"`)+fx+text(325,676,'One glorious cloud of chaos.',19,'#DDE4DB',mid)+settledInfo()+footer());
}
function complete() {
  return frame(eventBase('LINE COMPLETE')+'<ellipse cx="325" cy="466" rx="236" ry="198" fill="url(#halo)"/><circle cx="325" cy="438" r="74" fill="#0E3233" fill-opacity=".8" stroke="#B69559"/><path d="M289 438 314 462 362 413" stroke="#74E6BC" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" fill="none"/>'+heading(325,562,'A moment for the Chairs.',32,'#F0E9F7',mid)+text(325,604,'Line complete.',21,'#BBDCD0',mid)+text(325,676,'SIT. PLAY. BELONG.',13,'#E7CC80',`${mid} letter-spacing="3"`)+settledInfo('complete')+footer('The lounge is always here.','START A NEW EVENT WITH !line'));
}
function cancelled() {
  return frame(header('We’ll gather another time.','LINE CANCELLED','#D6BC91')+panel(24,257,602,95,'#8C7757')+heading(325,302,'Cancelled by Jordan',27,'#E8DBC6',mid)+text(325,331,'The Line is closed. No countdown started.',17,'#C4D5D1',mid)+stats(mixed)+roster(mixed)+panel(24,746,602,161)+heading(325,804,'Until next time, Chairs.',27,'#EBE4D7',mid)+text(325,849,'No action needed.',18,'#C4D5D1',mid)+footer('The lounge is always here.','START A NEW EVENT WITH !line'));
}
const states=[
  ['01-opened','Event opened','Host is automatically in; 60 seconds remain.',()=>readiness({members:initial,seconds:60})],
  ['02-checking-in','Member check-ins','Ready and “I Need a Second” shown together.',()=>readiness({})],
  ['03-all-ready','Everyone ready','The host may start early; no automatic start.',()=>readiness({members:all,seconds:31})],
  ['04-extended','Host extension used','42 seconds becomes 72; extension cannot repeat.',()=>readiness({seconds:72,extended:true})],
  ['05-locked','Entries locked','Check-ins stay visible; only the host can act.',()=>readiness({kind:'locked'})],
  ...[5,4,3,2,1].map((n,i)=>[`${String(6+i).padStart(2,'0')}-countdown-${n}`,`Countdown · ${n}`,'Same center, frame and authoritative countdown.',()=>countdown(n)]),
  ['11-powder-burst','Powder burst','After 1, a bounded burst with brief chair debris.',()=>burst()],
  ['12-complete','Complete','No replay or rematch controls.',complete],
  ['13-cancelled','Cancelled','Host cancellation; the check-in record remains visible.',cancelled]
];
const rendered=[];
for(const [id,label,note,render] of states) {
  const svg=render(), png=await rasterizeSvg(svg);
  fs.writeFileSync(new URL(`${id}.svg`,dir),svg);
  fs.writeFileSync(new URL(`${id}.png`,dir),png);
  rendered.push({id,label,note,png,svg});
}
async function board(file,title,indices,cols=2,scale=1) {
  const w=650*scale,h=996*scale,gap=24,pad=28,head=108,labelH=64;
  const rows=Math.ceil(indices.length/cols),width=Math.round(pad*2+w*cols+gap*(cols-1)),height=Math.round(head+rows*(h+labelH+gap)+24);
  const images=[];
  let svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="100%" height="100%" fill="#04131D"/>${heading(pad,49,title,30)}${text(pad,80,'STANDALONE VISUAL CONCEPT · FIXTURE DATA · OWNER REVIEW',12,'#A2C4BF','letter-spacing="1.3"')}`;
  for(let i=0;i<indices.length;i++) {
    const s=rendered[indices[i]], x=Math.round(pad+i%cols*(w+gap)),y=Math.round(head+Math.floor(i/cols)*(h+labelH+gap));
    svg+=heading(x,y+23,`${s.id.slice(0,2)} / ${s.label}`,21,'#D4B8F4')+text(x,y+48,w<400?'Fixed frame · one-second beat.':s.note,13,'#AFCBC5');
    images.push({input:await sharp(s.png).resize(Math.round(w),Math.round(h)).toBuffer(),left:x,top:y+labelH});
  }
  svg+='</svg>';
  fs.writeFileSync(new URL(file,dir),await sharp(await rasterizeSvg(svg)).composite(images).png().toBuffer());
}
await board('01-readiness-board.png','!line · Readiness & host controls',[0,1,2,3,4,12],2,.86);
await board('02-countdown-board.png','!line · The countdown',[5,6,7,8,9],5,.46);
await board('03-finish-board.png','!line · Burst & completion',[10,11]);

// One-shot concept animation: exactly 5,4,3,2,1, then burst, then completion.
const animation=[],delays=[];
async function addAnimation(svg,delay) {
  animation.push(await sharp(await rasterizeSvg(svg)).ensureAlpha().raw().toBuffer());delays.push(delay);
}
for(const n of [5,4,3,2,1]) for(let step=0;step<4;step++) await addAnimation(countdown(n,step/4),250);
for(let i=0;i<16;i++) await addAnimation(burst(.12+i*.054),50);
await addAnimation(complete(),2200);
const anim=sharp(Buffer.concat(animation),{raw:{width:650,height:996*animation.length,channels:4,pageHeight:996}});
fs.writeFileSync(new URL('line-countdown-once.webp',dir),await anim.clone().webp({quality:84,loop:1,delay:delays,effort:4}).toBuffer());
fs.writeFileSync(new URL('line-countdown-once.gif',dir),await anim.clone().gif({loop:1,delay:delays,colours:256,dither:0,effort:3}).toBuffer());

const gallery=rendered.map(s=>`<button class="thumb" data-id="${s.id}" aria-label="Open ${s.label}"><img loading="lazy" src="${s.id}.png" alt="${esc(s.label)}"><strong>${s.id.slice(0,2)} / ${esc(s.label)}</strong><span>${esc(s.note)}</span></button>`).join('');
const html=`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Angrier Jordan · !line state review</title><style>
@font-face{font-family:Inter;src:url('../../../angrier_jordan_precode_construction_pack_v1/packages/renderer/fonts/Inter-Variable.ttf')}@font-face{font-family:Space;src:url('../../../angrier_jordan_precode_construction_pack_v1/packages/renderer/fonts/SpaceGrotesk-Variable.ttf')}*{box-sizing:border-box}body{margin:0;background:#07131e;color:#e6eaf0;font:16px Inter,Arial,sans-serif}header,main{max-width:1600px;margin:auto;padding:28px}h1,h2,strong{font-family:Space,Inter,sans-serif}h1{margin:12px 0;font-size:34px}p{color:#bdd1cd;line-height:1.6}.eyebrow{color:#ccacf1;font-size:12px;letter-spacing:2px}.note{padding:18px;border:1px solid #46656b;border-radius:12px;background:#10252e}nav{display:flex;gap:12px;flex-wrap:wrap;margin:22px 0}a,.play{color:#f1e9ff;background:#392055;border:1px solid #b185db;border-radius:8px;padding:12px 18px;text-decoration:none;font:inherit;cursor:pointer}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:24px}.thumb{padding:0 0 18px;text-align:left;background:#10212d;border:1px solid #3e5464;border-radius:14px;overflow:hidden;color:inherit;cursor:zoom-in}.thumb img{display:block;width:100%;height:auto}.thumb strong,.thumb span{display:block;margin:14px 16px 0}.thumb span{font:13px Inter,sans-serif;color:#aec8c4;line-height:1.5}dialog{background:#04131d;color:#e6eaf0;border:1px solid #8f65b8;border-radius:14px;max-height:96vh;max-width:96vw;padding:16px}dialog::backdrop{background:#01080ee8}.bar{display:flex;align-items:center;justify-content:space-between;gap:20px;margin-bottom:12px}.bar button{background:#233d48;color:white;border:1px solid #6c838e;border-radius:6px;padding:10px 18px;cursor:pointer}dialog img{display:block;max-width:100%;width:auto;max-height:80vh;margin:auto}footer{color:#9fbab5;font-size:13px;margin:30px 0}#motion{text-align:center;margin:48px 0 16px}#motion img{display:block;width:min(100%,650px);margin:20px auto}button:focus-visible,a:focus-visible{outline:3px solid #f4c542;outline-offset:4px}</style>
<header><div class="eyebrow">ANGRIER JORDAN / STANDALONE OWNER REVIEW</div><h1>!line — every public visual state</h1><p>The same lounge, frame and typography throughout. Purple identifies Line; emerald marks readiness, gold marks attention. These are visual fixtures, not an implemented Discord event.</p><div class="note">Opening → member check-in → optional extension → entry lock → host countdown → 5 · 4 · 3 · 2 · 1 → powder burst → complete.<br>The host can start early or cancel. “Everyone ready” is a check-in variant; it does not auto-start. This countdown example shows an authored host override.</div><nav><a href="#states">All 13 state renders</a><a href="#motion">Play countdown</a><a href="../window-study.png">Original Line + basic game board</a></nav></header>
<main><div id="states" class="grid">${gallery}</div><section id="motion"><h2>Countdown → burst → complete</h2><p>One-shot concept preview. The center changes; the outside frame stays fixed.</p><button class="play" id="play">Play countdown preview</button><img id="animation" src="06-countdown-5.png" alt="Countdown animation preview"></section><footer>Permanent: lounge materials and lighting, navy/teal base, gold details, frame, Space Grotesk / Inter, sender identity.<br>Feature/state: purple skin, state badge, countdown, readiness colors and controls.<br>All 13 renders are 650 × 996. No production integration. Race/Fight and Railway remain paused.</footer></main>
<dialog><div class="bar"><button id="prev" aria-label="Previous state">←</button><strong id="label"></strong><button id="next" aria-label="Next state">→</button><button id="close">Close</button></div><img id="full" alt=""></dialog><script>const data=${JSON.stringify(rendered.map(({id,label})=>({id,label})))};let index=0;const modal=document.querySelector('dialog');function show(i){index=(i+data.length)%data.length;document.querySelector('#full').src=data[index].id+'.png';document.querySelector('#full').alt=data[index].label;document.querySelector('#label').textContent=data[index].label}document.querySelectorAll('.thumb').forEach((b,i)=>b.onclick=()=>{show(i);modal.showModal()});document.querySelector('#close').onclick=()=>modal.close();document.querySelector('#prev').onclick=()=>show(index-1);document.querySelector('#next').onclick=()=>show(index+1);document.addEventListener('keydown',e=>{if(modal.open&&e.key==='ArrowLeft')show(index-1);if(modal.open&&e.key==='ArrowRight')show(index+1)});document.querySelector('#play').onclick=()=>document.querySelector('#animation').src='line-countdown-once.webp?v='+Date.now();</script></html>`;
fs.writeFileSync(new URL('index.html',dir),html);
fs.writeFileSync(new URL('README.md',dir),`# !line — all-state visual study\n\nReview-only extension of the standalone Line concept. No production code or behavior was changed.\n\nOpen index.html for the gallery, full-size state viewer and one-shot countdown preview. Static state PNGs and SVGs are reproducible with node review-concepts/aj-window-study-v1/render-line-states.mjs.\n\n## State coverage\n${states.map(([id,label,note])=>`- ${id}: ${label}. ${note}`).join('\n')}\n\nThe all-ready and extension cards are alternate readiness fixtures. The countdown uses the host-override branch, preserving five ready / three needing a second. The first authored shame line (${shameSource.id}) is used unchanged after substituting Casey for {user}: “${shame}”\n\nThe countdown shows no zero, keeps the frame fixed, and has no terminal action buttons. Host controls are present while readiness is open; after lock only Start Countdown / Cancel Line remain. The extension is shown disabled after use. No cap is introduced by the eight-member fixture.\n\nUnauthorized invocation is silent, so it has no event-window render. The opt-in role notification and authored launch callout belong to the surrounding Discord message, outside this window study. No extra functional states or dialogs are proposed here.\n\n## Presentation\nPermanent: fixed lounge artwork/materials/lighting, midnight and teal, gold details, frame, sender, Space Grotesk headings and Inter body. Variable: purple feature skin, state/countdown content, ready/attention accents and controls. Custom button finishes are concept styling, not a claim about native Discord button theming.\n\nBackground provenance is documented in ../README.md. Particle shapes are deterministic and bounded to the center. No runtime AI generation.\n\n## Review boundary\nOwner visual approval remains pending. Production Line implementation, Race/Fight revisions and Railway readiness are paused. These files do not enable or deploy anything.\n`);
const sha=b=>createHash('sha256').update(b).digest('hex');
const checks={stateCount:rendered.length,dimensions:'650x996',countdown:[5,4,3,2,1],visibleZero:false,terminalButtons:false,animationFrames:animation.length,animationDurationMs:delays.reduce((a,b)=>a+b,0),animationPlays:1,shameSource:shameSource.id,productionChanges:false,states:rendered.map(s=>({id:s.id,sha256:sha(s.png)}))};
// Check the generated outputs, including deterministic rasterization and fixed animation borders.
for(const s of rendered){const m=await sharp(s.png).metadata();if(m.width!==650||m.height!==996)throw Error('Bad dimensions');}
if(sha(await rasterizeSvg(rendered[5].svg))!==sha(rendered[5].png))throw Error('Nondeterministic render');
for(const s of rendered.filter(s=>/countdown/.test(s.id)))if(/>0<\/text>/.test(s.svg))throw Error('Zero frame');
const ref=await sharp(rendered[5].png).extract({left:0,top:0,width:650,height:200}).raw().toBuffer();
for(const s of rendered.slice(6,11)){const strip=await sharp(s.png).extract({left:0,top:0,width:650,height:200}).raw().toBuffer();if(!ref.equals(strip))throw Error('Frame shifted');}
checks.deterministicRaster='PASS';checks.stableCountdownFrame='PASS';
fs.writeFileSync(new URL('validation.json',dir),JSON.stringify(checks,null,2)+'\n');
console.log(JSON.stringify({output:dir.pathname,states:rendered.length,animationFrames:animation.length,validation:'PASS'}));
