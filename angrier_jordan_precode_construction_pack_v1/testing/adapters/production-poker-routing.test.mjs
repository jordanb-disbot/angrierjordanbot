import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../../apps/bot/src/production.ts',import.meta.url),'utf8');
test('production constructs Poker coordinator with durable channel config',()=>{assert.match(source,/new PrismaPokerRepository\(db\)/);assert.match(source,/new DiscordPokerCoordinator\(pokerRepo/);assert.match(source,/channels\.poker_channel/);});
test('production dispatches Poker lobby commands and components to the Poker coordinator',()=>{assert.match(source,/const POKER_COMMANDS=new Set\(\['holdem','omaha','join_game'\]\)/);assert.match(source,/POKER_COMMANDS\.has\(interaction\.commandName\)/);assert.match(source,/interaction\.customId\.startsWith\('poker:'\)/);assert.match(source,/await poker\.handle\(interaction\)/);assert.match(source,/CASINO_COMMANDS\.has\(interaction\.commandName\)/);});
test('Poker component path acknowledges before persistence and refunds cancellation',()=>{
  const coordinator=readFileSync(new URL('../../apps/bot/src/discord/poker-coordinator.ts',import.meta.url),'utf8');
  const repository=readFileSync(new URL('../../packages/features-casino/src/poker-repository.ts',import.meta.url),'utf8');
  assert.match(coordinator,/await i\.deferUpdate\(\)/);
  assert.match(coordinator,/await i\.editReply\(/);
  assert.match(repository,/new PrismaWagerEscrow\(tx,ledger\)\.refund\(/);
});

test('Poker has durable start, recovery, private views, action timeouts, and human-only settlement guards',()=>{
  const repository=readFileSync(new URL('../../packages/features-casino/src/poker-repository.ts',import.meta.url),'utf8');
  const coordinator=readFileSync(new URL('../../apps/bot/src/discord/poker-coordinator.ts',import.meta.url),'utf8');
  assert.match(repository,/startPokerHand\(started,randomUUID\(\),undefined,dueAt\)/);
  assert.match(repository,/async recover\(guildId:string\)/);
  assert.match(repository,/poker\.action_timeout/);
  assert.match(repository,/filter\(seat=>!seat\.bot\)/);
  assert.match(coordinator,/ephemeral:true/);
  assert.match(coordinator,/View Private Hand/);
  assert.doesNotMatch(coordinator,/JSON\.stringify\(.*activeHand/);
});
