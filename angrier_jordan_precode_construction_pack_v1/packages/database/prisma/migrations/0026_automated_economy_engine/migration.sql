-- EAJ 1.1 automated economy engine.  These records are additive: existing
-- balances, ledger history, inventory and accepted wager settlements remain
-- authoritative and are never rewritten by this migration.
CREATE TABLE "EconomySnapshot" (
  "id" TEXT NOT NULL,
  "guildId" TEXT NOT NULL,
  "snapshotDate" DATE NOT NULL,
  "eligibleMemberCount" INTEGER NOT NULL,
  "rawMedianWealth" BIGINT NOT NULL,
  "smoothedMedianWealth" BIGINT,
  "totalSupply" BIGINT NOT NULL,
  "reconciliation" JSONB NOT NULL,
  "metrics" JSONB NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EconomySnapshot_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "EconomySnapshot_guildId_snapshotDate_key" UNIQUE ("guildId", "snapshotDate")
);
CREATE INDEX "EconomySnapshot_guildId_snapshotDate_idx" ON "EconomySnapshot"("guildId", "snapshotDate");

CREATE TABLE "EconomyPolicyVersion" (
  "id" TEXT NOT NULL,
  "guildId" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "mode" TEXT NOT NULL DEFAULT 'SHADOW',
  "policy" JSONB NOT NULL,
  "bounds" JSONB NOT NULL,
  "pausedAt" TIMESTAMPTZ,
  "pausedByUserId" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EconomyPolicyVersion_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "EconomyPolicyVersion_guildId_version_key" UNIQUE ("guildId", "version")
);
CREATE INDEX "EconomyPolicyVersion_guildId_createdAt_idx" ON "EconomyPolicyVersion"("guildId", "createdAt");

CREATE TABLE "EconomyAdjustment" (
  "id" TEXT NOT NULL,
  "guildId" TEXT NOT NULL,
  "snapshotId" TEXT,
  "policyVersionId" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "previousValue" TEXT NOT NULL,
  "proposedValue" TEXT NOT NULL,
  "appliedValue" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "supportingMetrics" JSONB NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PROPOSED',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EconomyAdjustment_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "EconomyAdjustment_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "EconomySnapshot"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "EconomyAdjustment_policyVersionId_fkey" FOREIGN KEY ("policyVersionId") REFERENCES "EconomyPolicyVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "EconomyAdjustment_guildId_createdAt_idx" ON "EconomyAdjustment"("guildId", "createdAt");

CREATE TABLE "EconomyActivityCounter" (
  "guildId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "cycleKey" TEXT NOT NULL,
  "chatPaidWindows" INTEGER NOT NULL DEFAULT 0,
  "chatPaidAmount" BIGINT NOT NULL DEFAULT 0,
  "voiceQualifiedSeconds" INTEGER NOT NULL DEFAULT 0,
  "voicePaidSeconds" INTEGER NOT NULL DEFAULT 0,
  "voicePaidAmount" BIGINT NOT NULL DEFAULT 0,
  "grindCashAmount" BIGINT NOT NULL DEFAULT 0,
  "dropSellAmount" BIGINT NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EconomyActivityCounter_pkey" PRIMARY KEY ("guildId", "userId", "cycleKey")
);
CREATE INDEX "EconomyActivityCounter_guildId_cycleKey_idx" ON "EconomyActivityCounter"("guildId", "cycleKey");

CREATE TABLE "StarterReceipt" (
  "guildId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "policyVersionId" TEXT,
  "amount" BIGINT NOT NULL,
  "toolGrants" JSONB NOT NULL DEFAULT '[]',
  "repairVoucherGranted" BOOLEAN NOT NULL DEFAULT false,
  "grantedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StarterReceipt_pkey" PRIMARY KEY ("guildId", "userId")
);

CREATE TABLE "StreakInstallment" (
  "id" TEXT NOT NULL,
  "guildId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "sourceTransactionId" TEXT,
  "totalAmount" BIGINT NOT NULL,
  "paidAmount" BIGINT NOT NULL DEFAULT 0,
  "nextDueAt" TIMESTAMPTZ NOT NULL,
  "state" TEXT NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StreakInstallment_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "StreakInstallment_state_nextDueAt_idx" ON "StreakInstallment"("state", "nextDueAt");

CREATE TABLE "BankInterestTerm" (
  "id" TEXT NOT NULL,
  "guildId" TEXT NOT NULL,
  "cycleKey" TEXT NOT NULL,
  "rateBps" INTEGER NOT NULL,
  "capAmount" BIGINT NOT NULL,
  "policyVersionId" TEXT,
  "lockedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BankInterestTerm_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "BankInterestTerm_guildId_cycleKey_key" UNIQUE ("guildId", "cycleKey")
);
