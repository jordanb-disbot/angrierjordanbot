-- Generated pre-code baseline. Prisma remains authoritative.
BEGIN;
CREATE TYPE "SessionState" AS ENUM ('DRAFT', 'OPEN', 'LOCKED', 'SETTLING', 'CLOSED', 'CANCELLED');

CREATE TYPE "EscrowState" AS ENUM ('RESERVED', 'SETTLED', 'REFUNDED', 'FORFEITED');

CREATE TYPE "CaseStatus" AS ENUM ('OPEN', 'ACTIVE', 'EXPIRED', 'REVERSED', 'APPEALED', 'UPHELD', 'MODIFIED');

CREATE TYPE "RelationStatus" AS ENUM ('PENDING', 'ACTIVE', 'ENDED');

CREATE TYPE "JailType" AS ENUM ('CRIME', 'MODERATION');

CREATE TABLE "Guild" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "ConfigValue" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "guildId" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "value" JSONB NOT NULL,
  "source" TEXT NOT NULL DEFAULT 'default',
  "version" INTEGER NOT NULL DEFAULT 1,
  "updatedBy" TEXT,
  "updatedAt" TIMESTAMPTZ NOT NULL,
  FOREIGN KEY ("guildId") REFERENCES "Guild" ("id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX "ConfigValue_guildId_key_key" ON "ConfigValue" ("guildId", "key");

CREATE INDEX "ConfigValue_idx_1" ON "ConfigValue" ("guildId", "key");

CREATE TABLE "Member" (
  "guildId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "alias" TEXT,
  "dmsEnabled" BOOLEAN NOT NULL DEFAULT TRUE,
  "activityVisible" BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL,
  PRIMARY KEY ("guildId", "userId")
);

CREATE TABLE "EconomyAccount" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "guildId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "wallet" BIGINT NOT NULL DEFAULT 0,
  "bank" BIGINT NOT NULL DEFAULT 0,
  "bankTier" INTEGER NOT NULL DEFAULT 1,
  "version" INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY ("guildId", "userId") REFERENCES "Member" ("guildId", "userId") ON DELETE CASCADE
);

CREATE UNIQUE INDEX "EconomyAccount_guildId_userId_key" ON "EconomyAccount" ("guildId", "userId");

CREATE TABLE "LedgerEntry" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "guildId" TEXT NOT NULL,
  "transactionId" TEXT NOT NULL,
  "userId" TEXT,
  "bucket" TEXT NOT NULL,
  "amount" BIGINT NOT NULL,
  "reason" TEXT NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "LedgerEntry_idx_1" ON "LedgerEntry" ("guildId", "userId", "createdAt");

CREATE INDEX "LedgerEntry_idx_2" ON "LedgerEntry" ("transactionId");

CREATE TABLE "Escrow" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "guildId" TEXT NOT NULL,
  "ownerUserId" TEXT,
  "kind" TEXT NOT NULL,
  "amount" BIGINT,
  "itemRef" TEXT,
  "state" "EscrowState" NOT NULL DEFAULT 'RESERVED',
  "referenceType" TEXT NOT NULL,
  "referenceId" TEXT NOT NULL,
  "idempotencyKey" TEXT NOT NULL UNIQUE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "settledAt" TIMESTAMPTZ
);

CREATE INDEX "Escrow_idx_1" ON "Escrow" ("guildId", "referenceType", "referenceId");

CREATE TABLE "CatalogItem" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "type" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "rarity" TEXT NOT NULL,
  "buyPrice" BIGINT,
  "sellValue" BIGINT,
  "giftable" BOOLEAN NOT NULL DEFAULT TRUE,
  "enabled" BOOLEAN NOT NULL DEFAULT TRUE,
  "metadata" JSONB
);

CREATE TABLE "InventoryEntry" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "guildId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "itemId" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "locked" BOOLEAN NOT NULL DEFAULT FALSE,
  "metadata" JSONB,
  FOREIGN KEY ("guildId", "userId") REFERENCES "Member" ("guildId", "userId") ON DELETE CASCADE
);

