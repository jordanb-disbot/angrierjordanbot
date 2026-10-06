CREATE TABLE "RoleSelectionPanel" (
  "guildId" TEXT NOT NULL,
  "channelId" TEXT NOT NULL,
  "messageId" TEXT NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RoleSelectionPanel_pkey" PRIMARY KEY ("guildId")
);
