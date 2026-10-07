BEGIN;

CREATE TABLE "MemberDirectory" (
  "guildId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "nickname" TEXT,
  "displayName" TEXT NOT NULL,
  "username" TEXT NOT NULL,
  "normalizedAliases" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "searchText" TEXT NOT NULL,
  "lastSyncedAt" TIMESTAMP(3) NOT NULL,
  "archivedAt" TIMESTAMP(3),
  CONSTRAINT "MemberDirectory_pkey" PRIMARY KEY ("guildId", "userId")
);

CREATE INDEX "MemberDirectory_guildId_archivedAt_lastSyncedAt_idx"
  ON "MemberDirectory"("guildId", "archivedAt", "lastSyncedAt");
CREATE INDEX "MemberDirectory_guildId_searchText_idx"
  ON "MemberDirectory"("guildId", "searchText");

ALTER TABLE "MemberDirectory" ADD CONSTRAINT "MemberDirectory_guildId_fkey"
  FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;

COMMIT;
