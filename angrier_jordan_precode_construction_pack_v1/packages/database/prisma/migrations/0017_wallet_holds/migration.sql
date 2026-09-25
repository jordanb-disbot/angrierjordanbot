ALTER TABLE "EconomyAccount" ADD COLUMN "reservedWallet" BIGINT NOT NULL DEFAULT 0;
ALTER TABLE "EconomyAccount" ADD CONSTRAINT "EconomyAccount_wallet_holds_bounds" CHECK ("reservedWallet" >= 0 AND "wallet" >= "reservedWallet");
CREATE TABLE "WalletHold" (
  "id" TEXT NOT NULL,
  "guildId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "referenceType" TEXT NOT NULL,
  "referenceId" TEXT NOT NULL,
  "amount" BIGINT NOT NULL,
  "state" TEXT NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "releasedAt" TIMESTAMP(3),
  CONSTRAINT "WalletHold_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "WalletHold_amount_positive" CHECK ("amount" > 0),
  CONSTRAINT "WalletHold_state_valid" CHECK (("state" = 'ACTIVE' AND "releasedAt" IS NULL) OR ("state" = 'RELEASED' AND "releasedAt" IS NOT NULL))
);
CREATE UNIQUE INDEX "WalletHold_guildId_userId_referenceType_referenceId_key" ON "WalletHold"("guildId", "userId", "referenceType", "referenceId");
CREATE INDEX "WalletHold_guildId_userId_state_idx" ON "WalletHold"("guildId", "userId", "state");
