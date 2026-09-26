-- Additive transport fencing. Existing sessions start disconnected; never infer live audio from old state.
ALTER TABLE "MusicSession"
 ADD COLUMN "revision" INTEGER NOT NULL DEFAULT 0,
 ADD COLUMN "generation" INTEGER NOT NULL DEFAULT 0,
 ADD COLUMN "desiredStatus" TEXT NOT NULL DEFAULT 'DISCONNECTED',
 ADD COLUMN "observedStatus" TEXT NOT NULL DEFAULT 'DISCONNECTED',
 ADD COLUMN "observedGeneration" INTEGER NOT NULL DEFAULT 0,
 ADD COLUMN "positionMs" INTEGER NOT NULL DEFAULT 0,
 ADD COLUMN "observedAt" TIMESTAMP(3),
 ADD COLUMN "lastError" TEXT,
 ADD COLUMN "history" JSONB NOT NULL DEFAULT '[]',
 ADD COLUMN "skipVotes" JSONB NOT NULL DEFAULT '{}',
 ADD COLUMN "queueMaxTracks" INTEGER NOT NULL DEFAULT 250,
 ADD CONSTRAINT "MusicSession_revision_nonnegative" CHECK ("revision" >= 0 AND "generation" >= 0 AND "observedGeneration" >= 0 AND "positionMs" >= 0);
ALTER TABLE "Playlist" ADD COLUMN "revision" INTEGER NOT NULL DEFAULT 0;