CREATE INDEX "InventoryEntry_idx_1" ON "InventoryEntry" ("guildId", "userId", "itemId");

CREATE TABLE "Recipe" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "outputItemId" TEXT NOT NULL,
  "rankRequirement" TEXT,
  "inputs" JSONB NOT NULL,
  "successConfig" JSONB NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE "OwnedRecipe" (
  "guildId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "recipeId" TEXT NOT NULL,
  "learnedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("guildId", "userId", "recipeId")
);

CREATE TABLE "ToolInstance" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "guildId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "catalogItemId" TEXT NOT NULL,
  "slot" TEXT NOT NULL,
  "durability" INTEGER NOT NULL,
  "maxDurability" INTEGER NOT NULL,
  "equipped" BOOLEAN NOT NULL DEFAULT FALSE,
  "metadata" JSONB
);

CREATE INDEX "ToolInstance_idx_1" ON "ToolInstance" ("guildId", "userId", "slot");

CREATE TABLE "CraftedChair" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "guildId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "chairType" TEXT NOT NULL,
  "quality" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "metadata" JSONB
);

CREATE INDEX "CraftedChair_idx_1" ON "CraftedChair" ("guildId", "userId", "chairType");

CREATE TABLE "ContentEntry" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "game" TEXT NOT NULL,
  "category" TEXT,
  "intensity" INTEGER,
  "payload" JSONB NOT NULL,
  "tags" TEXT[] NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT TRUE,
  "contentVersion" INTEGER NOT NULL DEFAULT 1,
  "useCount" INTEGER NOT NULL DEFAULT 0,
  "lastUsedAt" TIMESTAMPTZ
);

CREATE INDEX "ContentEntry_idx_1" ON "ContentEntry" ("game", "category", "enabled");

CREATE TABLE "GameSession" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "guildId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "channelId" TEXT NOT NULL,
  "messageId" TEXT,
  "ownerUserId" TEXT,
  "state" "SessionState" NOT NULL DEFAULT 'DRAFT',
  "data" JSONB NOT NULL,
  "expiresAt" TIMESTAMPTZ,
  "extensionUsed" BOOLEAN NOT NULL DEFAULT FALSE,
  "version" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL,
  FOREIGN KEY ("guildId") REFERENCES "Guild" ("id") ON DELETE CASCADE
);

CREATE INDEX "GameSession_idx_1" ON "GameSession" ("guildId", "type", "state");

CREATE INDEX "GameSession_idx_2" ON "GameSession" ("expiresAt", "state");

CREATE TABLE "GameParticipant" (
  "sessionId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "role" TEXT,
  "data" JSONB,
  "joinedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("sessionId", "userId"),
  FOREIGN KEY ("sessionId") REFERENCES "GameSession" ("id") ON DELETE CASCADE
);

CREATE TABLE "Vote" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "sessionId" TEXT NOT NULL,
  "voterUserId" TEXT NOT NULL,
  "questionKey" TEXT NOT NULL DEFAULT 'main',
  "choiceKey" TEXT NOT NULL,
  "anonymous" BOOLEAN NOT NULL DEFAULT TRUE,
  "updatedAt" TIMESTAMPTZ NOT NULL,
  FOREIGN KEY ("sessionId") REFERENCES "GameSession" ("id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX "Vote_sessionId_voterUserId_questionKey_key" ON "Vote" ("sessionId", "voterUserId", "questionKey");

CREATE TABLE "Wager" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "sessionId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "selectionKey" TEXT NOT NULL,
  "amount" BIGINT NOT NULL,
  "escrowId" TEXT NOT NULL UNIQUE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("sessionId") REFERENCES "GameSession" ("id") ON DELETE CASCADE
);

CREATE INDEX "Wager_idx_1" ON "Wager" ("sessionId", "userId");

CREATE TABLE "Achievement" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "class" TEXT NOT NULL,
  "criteria" JSONB NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE "MemberAchievement" (
  "guildId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "achievementId" TEXT NOT NULL,
  "earnedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "metadata" JSONB,
  PRIMARY KEY ("guildId", "userId", "achievementId"),
  FOREIGN KEY ("guildId", "userId") REFERENCES "Member" ("guildId", "userId") ON DELETE CASCADE
);

