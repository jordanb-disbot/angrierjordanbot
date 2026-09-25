-- Onboarding, self-role and rejoin persistence foundation.
BEGIN;

ALTER TABLE "JailSentence"
  ADD COLUMN "pausedAt" TIMESTAMPTZ,
  ADD COLUMN "pausedRemainingSeconds" INTEGER;

CREATE TABLE "MemberPresenceState" (
  "guildId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "needsRulesAck" BOOLEAN NOT NULL DEFAULT TRUE,
  "rulesAcknowledgedAt" TIMESTAMPTZ,
  "joinedAt" TIMESTAMPTZ,
  "leftAt" TIMESTAMPTZ,
  "nickname" TEXT,
  "pendingRoleRestore" BOOLEAN NOT NULL DEFAULT FALSE,
  "roleSnapshotCapturedAt" TIMESTAMPTZ,
  PRIMARY KEY ("guildId", "userId"),
  FOREIGN KEY ("guildId", "userId") REFERENCES "Member" ("guildId", "userId") ON DELETE CASCADE
);
CREATE INDEX "MemberPresenceState_guildId_needsRulesAck_idx" ON "MemberPresenceState" ("guildId", "needsRulesAck");

CREATE TABLE "SelfRoleSelection" (
  "guildId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "roleId" TEXT NOT NULL,
  "categoryKey" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT TRUE,
  "selectedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "archivedAt" TIMESTAMPTZ,
  PRIMARY KEY ("guildId", "userId", "roleId"),
  FOREIGN KEY ("guildId", "userId") REFERENCES "Member" ("guildId", "userId") ON DELETE CASCADE
);
CREATE INDEX "SelfRoleSelection_guildId_userId_categoryKey_active_idx" ON "SelfRoleSelection" ("guildId", "userId", "categoryKey", "active");

CREATE TABLE "MemberRoleSnapshot" (
  "guildId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "roleId" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "expiresAt" TIMESTAMPTZ,
  "capturedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "metadata" JSONB,
  PRIMARY KEY ("guildId", "userId", "roleId"),
  FOREIGN KEY ("guildId", "userId") REFERENCES "Member" ("guildId", "userId") ON DELETE CASCADE
);
CREATE INDEX "MemberRoleSnapshot_guildId_userId_kind_idx" ON "MemberRoleSnapshot" ("guildId", "userId", "kind");

COMMIT;
