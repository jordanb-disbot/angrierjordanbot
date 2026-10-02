import test from 'node:test';
import assert from 'node:assert/strict';
import {fullyFurnishedCompletionAnnouncement} from '../../dist/apps/bot/src/discord/fully-furnished-announcement.js';

test('Fully Furnished completion announcement lists plain names without tags or pings',()=>{
 const message=fullyFurnishedCompletionAnnouncement('<@1432212068785721424> Jordan',['Jordan','@NotJordan','A\nMember']);
 assert.match(message.content,/Jordan has completed every launch-event goal/);
 assert.match(message.content,/1\. Jordan/);assert.match(message.content,/2\. NotJordan/);assert.match(message.content,/3\. A Member/);
 assert.doesNotMatch(message.content,/<@|@NotJordan/);assert.deepEqual(message.allowedMentions,{parse:[]});
});
