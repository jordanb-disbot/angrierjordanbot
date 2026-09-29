-- Fully Furnished is an event-only progress ledger. It intentionally does not
-- derive state from historical member activity.
CREATE TABLE "FullyFurnishedEvent" (
  "guildId" TEXT NOT NULL,
  "startsAt" TIMESTAMP(3) NOT NULL,
  "endsAt" TIMESTAMP(3) NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "roleId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "FullyFurnishedEvent_pkey" PRIMARY KEY ("guildId"),
  CONSTRAINT "FullyFurnishedEvent_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "FullyFurnishedProgress" (
  "guildId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "loreChapters" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "chairHistorianAt" TIMESTAMP(3),
  "properlyIntroducedAt" TIMESTAMP(3),
  "armchairArchitectAt" TIMESTAMP(3),
  "casinoRounds" INTEGER NOT NULL DEFAULT 0,
  "houseRegularAt" TIMESTAMP(3),
  "commandNames" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "buttonMasherAt" TIMESTAMP(3),
  "fullyFurnishedAt" TIMESTAMP(3),
  "roleGrantedAt" TIMESTAMP(3),
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "FullyFurnishedProgress_pkey" PRIMARY KEY ("guildId","userId"),
  CONSTRAINT "FullyFurnishedProgress_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "FullyFurnishedEvent"("guildId") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "FullyFurnishedProgress_guildId_userId_fkey" FOREIGN KEY ("guildId","userId") REFERENCES "Member"("guildId","userId") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "FullyFurnishedProgress_guildId_fullyFurnishedAt_idx" ON "FullyFurnishedProgress"("guildId","fullyFurnishedAt");

CREATE TABLE "FullyFurnishedReceipt" (
  "guildId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "reference" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FullyFurnishedReceipt_pkey" PRIMARY KEY ("guildId","userId","kind","reference")
);
CREATE INDEX "FullyFurnishedReceipt_guildId_kind_createdAt_idx" ON "FullyFurnishedReceipt"("guildId","kind","createdAt");
