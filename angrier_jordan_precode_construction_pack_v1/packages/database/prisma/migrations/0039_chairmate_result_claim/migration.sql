ALTER TABLE "ChairmateChallenge" ADD COLUMN "resultPostClaimedAt" TIMESTAMP(3);
ALTER TABLE "ChairmateChallenge" ADD COLUMN "resultMessageId" TEXT;
CREATE INDEX "ChairmateChallenge_status_resultPostedAt_resultPostClaimedAt_idx" ON "ChairmateChallenge"("status", "resultPostedAt", "resultPostClaimedAt");
