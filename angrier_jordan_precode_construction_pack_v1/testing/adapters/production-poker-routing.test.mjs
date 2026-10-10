import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source=readFileSync(new URL('../../apps/bot/src/production.ts',import.meta.url),'utf8');

test('production constructs Poker coordinator with durable channel config',()=>{
  assert.match(source,/new PrismaPokerRepository\(db\)/);
  assert.match(source,/new DiscordPokerCoordinator\(pokerRepo/);
  assert.match(source,/channels\.poker_channel/);
  assert.match(source,/channels\.poker_channel/);
});

test('production dispatches only Poker commands and components to Poker coordinator',()=>{
  assert.match(source,/const POKER_COMMANDS=new Set\(\['holdem','omaha'\]\)/);
  assert.match(source,/POKER_COMMANDS\.has\(interaction\.commandName\)/);
  assert.match(source,/interaction\.customId\.startsWith\('poker:'\)/);
  assert.match(source,/await poker\.handle\(interaction\)/);
  assert.match(source,/CASINO_COMMANDS\.has\(interaction\.commandName\)/);
});