CREATE TABLE "ActivityDaily" (
  "guildId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "date" DATE NOT NULL,
  "messages" INTEGER NOT NULL DEFAULT 0,
  "words" INTEGER NOT NULL DEFAULT 0,
  "vcSeconds" INTEGER NOT NULL DEFAULT 0,
  "wordCounts" JSONB,
  "commandCounts" JSONB,
  PRIMARY KEY ("guildId", "userId", "date")
);

CREATE INDEX "ActivityDaily_idx_1" ON "ActivityDaily" ("guildId", "date");

CREATE TABLE "WeeklySpotlight" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "guildId" TEXT NOT NULL,
  "weekStart" TIMESTAMPTZ NOT NULL,
  "category" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "winningValue" BIGINT NOT NULL,
  "lifetimeWins" INTEGER NOT NULL,
  "statusLabel" TEXT NOT NULL,
  "postedMessageId" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX "WeeklySpotlight_guildId_weekStart_category_userId_key" ON "WeeklySpotlight" ("guildId", "weekStart", "category", "userId");

CREATE TABLE "ModerationCase" (
  "id" SERIAL PRIMARY KEY,
  "guildId" TEXT NOT NULL,
  "subjectUserId" TEXT,
  "actionType" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "category" TEXT,
  "actorUserId" TEXT,
  "actorType" TEXT NOT NULL DEFAULT 'STAFF',
  "sourceChannelId" TEXT,
  "sourceMessageId" TEXT,
  "policyId" TEXT,
  "durationSeconds" INTEGER,
  "status" "CaseStatus" NOT NULL DEFAULT 'OPEN',
  "metadata" JSONB,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL,
  FOREIGN KEY ("guildId") REFERENCES "Guild" ("id") ON DELETE CASCADE
);

CREATE INDEX "ModerationCase_idx_1" ON "ModerationCase" ("guildId", "subjectUserId", "createdAt");

CREATE TABLE "ModerationEvidence" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "caseId" INTEGER NOT NULL,
  "contentCiphertext" TEXT,
  "context" JSONB,
  "expiresAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("caseId") REFERENCES "ModerationCase" ("id") ON DELETE CASCADE
);

CREATE INDEX "ModerationEvidence_idx_1" ON "ModerationEvidence" ("expiresAt");

CREATE TABLE "Appeal" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "caseId" INTEGER NOT NULL,
  "requesterUserId" TEXT NOT NULL,
  "reviewerUserId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "text" TEXT,
  "outcomeReason" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolvedAt" TIMESTAMPTZ,
  FOREIGN KEY ("caseId") REFERENCES "ModerationCase" ("id") ON DELETE CASCADE
);

CREATE TABLE "ModNote" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "guildId" TEXT NOT NULL,
  "subjectUserId" TEXT NOT NULL,
  "authorUserId" TEXT NOT NULL,
  "text" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "ModNote_idx_1" ON "ModNote" ("guildId", "subjectUserId", "createdAt");

CREATE TABLE "BehaviorEvent" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "guildId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "weight" INTEGER NOT NULL,
  "expiresAt" TIMESTAMPTZ,
  "sourceCaseId" INTEGER,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "BehaviorEvent_idx_1" ON "BehaviorEvent" ("guildId", "userId", "expiresAt");

CREATE TABLE "JailSentence" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "guildId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "type" "JailType" NOT NULL,
  "caseId" INTEGER,
  "reason" TEXT NOT NULL,
  "startedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "endsAt" TIMESTAMPTZ NOT NULL,
  "endedAt" TIMESTAMPTZ,
  "active" BOOLEAN NOT NULL DEFAULT TRUE,
  "restoration" JSONB
);

CREATE INDEX "JailSentence_idx_1" ON "JailSentence" ("guildId", "userId", "active");

CREATE INDEX "JailSentence_idx_2" ON "JailSentence" ("endsAt", "active");

