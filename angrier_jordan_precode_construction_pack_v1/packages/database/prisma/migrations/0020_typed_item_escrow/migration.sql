-- Monetary amounts are never item quantities. Keep 0012's funding constraint intact.
-- Stop before schema changes if legacy rows cannot be classified without guessing.
BEGIN;
LOCK TABLE "Escrow" IN ACCESS EXCLUSIVE MODE;
DO $$
DECLARE incompatible BIGINT;
BEGIN
  SELECT count(*) INTO incompatible FROM "Escrow"
  WHERE "kind" <> 'OTTOMANS' OR "amount" IS NULL OR "itemRef" IS NOT NULL
     OR "ownerUserId" IS NULL OR length(btrim("ownerUserId")) = 0;
  IF incompatible > 0 THEN
    RAISE EXCEPTION 'Typed escrow preflight: % incompatible legacy rows. Reconcile asset kind, owner and explicit item quantity before retrying; no balances or rows were changed.', incompatible;
  END IF;
END $$;
ALTER TABLE "Escrow" ADD COLUMN "itemQuantity" INTEGER;
ALTER TABLE "Escrow" ADD CONSTRAINT "Escrow_typed_asset" CHECK (
  "ownerUserId" IS NOT NULL AND length(btrim("ownerUserId")) > 0 AND (
    ("kind" = 'OTTOMANS' AND "amount" IS NOT NULL AND "itemRef" IS NULL AND "itemQuantity" IS NULL)
    OR
    ("kind" = 'ITEM' AND "amount" IS NULL AND "walletAmount" = 0 AND "bankAmount" = 0
      AND "itemRef" IS NOT NULL AND length(btrim("itemRef")) > 0
      AND "itemQuantity" IS NOT NULL AND "itemQuantity" > 0)
  )
);
COMMIT;
