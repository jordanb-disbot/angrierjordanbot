CREATE TABLE "RoleSelectionCard" (
  "guildId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "channelId" TEXT NOT NULL,
  "messageId" TEXT NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RoleSelectionCard_pkey" PRIMARY KEY ("guildId", "userId")
);
