import test from 'node:test';
import assert from 'node:assert/strict';
import {renderIntroductionFields} from '../../dist/packages/features-introductions/src/render.js';
const questions=[
 'What should we call you?',
 'What is your drug of choice?',
 'What fictional character would you choose to get high with?',
 'What is your most controversial opinion?',
 'If on death row, what would your last meal be?',
 'What is your favorite type of chair?'
];
const fields=questions.map((label,n)=>({label,answer:`Answer ${n+1}`}));
const textNodes=svg=>[...svg.matchAll(/<text x="([\d.]+)" y="([\d.]+)" font-size="([\d.]+)"[^>]*>(.*?)<\/text>/g)].map(m=>({x:+m[1],y:+m[2],size:+m[3],value:m[4]}));
test('Six structured intro questions keep a complete three-row card, avatar and brand typography',()=>{
 const svg=renderIntroductionFields(fields,'NotJordan',undefined,true);
 assert.equal((svg.match(/fill="#301C29"/g)||[]).length,6);
 assert.ok(svg.includes('portrait-intro'));
 assert.ok(svg.includes('font-family="Space Grotesk"'));
 assert.ok(svg.includes('font-family="Inter"'));
 assert.ok(!svg.includes('Cinzel')&&!svg.includes('Poppins'));
 for(let n=1;n<=6;n++)assert.ok(svg.includes(`Answer ${n}`));
 const plates=[...svg.matchAll(/<rect x="(?:60|610)" y="([\d.]+)" width="530" height="([\d.]+)"/g)];
 assert.equal(plates.length,6);
 for(let n=0;n<6;n+=2){assert.equal(plates[n][1],plates[n+1][1]);assert.equal(plates[n][2],plates[n+1][2]);if(n)assert.ok(+plates[n][1]>+plates[n-2][1]+ +plates[n-2][2]);}
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
 const plates=[...svg.matchAll(/<rect x="(60|610)" y="([\d.]+)" width="530" height="([\d.]+)"/g)].map(m=>({x:+m[1],y:+m[2],height:+m[3]}));
 const nodes=textNodes(svg),height=+/<svg[^>]+height="(\d+)"/.exec(svg)[1];
 for(let n=0;n<6;n++)assert.ok(svg.includes(`END${n}`));
 for(const p of plates){const inPlate=nodes.filter(t=>t.x===p.x+24&&t.y>=p.y&&t.y<p.y+p.height);assert.ok(inPlate.length>2);for(const t of inPlate)assert.ok(t.y+t.size*.25<p.y+p.height);}
 assert.ok(nodes.every(t=>t.y+t.size*.25<height-25));
 assert.ok(svg.includes('Community introductions'));
 assert.ok(svg.includes('Joined 2026-09-27'));
});
