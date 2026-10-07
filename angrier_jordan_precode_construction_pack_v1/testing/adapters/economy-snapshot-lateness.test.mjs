import test from 'node:test';
import assert from 'node:assert/strict';
import {DomainError} from '../../dist/packages/core/src/index.js';
import {DiscordEconomyCoordinator,ECONOMY_SNAPSHOT_MAX_LATENESS_MS,economySnapshotIsLate} from '../../dist/apps/bot/src/discord/economy-coordinator.js';

const payload={guildId:'g',cycleKey:'2026-10-08'};

test('daily snapshot rejects a capture more than ten minutes late without writing a snapshot',async()=>{
  const dueAt=new Date('2026-10-08T10:00:00.000Z');
  let captures=0,nextSchedules=0;
  const coordinator=new DiscordEconomyCoordinator({captureEconomySnapshot:async()=>{captures++;},scheduleNextEconomySnapshot:async()=>{nextSchedules++;}},{},false,()=>new Date(dueAt.getTime()+ECONOMY_SNAPSHOT_MAX_LATENESS_MS+1));
  await assert.rejects(()=>coordinator.handleSnapshotJob(payload,dueAt),error=>error instanceof DomainError&&error.code==='ECONOMY_SNAPSHOT_LATE');
  assert.equal(captures,0);
  assert.equal(nextSchedules,1);
});

test('daily snapshot permits capture through the ten-minute tolerance and preserves its scheduled cycle',async()=>{
  const dueAt=new Date('2026-10-08T10:00:00.000Z');
  const calls=[];
  const coordinator=new DiscordEconomyCoordinator({captureEconomySnapshot:async(...args)=>{calls.push(args);},scheduleNextEconomySnapshot:async()=>{throw new Error('should not reschedule');}},{},false,()=>new Date(dueAt.getTime()+ECONOMY_SNAPSHOT_MAX_LATENESS_MS));
  assert.equal(economySnapshotIsLate(dueAt,new Date(dueAt.getTime()+ECONOMY_SNAPSHOT_MAX_LATENESS_MS)),false);
  await coordinator.handleSnapshotJob(payload,dueAt);
  assert.deepEqual(calls,[['g','2026-10-08']]);
});
