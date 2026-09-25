CREATE TABLE "StaffAlert" (
  "id" TEXT NOT NULL,
  "guildId" TEXT NOT NULL,
  "subjectUserId" TEXT NOT NULL,
  "actorUserId" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StaffAlert_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "StaffAlert_guildId_createdAt_idx" ON "StaffAlert"("guildId", "createdAt");
CREATE INDEX "StaffAlert_guildId_subjectUserId_createdAt_idx" ON "StaffAlert"("guildId", "subjectUserId", "createdAt");

CREATE TABLE "ChannelModerationState" (
  "id" TEXT NOT NULL,
  "guildId" TEXT NOT NULL,
  "channelId" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "snapshot" JSONB NOT NULL,
  "createdBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ChannelModerationState_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ChannelModerationState_guildId_channelId_kind_key" ON "ChannelModerationState"("guildId", "channelId", "kind");
CREATE INDEX "ChannelModerationState_guildId_active_idx" ON "ChannelModerationState"("guildId", "active");
