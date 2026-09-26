import test from 'node:test';
import assert from 'node:assert/strict';
import {renderCasinoResult} from '../../dist/packages/features-casino/src/render.js';
import {renderSpotlight,renderRecords,renderProfile} from '../../dist/packages/features-profiles/src/render.js';
import {brandedNotice} from '../../dist/packages/features-events/src/gate-b-visual.js';
import {textWidth} from '../../dist/packages/renderer/src/text-layout.js';

const decode=s=>s.replaceAll('&amp;','&').replaceAll('&lt;','<').replaceAll('&gt;','>').replaceAll('&quot;','"').replaceAll('&#39;',"'");
function assertBounds(svg){
 const height=Number(svg.match(/<svg[^>]*height="([\d.]+)"/)[1]);let checked=0;
 for(const match of svg.matchAll(/<text\b([^>]*)>([^<]*)<\/text>/g)){
  const attr=Object.fromEntries([...match[1].matchAll(/([\w-]+)="([^"]*)"/g)].map(m=>[m[1],m[2]]));
  const size=Number(attr['font-size']),x=Number(attr.x),y=Number(attr.y),width=textWidth(decode(match[2]),size);
  assert.equal(attr['text-anchor'],'middle',match[2]);
  assert.ok(x-width/2>=17&&x+width/2<=423,`Horizontal bounds: ${match[2]}`);
  assert.ok(y-size>=7&&y+size*.3<height-7,`Vertical bounds: ${match[2]}`);checked++;
 }
 assert.ok(checked>3);
}
test('Gate B centered composition contains short, wide, Unicode, warning and maximum-value text',()=>{
 for(const name of ['Li','W'.repeat(32),'王'.repeat(32),'Álëx 👩‍🚀 '.repeat(4)]){
  const amount='9223372036854775807';
  const cards=[renderCasinoResult({title:'Chair Pot Jackpot',subtitle:'Settled',memberName:name,amount,amountLabel:'Won',details:[{label:'Status',value:'Warning: this is a long fixture status that must stay within the lounge panel.'}]}),renderRecords({scope:'All time',records:[{title:'Largest payout',memberName:name,amount,achievedAt:'Sep 25, 2026'}]}),renderProfile({name,sections:[{label:'Activity',value:'Activity statistics are private.'}]}),renderSpotlight({weekStart:'2026-09-14',weekEnd:'2026-09-21',activeMembers:2147483647,messages:2147483647,words:2147483647,voiceSeconds:2147483647,categories:[{title:'The Loudest Chair',winners:[name,'Li'].map(name=>({name,avatarData:'',total:'2147483647',lifetimeWins:999,status:'Returning winner',tripleThreat:true}))}]})];
  for(const svg of cards){assertBounds(svg);assert.doesNotMatch(svg,/href="https?:/);}
 }
 assertBounds(brandedNotice('Action unavailable','Warning: permission changed. Saved state remains unchanged. Please reopen this window.'));
});
