BEGIN;
ALTER TABLE "StreakInstallment" ADD COLUMN "installmentCount" INTEGER NOT NULL DEFAULT 7;
ALTER TABLE "StreakInstallment" ADD COLUMN "installmentsPaid" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "StreakInstallment" ADD CONSTRAINT "StreakInstallment_terms_valid" CHECK ("installmentCount" > 0 AND "installmentsPaid" >= 0 AND "installmentsPaid" <= "installmentCount" AND "paidAmount" >= 0 AND "paidAmount" <= "totalAmount");
COMMIT;
