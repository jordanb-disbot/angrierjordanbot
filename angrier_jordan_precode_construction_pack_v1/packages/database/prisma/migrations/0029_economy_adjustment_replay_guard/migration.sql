-- A scheduled weekly publication may be retried; each policy field gets one audit adjustment.
CREATE UNIQUE INDEX "EconomyAdjustment_policyVersionId_key_key" ON "EconomyAdjustment"("policyVersionId", "key");
