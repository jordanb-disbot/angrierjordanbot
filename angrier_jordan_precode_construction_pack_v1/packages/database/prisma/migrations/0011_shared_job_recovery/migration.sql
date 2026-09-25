ALTER TABLE "ScheduledJob" ADD COLUMN "leaseToken" TEXT, ADD COLUMN "leaseUntil" TIMESTAMP(3), ADD COLUMN "retryAt" TIMESTAMP(3);
UPDATE "ScheduledJob" SET "retryAt"=CURRENT_TIMESTAMP WHERE "status"='FAILED';
CREATE INDEX "ScheduledJob_status_leaseUntil_idx" ON "ScheduledJob"("status","leaseUntil");
CREATE INDEX "ScheduledJob_status_retryAt_idx" ON "ScheduledJob"("status","retryAt");