CREATE TABLE "VerificationState" (
  "guildId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "reason" TEXT,
  "updatedAt" TIMESTAMPTZ NOT NULL,
  PRIMARY KEY ("guildId", "userId")
);

CREATE TABLE "IntroductionForm" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "guildId" TEXT NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "title" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE INDEX "IntroductionForm_idx_1" ON "IntroductionForm" ("guildId", "enabled");

CREATE TABLE "IntroductionPrompt" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "formId" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL,
  "label" TEXT NOT NULL,
  "cardLabel" TEXT NOT NULL,
  "placeholder" TEXT,
  "required" BOOLEAN NOT NULL DEFAULT FALSE,
  "maxLength" INTEGER NOT NULL DEFAULT 500,
  "enabled" BOOLEAN NOT NULL DEFAULT TRUE,
  FOREIGN KEY ("formId") REFERENCES "IntroductionForm" ("id") ON DELETE CASCADE
);

CREATE INDEX "IntroductionPrompt_idx_1" ON "IntroductionPrompt" ("formId", "sortOrder");

CREATE TABLE "IntroductionSubmission" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "guildId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "formVersion" INTEGER NOT NULL,
  "answers" JSONB NOT NULL,
  "outputMessageId" TEXT,
  "updatedAt" TIMESTAMPTZ NOT NULL
);

CREATE UNIQUE INDEX "IntroductionSubmission_guildId_userId_key" ON "IntroductionSubmission" ("guildId", "userId");

CREATE TABLE "CustomCommand" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "guildId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT FALSE,
  "triggerType" TEXT NOT NULL,
  "triggerValue" TEXT NOT NULL,
  "caseSensitive" BOOLEAN NOT NULL DEFAULT FALSE,
  "conditions" JSONB NOT NULL,
  "actions" JSONB NOT NULL,
  "cooldowns" JSONB NOT NULL,
  "createdBy" TEXT NOT NULL,
  "updatedBy" TEXT NOT NULL,
  "usageCount" INTEGER NOT NULL DEFAULT 0,
  "lastUsedAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL
);

CREATE UNIQUE INDEX "CustomCommand_guildId_triggerType_triggerValue_key" ON "CustomCommand" ("guildId", "triggerType", "triggerValue");

CREATE TABLE "Marriage" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "guildId" TEXT NOT NULL,
  "userA" TEXT NOT NULL,
  "userB" TEXT NOT NULL,
  "status" "RelationStatus" NOT NULL DEFAULT 'PENDING',
  "proposedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "startedAt" TIMESTAMPTZ,
  "endedAt" TIMESTAMPTZ,
  "metadata" JSONB
);

CREATE INDEX "Marriage_idx_1" ON "Marriage" ("guildId", "userA", "status");

CREATE INDEX "Marriage_idx_2" ON "Marriage" ("guildId", "userB", "status");

CREATE TABLE "Adoption" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "guildId" TEXT NOT NULL,
  "parentPairKey" TEXT NOT NULL,
  "childUserId" TEXT NOT NULL,
  "status" "RelationStatus" NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "endedAt" TIMESTAMPTZ
);

CREATE INDEX "Adoption_idx_1" ON "Adoption" ("guildId", "childUserId", "status");

CREATE TABLE "FamilyAuction" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "guildId" TEXT NOT NULL,
  "sellerUserId" TEXT NOT NULL,
  "auctionType" TEXT NOT NULL,
  "reserveAmount" BIGINT,
  "status" TEXT NOT NULL,
  "endsAt" TIMESTAMPTZ NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "FamilyAuction_idx_1" ON "FamilyAuction" ("guildId", "status", "endsAt");

CREATE TABLE "FamilyAuctionBid" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "auctionId" TEXT NOT NULL,
  "bidderUserId" TEXT NOT NULL,
  "amount" BIGINT NOT NULL,
  "escrowId" TEXT NOT NULL UNIQUE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("auctionId") REFERENCES "FamilyAuction" ("id") ON DELETE CASCADE
);

