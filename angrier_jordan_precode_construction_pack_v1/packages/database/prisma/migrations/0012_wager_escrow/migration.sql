ALTER TABLE "Escrow" ADD COLUMN "walletAmount" BIGINT NOT NULL DEFAULT 0, ADD COLUMN "bankAmount" BIGINT NOT NULL DEFAULT 0;
UPDATE "Escrow" SET "walletAmount"=COALESCE("amount",0);
ALTER TABLE "Escrow" ADD CONSTRAINT "Escrow_amount_bounds" CHECK ("walletAmount">=0 AND "bankAmount">=0 AND ("amount" IS NULL OR ("amount">=0 AND "walletAmount"+"bankAmount"="amount")));
ALTER TABLE "CasinoPool" ADD CONSTRAINT "CasinoPool_nonnegative" CHECK ("amount">=0);
ALTER TABLE "LotteryTicket" ADD CONSTRAINT "LotteryTicket_count_bounds" CHECK ("count">=0 AND "count"<=20 AND "paid">=0);
ALTER TABLE "LotteryRound" ADD CONSTRAINT "LotteryRound_pot_nonnegative" CHECK ("pot">=0);
