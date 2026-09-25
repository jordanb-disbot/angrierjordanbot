CREATE TABLE "DashboardDraft" (
  "guildId" TEXT NOT NULL,
  "revision" INTEGER NOT NULL DEFAULT 0,
  "state" JSONB NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DashboardDraft_pkey" PRIMARY KEY ("guildId")
);
