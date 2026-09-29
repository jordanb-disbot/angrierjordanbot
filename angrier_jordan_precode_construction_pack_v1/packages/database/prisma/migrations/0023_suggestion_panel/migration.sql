-- One canonical, recoverable suggestions panel per server.
CREATE TABLE "SuggestionPanel" (
  "guildId" TEXT NOT NULL,
  "channelId" TEXT NOT NULL,
  "messageId" TEXT,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SuggestionPanel_pkey" PRIMARY KEY ("guildId")
);
