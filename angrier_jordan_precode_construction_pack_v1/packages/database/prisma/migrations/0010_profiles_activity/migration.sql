BEGIN;
CREATE TABLE "ProfileState" ("guildId" TEXT NOT NULL,"userId" TEXT NOT NULL,"roastEnabled" BOOLEAN NOT NULL DEFAULT true,"featuredAchievements" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],"featuredItems" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],"tripleThreatAt" TIMESTAMP(3),"updatedAt" TIMESTAMP(3) NOT NULL,PRIMARY KEY("guildId","userId"));
CREATE TABLE "ActivityObservation" ("id" TEXT PRIMARY KEY,"guildId" TEXT NOT NULL,"userId" TEXT NOT NULL,"kind" TEXT NOT NULL,"occurredAt" TIMESTAMP(3) NOT NULL,"hourMt" INTEGER NOT NULL);
CREATE INDEX "ActivityObservation_guildId_occurredAt_hourMt_idx" ON "ActivityObservation"("guildId","occurredAt","hourMt");
CREATE TABLE "VoicePresence" ("guildId" TEXT NOT NULL,"userId" TEXT NOT NULL,"channelId" TEXT NOT NULL,"qualified" BOOLEAN NOT NULL,"observedAt" TIMESTAMP(3) NOT NULL,PRIMARY KEY("guildId","userId"));
CREATE TABLE "SpotlightFreeze" ("guildId" TEXT NOT NULL,"weekKey" TEXT NOT NULL,"frozenAt" TIMESTAMP(3) NOT NULL,"snapshot" JSONB NOT NULL,"announceAt" TIMESTAMP(3) NOT NULL,"messageId" TEXT,"deliveryState" TEXT NOT NULL DEFAULT 'PENDING',PRIMARY KEY("guildId","weekKey"));
INSERT INTO "Achievement" ("id","name","class","criteria","enabled") VALUES ('spotlight.triple_threat','Triple Threat','Legacy','{"spotlightAllThree":true}'::jsonb,true) ON CONFLICT("id") DO NOTHING;
COMMIT;
