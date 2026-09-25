CREATE TABLE "SecurityModeState" (
  "guildId" TEXT NOT NULL,
  "mode" TEXT NOT NULL DEFAULT 'NORMAL',
  "reason" TEXT,
  "source" TEXT NOT NULL DEFAULT 'default',
  "updatedBy" TEXT,
  "panicActive" BOOLEAN NOT NULL DEFAULT false,
  "snapshot" JSONB,
  "expiresAt" TIMESTAMP(3),
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SecurityModeState_pkey" PRIMARY KEY ("guildId")
);

CREATE TABLE "SecurityEvent" (
  "id" TEXT NOT NULL,
  "guildId" TEXT NOT NULL,
  "userId" TEXT,
  "actorUserId" TEXT,
  "kind" TEXT NOT NULL,
  "severity" INTEGER NOT NULL DEFAULT 1,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SecurityEvent_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "SecurityEvent_guildId_kind_createdAt_idx" ON "SecurityEvent"("guildId","kind","createdAt");
CREATE INDEX "SecurityEvent_guildId_actorUserId_createdAt_idx" ON "SecurityEvent"("guildId","actorUserId","createdAt");
CREATE INDEX "SecurityEvent_guildId_userId_createdAt_idx" ON "SecurityEvent"("guildId","userId","createdAt");
