-- A weekly policy publication is idempotent by its scheduled Mountain cycle.
ALTER TABLE "EconomyPolicyVersion" ADD COLUMN "cycleKey" TEXT NOT NULL DEFAULT '';
CREATE UNIQUE INDEX "EconomyPolicyVersion_guildId_cycleKey_key" ON "EconomyPolicyVersion"("guildId", "cycleKey");
