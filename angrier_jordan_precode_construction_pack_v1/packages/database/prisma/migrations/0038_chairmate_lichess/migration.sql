CREATE TABLE "ChairmateChallenge" (
  "id" TEXT NOT NULL,
  "guildId" TEXT NOT NULL,
  "channelId" TEXT NOT NULL,
  "messageId" TEXT,
  "challengerUserId" TEXT NOT NULL,
  "opponentUserId" TEXT NOT NULL,
  "challengerName" TEXT NOT NULL,
  "opponentName" TEXT NOT NULL,
  "timeControl" TEXT NOT NULL,
  "clockLimit" INTEGER NOT NULL,
  "clockIncrement" INTEGER NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "challengerColor" TEXT,
  "opponentColor" TEXT,
  "whiteUrl" TEXT,
  "blackUrl" TEXT,
  "lichessChallengeId" TEXT,
  "lichessGameId" TEXT,
  "lichessGameUrl" TEXT,
  "result" TEXT,
  "winnerColor" TEXT,
  "resultPostedAt" TIMESTAMP(3),
  "createKey" TEXT NOT NULL,
  "acceptKey" TEXT,
  "lastProviderError" TEXT,
  "providerRetryAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ChairmateChallenge_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ChairmateChallenge_createKey_key" ON "ChairmateChallenge"("createKey");
CREATE INDEX "ChairmateChallenge_guildId_status_expiresAt_idx" ON "ChairmateChallenge"("guildId", "status", "expiresAt");
CREATE INDEX "ChairmateChallenge_status_providerRetryAt_idx" ON "ChairmateChallenge"("status", "providerRetryAt");
CREATE INDEX "ChairmateChallenge_challengerUserId_status_idx" ON "ChairmateChallenge"("challengerUserId", "status");
CREATE INDEX "ChairmateChallenge_opponentUserId_status_idx" ON "ChairmateChallenge"("opponentUserId", "status");
