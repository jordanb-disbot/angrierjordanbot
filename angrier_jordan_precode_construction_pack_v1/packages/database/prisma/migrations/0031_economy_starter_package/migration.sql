BEGIN;

-- The onboarding voucher is an owned consumable, never purchasable, giftable,
-- or sellable. It is consumed atomically by the existing repair transaction.
INSERT INTO "CatalogItem" ("id","type","name","rarity","buyPrice","sellValue","giftable","enabled","metadata")
VALUES ('consumable.starter_repair_voucher','consumable','Starter Repair Voucher','Common',NULL,NULL,false,true,'{"starterOnly":true,"repairVoucher":true}'::jsonb)
ON CONFLICT ("id") DO UPDATE SET "giftable"=false,"buyPrice"=NULL,"sellValue"=NULL,"enabled"=true,"metadata"=EXCLUDED."metadata";

COMMIT;
