-- Golden WYR requires guild-scoped recent-content history so prompt exclusion is
-- deterministic per server instead of relying on global ContentEntry.lastUsedAt.
CREATE TABLE "ContentUseHistory" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "contentId" TEXT NOT NULL,
    "game" TEXT NOT NULL,
    "category" TEXT,
    "usedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ContentUseHistory_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ContentUseHistory_guildId_game_category_usedAt_idx" ON "ContentUseHistory"("guildId", "game", "category", "usedAt");
CREATE INDEX "ContentUseHistory_contentId_usedAt_idx" ON "ContentUseHistory"("contentId", "usedAt");
