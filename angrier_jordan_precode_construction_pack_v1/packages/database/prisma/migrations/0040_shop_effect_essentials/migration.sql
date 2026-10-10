-- Keep the three live effect items in every Shop rotation without changing
-- staff-controlled prices or removing any custom metadata.
INSERT INTO "CatalogItem" ("id","type","name","rarity","buyPrice","sellValue","giftable","enabled","metadata") VALUES
  ('effect.boner_pills','consumable','Boner Pills','Rare',250,0,true,true,'{"inheritable":false,"consumable":true,"essential":true,"effect":"boner_pills","action":"/pp","description":"Prime your next private size check.","icon":"event_art/v5/boner-pills.png"}'::jsonb),
  ('effect.fighting_lessons','consumable','Fighting Lessons','Rare',500,0,true,true,'{"inheritable":false,"consumable":true,"essential":true,"effect":"fighting_lessons","action":"/fight","bonusPercent":30,"description":"A 30% edge in your next fight.","icon":"event_art/v5/fighting-lessons.png"}'::jsonb),
  ('effect.wheelchair_tuneup','consumable','Wheelchair Tune-Up','Rare',500,0,true,true,'{"inheritable":false,"consumable":true,"essential":true,"effect":"wheelchair_tuneup","action":"!race","bonusPercent":30,"description":"A 30% edge in your next race.","icon":"event_art/v5/wheelchair-tuneup.png"}'::jsonb)
ON CONFLICT ("id") DO UPDATE SET
  "name"=EXCLUDED."name",
  "enabled"=true,
  "metadata"=COALESCE("CatalogItem"."metadata",'{}'::jsonb)||EXCLUDED."metadata";
