ALTER TABLE "JailSentence" ADD COLUMN "indefinite" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "JailSentence" ADD COLUMN "releaseReason" TEXT;
ALTER TABLE "JailSentence" ADD COLUMN "releasedByUserId" TEXT;
