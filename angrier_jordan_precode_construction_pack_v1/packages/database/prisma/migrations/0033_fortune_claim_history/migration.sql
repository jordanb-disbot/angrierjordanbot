-- Preserve each member's recent private Fortune reveals so the daily picker can
-- exclude the last fifty selections atomically with the claim receipt.
CREATE TABLE "FortuneClaim" (
  "id" TEXT NOT NULL,
  "guildId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "fortuneId" TEXT NOT NULL,
  "claimedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FortuneClaim_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "FortuneClaim_guildId_userId_claimedAt_idx"
  ON "FortuneClaim"("guildId", "userId", "claimedAt");
CREATE INDEX "FortuneClaim_guildId_userId_fortuneId_idx"
  ON "FortuneClaim"("guildId", "userId", "fortuneId");