CREATE INDEX "FamilyAuctionBid_idx_1" ON "FamilyAuctionBid" ("auctionId", "amount");

CREATE TABLE "Will" (
  "guildId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "beneficiaryUserId" TEXT NOT NULL,
  "updatedAt" TIMESTAMPTZ NOT NULL,
  PRIMARY KEY ("guildId", "userId")
);

CREATE TABLE "Chairism" (
  "id" SERIAL PRIMARY KEY,
  "guildId" TEXT NOT NULL,
  "sourceUserId" TEXT NOT NULL,
  "createdByUserId" TEXT NOT NULL,
  "sourceMessageId" TEXT,
  "sourceChannelId" TEXT,
  "outputMessageId" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "Chairism_idx_1" ON "Chairism" ("guildId", "sourceUserId", "createdAt");

CREATE TABLE "Playlist" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "guildId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX "Playlist_guildId_userId_name_key" ON "Playlist" ("guildId", "userId", "name");

CREATE TABLE "PlaylistTrack" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "playlistId" TEXT NOT NULL,
  "position" INTEGER NOT NULL,
  "provider" TEXT NOT NULL,
  "reference" TEXT NOT NULL,
  "metadata" JSONB NOT NULL,
  FOREIGN KEY ("playlistId") REFERENCES "Playlist" ("id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX "PlaylistTrack_playlistId_position_key" ON "PlaylistTrack" ("playlistId", "position");

CREATE TABLE "TutorialProgress" (
  "guildId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "lessonId" TEXT NOT NULL,
  "completedAt" TIMESTAMPTZ,
  "dismissed" BOOLEAN NOT NULL DEFAULT FALSE,
  PRIMARY KEY ("guildId", "userId", "lessonId"),
  FOREIGN KEY ("guildId", "userId") REFERENCES "Member" ("guildId", "userId") ON DELETE CASCADE
);

CREATE TABLE "ScheduledJob" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "guildId" TEXT NOT NULL,
  "jobType" TEXT NOT NULL,
  "executionKey" TEXT NOT NULL UNIQUE,
  "dueAt" TIMESTAMPTZ NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "payload" JSONB,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "lastError" TEXT,
  "completedAt" TIMESTAMPTZ
);

CREATE INDEX "ScheduledJob_idx_1" ON "ScheduledJob" ("status", "dueAt");

CREATE TABLE "AuditEvent" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "guildId" TEXT NOT NULL,
  "actorUserId" TEXT,
  "source" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "targetType" TEXT,
  "targetId" TEXT,
  "before" JSONB,
  "after" JSONB,
  "reason" TEXT,
  "requestId" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("guildId") REFERENCES "Guild" ("id") ON DELETE CASCADE
);

CREATE INDEX "AuditEvent_idx_1" ON "AuditEvent" ("guildId", "createdAt");

CREATE INDEX "AuditEvent_idx_2" ON "AuditEvent" ("requestId");

CREATE TABLE "ConfigRevision" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "guildId" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "value" JSONB NOT NULL,
  "source" TEXT NOT NULL,
  "actorUserId" TEXT,
  "rollbackSafe" BOOLEAN NOT NULL DEFAULT FALSE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX "ConfigRevision_guildId_key_version_key" ON "ConfigRevision" ("guildId", "key", "version");

CREATE INDEX "ConfigRevision_idx_1" ON "ConfigRevision" ("guildId", "key", "createdAt");

CREATE TABLE "MemberClaimState" (
  "guildId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "dailyLastClaimAt" TIMESTAMPTZ,
  "dailyStreak" INTEGER NOT NULL DEFAULT 0,
  "weeklyLastClaimAt" TIMESTAMPTZ,
  "dailySpinLastAt" TIMESTAMPTZ,
  "fortuneLastAt" TIMESTAMPTZ,
  "updatedAt" TIMESTAMPTZ NOT NULL,
  PRIMARY KEY ("guildId", "userId")
);

