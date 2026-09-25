CREATE TABLE "ModerationCaseEvent" (
  "id" TEXT NOT NULL,
  "caseId" INTEGER NOT NULL,
  "kind" TEXT NOT NULL,
  "actorUserId" TEXT,
  "before" JSONB,
  "after" JSONB,
  "reason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ModerationCaseEvent_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ModerationCaseEvent_caseId_createdAt_idx" ON "ModerationCaseEvent"("caseId", "createdAt");
ALTER TABLE "ModerationCaseEvent" ADD CONSTRAINT "ModerationCaseEvent_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "ModerationCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;
