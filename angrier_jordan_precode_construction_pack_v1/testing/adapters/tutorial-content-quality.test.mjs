import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {COMMANDS} from '../../dist/packages/contracts/src/generated/commands.js';
import {hasAuthoredLesson,lessonCopy} from '../../dist/packages/features-learning/src/tutorial-content.js';
const authored=JSON.parse(readFileSync(new URL('../../packages/content/help/tutorial-lessons.json',import.meta.url),'utf8')).lessons;
const byId=id=>{const c=COMMANDS.find(c=>c.id===id);assert.ok(c,id);return lessonCopy(c);};
const combined=id=>{const c=byId(id);return[c.purpose,c.fields,...c.steps,c.completion].join('\n');};
test('every authored lesson has four useful teaching pages and a concrete next action',()=>{
 const selected=COMMANDS.filter(hasAuthoredLesson);assert.equal(selected.length,101);
 for(const c of selected){const copy=lessonCopy(c);for(const [page,value]of Object.entries({purpose:copy.purpose,inputs:copy.fields,workflow:copy.steps.join('\n'),completion:copy.completion})){assert.ok(value.trim().length>=80,`${c.id}: ${page} needs usable detail`);assert.doesNotMatch(value,/not been authored|Quick reference for|Follow its displayed controls where offered|No inputs are documented|has not been authored|placeholder/i,`${c.id}: ${page}`);}assert.ok(copy.steps.length>=3,c.id);assert.equal(new Set(copy.steps).size,copy.steps.length,c.id);assert.match(copy.completion,/Next:/,c.id);assert.ok(copy.example.startsWith(c.registered),c.id);for(const field of c.options.filter(o=>o.required))assert.ok(copy.example.includes(field.name+':'),c.id+': example missing '+field.name);}
 assert.equal(Object.keys(authored).length,selected.length);
});
test('unreviewed admin and component records cannot become selectable generic lessons',()=>{
 for(const id of ['intro_config','introduce_edit','introduce_preview','unwritten'])assert.equal(hasAuthoredLesson({id}),false,id);
 const dynamic=lessonCopy({id:'special_custom_lounge',registered:'!lounge',options:[]});assert.match(dynamic.completion,/Next:/);assert.match(dynamic.steps.join(' '),/does not send/);
});
test('roles lesson teaches all seven real categories, selection modes, removal and safe Practice',()=>{
 const copy=combined('roles');for(const category of ['DM Status','Gender','Age','Region','Interests / Substances','Personalities','Notification Pings'])assert.ok(copy.includes(category),category);
 for(const expected of [/single-select/i,/multi-select/i,/Clear choices/,/Reopening/,/Line Ping/,/setup is incomplete/,/below AJ/,/unmanaged/,/permission bits/,/Practice changes none/])assert.match(copy,expected);
 assert.doesNotMatch(copy,/Morning Porch/);
});
test('immediate item mutations are taught accurately rather than inventing confirmations',()=>{
 assert.match(combined('unlock_all'),/immediately/);assert.match(combined('unlock_all'),/no extra confirmation/);assert.doesNotMatch(combined('unlock_all'),/Confirm Unlock|Cancel keeps/);
 assert.match(combined('repair'),/Selecting a tier immediately pays/);assert.match(combined('repair'),/randomized/);
 assert.match(combined('craft'),/selection|Selecting|select a recipe/);assert.match(combined('craft'),/no separate confirmation/);
 assert.match(combined('shop'),/Submitting that form makes the purchase/);
});
test('party lessons distinguish WWYD authored buttons from sentence contributions',()=>{
 const w=combined('wwyd'),f=combined('finish');assert.match(w,/starts in voting/);assert.match(w,/response buttons/);assert.doesNotMatch(w,/Submit \/ Revise/);assert.match(f,/Submit \/ Revise/);assert.match(f,/anonymous contributions/);
});
test('music fields and authority match current handler distinctions',()=>{
 const play=byId('music_play');assert.match(play.fields,/query \(required/);assert.doesNotMatch(play.example,/query_or_link/);assert.match(play.example,/query:/);
 for(const id of ['music_previous','music_replay','music_seek'])assert.match(combined(id),/requester|requested/i);
 for(const id of ['music_clear','music_stop','music_leave','music_loop','music_autoplay','music_volume'])assert.match(combined(id),/Discord Administrator alone is not enough/);
 assert.match(combined('music_remove'),/own requested entries/);assert.match(combined('music_jump'),/current and bypassed entries/);assert.match(combined('music_shuffle'),/own every queued entry/);
 assert.match(combined('playlist_delete'),/already queued remain queued|already queued/);assert.match(combined('music_seek'),/1:30/);
});
test('community admin guidance uses mapped AJ authority and owner joke uses actual owner',()=>{
 for(const id of ['giveaway','superlatives','suggest','ama'])assert.match(combined(id),/mapped Chaise Lounge or Throne/);
 assert.match(combined('notmad'),/actual Discord server owner/);assert.match(combined('notmad'),/Administrator is not sufficient/);
});
test('learning facts preserve prefix commands, privacy, costs and safe practice boundaries',()=>{
 assert.equal(byId('race').example,'!race');assert.equal(byId('line').example,'!line');assert.match(combined('fight'),/without an acceptance step/);
 assert.match(combined('tldr_chat'),/does not summarize/);assert.match(combined('tldr_events'),/confirmed/);
 assert.match(combined('introduce'),/Blank answers are omitted/);assert.match(combined('introduce'),/same post/);
 assert.match(combined('tutorial'),/does not execute protected actions or spend Ottomans/);
 assert.match(combined('crime_bail'),/moderation Hotseat remains/);assert.match(combined('family_divorce'),/seven days/);
});