CREATE TABLE "MemberGameStats" (
  "guildId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "gameKey" TEXT NOT NULL,
  "wins" INTEGER NOT NULL DEFAULT 0,
  "losses" INTEGER NOT NULL DEFAULT 0,
  "draws" INTEGER NOT NULL DEFAULT 0,
  "plays" INTEGER NOT NULL DEFAULT 0,
  "metadata" JSONB,
  "updatedAt" TIMESTAMPTZ NOT NULL,
  PRIMARY KEY ("guildId", "userId", "gameKey")
);

CREATE TABLE "MemberCrimeState" (
  "guildId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "wantedLevel" TEXT NOT NULL DEFAULT 'CLEAN',
  "heatScore" INTEGER NOT NULL DEFAULT 0,
  "robberCooldownUntil" TIMESTAMPTZ,
  "victimProtectionUntil" TIMESTAMPTZ,
  "successfulRobs" INTEGER NOT NULL DEFAULT 0,
  "failedRobs" INTEGER NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMPTZ NOT NULL,
  PRIMARY KEY ("guildId", "userId")
);

CREATE TABLE "CraftingProgress" (
  "guildId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "rank" TEXT NOT NULL DEFAULT 'APPRENTICE',
  "skillPoints" INTEGER NOT NULL DEFAULT 0,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "successes" INTEGER NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMPTZ NOT NULL,
  PRIMARY KEY ("guildId", "userId")
);

CREATE TABLE "PityCounter" (
  "guildId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "poolKey" TEXT NOT NULL,
  "count" INTEGER NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMPTZ NOT NULL,
  PRIMARY KEY ("guildId", "userId", "poolKey")
);

CREATE TABLE "ShopRotation" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "guildId" TEXT NOT NULL,
  "rotationDate" DATE NOT NULL,
  "itemIds" TEXT[] NOT NULL,
  "personalized" JSONB,
  "generatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX "ShopRotation_guildId_rotationDate_key" ON "ShopRotation" ("guildId", "rotationDate");

CREATE TABLE "CasinoPool" (
  "guildId" TEXT NOT NULL,
  "poolKey" TEXT NOT NULL,
  "amount" BIGINT NOT NULL DEFAULT 0,
  "version" INTEGER NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMPTZ NOT NULL,
  PRIMARY KEY ("guildId", "poolKey")
);

CREATE TABLE "LotteryRound" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "guildId" TEXT NOT NULL,
  "weekKey" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "pot" BIGINT NOT NULL DEFAULT 0,
  "winnerUserId" TEXT,
  "drawAt" TIMESTAMPTZ NOT NULL,
  "drawnAt" TIMESTAMPTZ,
  "messageId" TEXT
);

CREATE UNIQUE INDEX "LotteryRound_guildId_weekKey_key" ON "LotteryRound" ("guildId", "weekKey");

CREATE TABLE "LotteryTicket" (
  "roundId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "count" INTEGER NOT NULL DEFAULT 0,
  "paid" BIGINT NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMPTZ NOT NULL,
  PRIMARY KEY ("roundId", "userId")
);

CREATE TABLE "Giveaway" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "guildId" TEXT NOT NULL,
  "creatorUserId" TEXT NOT NULL,
  "prize" TEXT NOT NULL,
  "winnerCount" INTEGER NOT NULL,
  "entryCost" BIGINT NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "endsAt" TIMESTAMPTZ NOT NULL,
  "outputMessageId" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "Giveaway_idx_1" ON "Giveaway" ("guildId", "status", "endsAt");

CREATE TABLE "GiveawayEntry" (
  "giveawayId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "escrowId" TEXT,
  "enteredAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("giveawayId", "userId")
);

CREATE TABLE "ChannelGameState" (
  "guildId" TEXT NOT NULL,
  "channelId" TEXT NOT NULL,
  "gameKey" TEXT NOT NULL,
  "state" JSONB NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMPTZ NOT NULL,
  PRIMARY KEY ("guildId", "channelId", "gameKey")
);

