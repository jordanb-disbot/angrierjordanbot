import test from 'node:test';import assert from 'node:assert/strict';
import {renderActivityCard} from '../../dist/apps/bot/src/discord/activity-card.js';

test('staff activity cards use the wide approved shell and preserve long audit text',()=>{
 const body='Member <@fixture> · <#fixture> · Before\n'+('A detailed staff record. '.repeat(80)),svg=renderActivityCard('MESSAGE EDITED',body,'#F4C542');
 assert.match(svg,/width="1200"/);assert.match(svg,/STAFF ACTIVITY/);assert.match(svg,/MESSAGE EDITED/);assert.match(svg,/Space Grotesk/);assert.match(svg,/Inter/);assert.match(svg,/F4C542/);assert.match(svg,/A detailed staff record/);assert.doesNotMatch(svg,/<@fixture>|<#fixture>/);assert.match(svg,/Member · Channel/);
 const height=Number(/height="(\d+)"/.exec(svg)?.[1]??0);assert.ok(height>400);for(const node of svg.matchAll(/<text[^>]* y="(\d+)"/g))assert.ok(Number(node[1])<height-12);
});
