-- Supports the EAJ 1.1 active-member benchmark. Existing members remain
-- untouched until their authoritative Discord membership observation is known.
ALTER TABLE "Member" ADD COLUMN "joinedAt" TIMESTAMPTZ;
CREATE INDEX "Member_guildId_joinedAt_idx" ON "Member"("guildId", "joinedAt");