CREATE TABLE "RecordValue" (
  "guildId" TEXT NOT NULL,
  "recordKey" TEXT NOT NULL,
  "scopeKey" TEXT NOT NULL DEFAULT 'alltime',
  "userId" TEXT,
  "value" JSONB NOT NULL,
  "achievedAt" TIMESTAMPTZ NOT NULL,
  "updatedAt" TIMESTAMPTZ NOT NULL,
  PRIMARY KEY ("guildId", "recordKey", "scopeKey")
);

CREATE TABLE "SuperlativeSeason" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "guildId" TEXT NOT NULL,
  "seasonNumber" INTEGER NOT NULL,
  "status" TEXT NOT NULL,
  "config" JSONB NOT NULL,
  "nominationEndsAt" TIMESTAMPTZ,
  "votingEndsAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX "SuperlativeSeason_guildId_seasonNumber_key" ON "SuperlativeSeason" ("guildId", "seasonNumber");

CREATE TABLE "SuperlativeEntry" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "seasonId" TEXT NOT NULL,
  "categoryKey" TEXT NOT NULL,
  "nomineeUserId" TEXT NOT NULL,
  "nominatorUserId" TEXT,
  "voteCount" INTEGER NOT NULL DEFAULT 0,
  "finalist" BOOLEAN NOT NULL DEFAULT FALSE,
  "winner" BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX "SuperlativeEntry_idx_1" ON "SuperlativeEntry" ("seasonId", "categoryKey");

CREATE TABLE "Suggestion" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "guildId" TEXT NOT NULL,
  "submitterUserId" TEXT NOT NULL,
  "anonymous" BOOLEAN NOT NULL DEFAULT FALSE,
  "text" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "outputMessageId" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL
);

CREATE INDEX "Suggestion_idx_1" ON "Suggestion" ("guildId", "status", "createdAt");

CREATE TABLE "AmaQuestion" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "guildId" TEXT NOT NULL,
  "submitterUserId" TEXT NOT NULL,
  "anonymous" BOOLEAN NOT NULL DEFAULT FALSE,
  "question" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "answer" TEXT,
  "answeredByUserId" TEXT,
  "upvotes" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "answeredAt" TIMESTAMPTZ
);

CREATE INDEX "AmaQuestion_idx_1" ON "AmaQuestion" ("guildId", "status", "createdAt");

CREATE TABLE "SelfRolePanel" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "guildId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "channelId" TEXT,
  "messageId" TEXT,
  "config" JSONB NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL
);

CREATE UNIQUE INDEX "SelfRolePanel_guildId_name_key" ON "SelfRolePanel" ("guildId", "name");

CREATE TABLE "MusicSession" (
  "guildId" TEXT NOT NULL PRIMARY KEY,
  "voiceChannelId" TEXT NOT NULL,
  "textChannelId" TEXT NOT NULL,
  "controllerMessageId" TEXT,
  "state" TEXT NOT NULL,
  "currentTrack" JSONB,
  "queue" JSONB NOT NULL,
  "volume" INTEGER NOT NULL DEFAULT 100,
  "loopMode" TEXT NOT NULL DEFAULT 'OFF',
  "autoplay" BOOLEAN NOT NULL DEFAULT FALSE,
  "updatedAt" TIMESTAMPTZ NOT NULL
);

CREATE TABLE "MusicHistory" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "guildId" TEXT NOT NULL,
  "requesterUserId" TEXT,
  "provider" TEXT NOT NULL,
  "reference" TEXT NOT NULL,
  "metadata" JSONB NOT NULL,
  "playedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "MusicHistory_idx_1" ON "MusicHistory" ("guildId", "playedAt");

CREATE TABLE "DashboardSession" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "guildId" TEXT NOT NULL,
  "sessionHash" TEXT NOT NULL UNIQUE,
  "expiresAt" TIMESTAMPTZ NOT NULL,
  "revokedAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "DashboardSession_idx_1" ON "DashboardSession" ("userId", "guildId", "expiresAt");

CREATE TABLE "RoleAlias" (
  "guildId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "alias" TEXT NOT NULL,
  "setByUserId" TEXT NOT NULL,
  "updatedAt" TIMESTAMPTZ NOT NULL,
  PRIMARY KEY ("guildId", "userId")
);
COMMIT;
