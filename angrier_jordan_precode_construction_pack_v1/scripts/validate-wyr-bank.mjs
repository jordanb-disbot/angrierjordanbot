import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';

const canonical=new URL('../packages/features-party/content/wyr_2000.json',import.meta.url);
const validCategories=new Map([['Casual',1],['Friends',2],['Dating',2],['Married',2],['Spicy',3],['Unhinged',4]]);
const normalize=value=>value.toLowerCase().replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ');
const tokens=value=>new Set(normalize(value).split(' ').filter(word=>word.length>2&&!new Set(['would','rather','have','with','that','this','your','from','than','always']).has(word)));
const similarity=(a,b)=>{const shared=[...a].filter(word=>b.has(word)).length;return a.size+b.size===0?0:shared/(a.size+b.size-shared);};
const pairClass=(left,right)=>left.id<'WYR-0461'||right.id<'WYR-0461'?'new':'existing';
const issue=(kind,left,right,score)=>({kind,scope:pairClass(left,right),ids:[left.id,right.id],...(score===undefined?{}:{score:Number(score.toFixed(3))})});
const idScope=id=>id<'WYR-0461'?'new':'existing';
export function inspect(rows){
 const errors=[],warnings=[],ids=new Set(),texts=new Map(),options=new Map();
 for(const row of rows){
  if(!/^WYR-\d{4}$/.test(row.id)||Number(row.id.slice(4))<1||Number(row.id.slice(4))>2000)errors.push({kind:'invalid_id',id:row.id,scope:idScope(row.id)});
  if(ids.has(row.id))errors.push({kind:'duplicate_id',id:row.id,scope:idScope(row.id)});ids.add(row.id);
  if(row.game!=='would_you_rather'||!validCategories.has(row.category)||row.intensity!==validCategories.get(row.category)||row.text!==`Would you rather ${row.option_a} or ${row.option_b}?`||typeof row.option_a!=='string'||!row.option_a.trim()||typeof row.option_b!=='string'||!row.option_b.trim()||row.option_a===row.option_b||!Array.isArray(row.tags)||row.tags.length!==1||row.tags[0]!==row.category.toLowerCase()||row.enabled!==true||row.review_status!=='auto_approved'||row.content_version!==1)errors.push({kind:'schema',id:row.id,scope:idScope(row.id)});
  const text=normalize(row.text),optionKey=normalize(row.option_a)+'|'+normalize(row.option_b),reversed=normalize(row.option_b)+'|'+normalize(row.option_a);
  if(texts.has(text))errors.push(issue('normalized_duplicate',row,texts.get(text)));else texts.set(text,row);
  if(options.has(optionKey))errors.push(issue('option_duplicate',row,options.get(optionKey)));if(options.has(reversed))errors.push(issue('reversed_options',row,options.get(reversed)));options.set(optionKey,row);
 }
 for(let number=1;number<=2000;number++)if(!ids.has(`WYR-${String(number).padStart(4,'0')}`))errors.push({kind:'missing_id',id:`WYR-${String(number).padStart(4,'0')}`,scope:number<461?'new':'existing'});
 const tokenized=rows.map(row=>tokens(row.text));
 for(let left=0;left<rows.length;left++)for(let right=left+1;right<rows.length;right++){const score=similarity(tokenized[left],tokenized[right]);if(score>=0.72)warnings.push(issue('high_text_similarity',rows[left],rows[right],score));}
 const newWarnings=warnings.filter(row=>row.scope==='new'),existingWarnings=warnings.filter(row=>row.scope==='existing'),newErrors=errors.filter(row=>row.scope==='new'),existingIssues=errors.filter(row=>row.scope==='existing');
 return {count:rows.length,categories:Object.fromEntries([...validCategories.keys()].map(category=>[category,rows.filter(row=>row.category===category).length])),errors:newErrors,existingIssues,warnings:{new:newWarnings,existing:existingWarnings},valid:newErrors.length===0&&newWarnings.length===0};
}
export function main(path=canonical){const rows=JSON.parse(readFileSync(path,'utf8')),report=inspect(rows);console.log(`WYR validation: count=${report.count}; categories=${JSON.stringify(report.categories)}; new_errors=${report.errors.length}; new_similarity=${report.warnings.new.length}; existing_issues=${report.existingIssues.length}; existing_similarity=${report.warnings.existing.length}`);for(const error of report.errors)console.log('ERROR: '+JSON.stringify(error));for(const warning of report.warnings.new)console.log('ERROR: '+JSON.stringify(warning));for(const issue of report.existingIssues)console.log('WARN: '+JSON.stringify(issue));for(const issue of report.warnings.existing.slice(0,20))console.log('WARN: '+JSON.stringify(issue));if(report.warnings.existing.length>20)console.log(`WARN: existing similarity list truncated after 20 of ${report.warnings.existing.length}; inspect(rows).warnings.existing retains every pair.`);return report.valid?0:1;}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)process.exitCode=main(process.argv[2]?new URL(process.argv[2],pathToFileURL(process.cwd()+'/')):canonical);
