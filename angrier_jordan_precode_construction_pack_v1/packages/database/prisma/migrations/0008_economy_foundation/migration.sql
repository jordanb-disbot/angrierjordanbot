-- Phase 4 economy foundation: idempotent ledger headers, one-time starter state,
-- stack-safe inventory, grind statistics/events, and technical anti-spam throttles.
BEGIN;

ALTER TABLE "EconomyAccount" ADD COLUMN "starterGrantedAt" TIMESTAMPTZ;

CREATE TABLE "EconomyTransaction" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "guildId" TEXT NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "EconomyTransaction_idempotencyKey_key" ON "EconomyTransaction" ("idempotencyKey");
CREATE INDEX "EconomyTransaction_guildId_createdAt_idx" ON "EconomyTransaction" ("guildId", "createdAt");

-- The pre-code schema allowed multiple rows for the same stack. No live deployment
-- exists yet; normalize the invariant now so all item grants are atomic upserts.
CREATE UNIQUE INDEX "InventoryEntry_guildId_userId_itemId_key" ON "InventoryEntry" ("guildId", "userId", "itemId");

CREATE TABLE "EconomyActivityStat" (
  "guildId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "activity" TEXT NOT NULL,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "wins" INTEGER NOT NULL DEFAULT 0,
  "zeroes" INTEGER NOT NULL DEFAULT 0,
  "losses" INTEGER NOT NULL DEFAULT 0,
  "fines" INTEGER NOT NULL DEFAULT 0,
  "itemsFound" INTEGER NOT NULL DEFAULT 0,
  "ottomansEarned" BIGINT NOT NULL DEFAULT 0,
  "ottomansLost" BIGINT NOT NULL DEFAULT 0,
  "lastAttemptAt" TIMESTAMPTZ,
  "updatedAt" TIMESTAMPTZ NOT NULL,
  PRIMARY KEY ("guildId", "userId", "activity")
);
CREATE INDEX "EconomyActivityStat_guildId_activity_attempts_idx" ON "EconomyActivityStat" ("guildId", "activity", "attempts");

CREATE TABLE "EconomyActivityEvent" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "guildId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "activity" TEXT NOT NULL,
  "outcome" TEXT NOT NULL,
  "ottomansDelta" BIGINT NOT NULL DEFAULT 0,
  "itemGrants" JSONB NOT NULL,
  "toolDamage" INTEGER NOT NULL DEFAULT 0,
  "idempotencyKey" TEXT NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "EconomyActivityEvent_idempotencyKey_key" ON "EconomyActivityEvent" ("idempotencyKey");
CREATE INDEX "EconomyActivityEvent_guildId_userId_activity_createdAt_idx" ON "EconomyActivityEvent" ("guildId", "userId", "activity", "createdAt");

CREATE TABLE "EconomyActionThrottle" (
  "guildId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "nextAllowedAt" TIMESTAMPTZ NOT NULL,
  "updatedAt" TIMESTAMPTZ NOT NULL,
  PRIMARY KEY ("guildId", "userId", "action")
);
CREATE INDEX "EconomyActionThrottle_nextAllowedAt_idx" ON "EconomyActionThrottle" ("nextAllowedAt");

-- Minimal core catalog required for Daily Spin and early grind item drops. These are
-- ordinary catalog rows and remain fully replaceable/tunable by later shop content.
INSERT INTO "CatalogItem" ("id","type","name","rarity","buyPrice","sellValue","giftable","enabled","metadata") VALUES
  ('junk.bent_screw','junk','Bent Chair Screw','Common',NULL,10,TRUE,TRUE,'{"stackable":true}'::jsonb),
  ('junk.cushion_lint','junk','Suspicious Cushion Lint','Common',NULL,15,TRUE,TRUE,'{"stackable":true}'::jsonb),
  ('sellable.brass_caster','sellable','Old Brass Caster','Uncommon',NULL,45,TRUE,TRUE,'{"stackable":true}'::jsonb),
  ('sellable.vintage_tag','sellable','Vintage Upholstery Tag','Rare',NULL,125,TRUE,TRUE,'{"stackable":true}'::jsonb),
  ('collectible.lounge_token','collectible','Lounge Token','Rare',NULL,250,TRUE,TRUE,'{"stackable":true,"collection":"lounge_misc"}'::jsonb),
  ('box.mystery_basic','mystery_box','Basic Mystery Box','Rare',1000,250,TRUE,TRUE,'{"boxType":"basic"}'::jsonb),
  ('sellable.rusty_hook','sellable','Rusty Chair Hook','Common',NULL,25,TRUE,TRUE,'{"stackable":true}'::jsonb),
  ('sellable.buried_coaster','sellable','Buried Lounge Coaster','Uncommon',NULL,55,TRUE,TRUE,'{"stackable":true}'::jsonb),
  ('junk.loose_spring','junk','Loose Recliner Spring','Common',NULL,20,TRUE,TRUE,'{"stackable":true}'::jsonb)
ON CONFLICT ("id") DO NOTHING;

COMMIT;
