import test from 'node:test';
import assert from 'node:assert/strict';
import {renderIntroductionFields,renderIntroductionHub} from '../../dist/packages/features-introductions/src/render.js';
const questions=[
 'What should we call you?',
 'What is your drug of choice?',
 'What is your most controversial opinion?',
 'If on death row, what would your last meal be?',
 'What is your favorite type of chair?'
];
const fields=questions.map((label,n)=>({label,answer:`Answer ${n+1}`}));
const textNodes=svg=>[...svg.matchAll(/<text x="([\d.]+)" y="([\d.]+)" font-size="([\d.]+)"[^>]*>(.*?)<\/text>/g)].map(m=>({x:+m[1],y:+m[2],size:+m[3],value:m[4]}));
test('Five structured intro questions form a centered 2–1–2 card with prominent avatar and name',()=>{
 const svg=renderIntroductionFields(fields,'NotJordan',undefined,true);
 assert.equal((svg.match(/fill="#301C29"/g)||[]).length,5);
 assert.ok(svg.includes('portrait-intro'));
 assert.match(svg,/<rect x="66" y="\d+" width="176" height="176"/);
 assert.match(svg,/<text x="278" y="\d+" font-size="52"[^>]*font-weight="700">NotJordan<\/text>/);
 assert.ok(svg.includes('font-family="Space Grotesk"'));
 assert.ok(svg.includes('font-family="Inter"'));
 assert.ok(!svg.includes('Cinzel')&&!svg.includes('Poppins'));
 for(let n=1;n<=5;n++)assert.ok(svg.includes(`Answer ${n}`));
 const plates=[...svg.matchAll(/<rect x="(60|610)" y="([\d.]+)" width="(530|1080)" height="([\d.]+)"/g)].map(m=>({x:+m[1],y:+m[2],width:+m[3],height:+m[4]}));
 assert.deepEqual(plates.map(p=>[p.x,p.width]),[[60,530],[610,530],[60,1080],[60,530],[610,530]]);
 assert.equal(plates[0].y,plates[1].y);
 assert.equal(plates[3].y,plates[4].y);
 assert.ok(plates[2].y>plates[0].y+plates[0].height);
 assert.ok(plates[3].y>plates[2].y+plates[2].height);
 const centered=textNodes(svg).filter(n=>questions.includes(n.value)||/^Answer [1-5]$/.test(n.value));
 assert.ok(centered.some(n=>n.x===600));
 assert.ok(centered.every(n=>[325,600,875].includes(n.x)));
});
test('Blank answers remain present and multiline answer paragraphs never become questions or disappear',()=>{
 const svg=renderIntroductionFields([{label:questions[0],answer:''},{label:questions[1],answer:'First paragraph\n\nSecond paragraph\n<script> & friends'}],'Member',undefined,false,'Footer');
 assert.equal((svg.match(/fill="#301C29"/g)||[]).length,2);
 for(const value of ['Not shared','First paragraph','Second paragraph','&lt;script&gt; &amp; friends'])assert.ok(svg.includes(value));
 assert.ok(!svg.includes('<script>'));
});
test('Long answers expand their row without clipping and retain all final words',()=>{
 const answers=fields.map((field,n)=>({...field,answer:(n%2?'x'.repeat(650):'A paragraph about chairs. '.repeat(35))+` END${n}`}));
 const svg=renderIntroductionFields(answers,'A very long display name '.repeat(5),undefined,true,'Welcome home',{headerText:'Community introductions',joinedAt:'2026-09-27'});
 const plates=[...svg.matchAll(/<rect x="(60|610)" y="([\d.]+)" width="(530|1080)" height="([\d.]+)"/g)].map(m=>({x:+m[1],y:+m[2],width:+m[3],height:+m[4]}));
 const nodes=textNodes(svg),height=+/<svg[^>]+height="(\d+)"/.exec(svg)[1];
 for(let n=0;n<5;n++)assert.ok(svg.includes(`END${n}`));
 for(const p of plates){const inPlate=nodes.filter(t=>t.x===p.x+p.width/2&&t.y>=p.y&&t.y<p.y+p.height);assert.ok(inPlate.length>2);for(const t of inPlate)assert.ok(t.y+t.size*.25<p.y+p.height);}
 assert.ok(nodes.every(t=>t.y+t.size*.25<height-25));
 assert.ok(svg.includes('Community introductions'));
 assert.ok(svg.includes('Joined 2026-09-27'));
});
test('Private form summary is one unified panel with all five numbered prompts',()=>{
 const svg=renderIntroductionHub('Your answers stay private until you publish.',questions);
 assert.equal((svg.match(/fill="#301C29"/g)||[]).length,1);
 assert.ok(svg.includes('YOUR INTRODUCTION · ONE FORM'));
 for(const [index,question] of questions.entries()){
  assert.ok(svg.includes(question));
  assert.match(svg,new RegExp(`>${String(index+1).padStart(2,'0')}<\\/text>`));
 }
 assert.ok(svg.includes('Save privately → Preview → Publish when ready'));
});
