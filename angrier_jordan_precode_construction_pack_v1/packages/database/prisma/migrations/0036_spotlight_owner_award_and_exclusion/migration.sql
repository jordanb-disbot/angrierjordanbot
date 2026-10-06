BEGIN;
CREATE TABLE "SpotlightEligibilityExclusion" (
  "guildId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SpotlightEligibilityExclusion_pkey" PRIMARY KEY ("guildId", "userId")
);

-- Owner-authorized one-time prestige grant.  The select scopes it only to a
-- server where this member already exists; it never fabricates a member.
INSERT INTO "SpotlightEligibilityExclusion" ("guildId","userId","reason")
SELECT "guildId",'1432212068785721424','Owner-authorized permanent Triple Threat award; excluded from future Weekly Spotlight and Triple Threat eligibility.'
FROM "Member" WHERE "userId"='1432212068785721424'
ON CONFLICT ("guildId","userId") DO NOTHING;
INSERT INTO "ProfileState" ("guildId","userId","tripleThreatAt","updatedAt")
SELECT "guildId",'1432212068785721424',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP FROM "Member" WHERE "userId"='1432212068785721424'
ON CONFLICT ("guildId","userId") DO UPDATE SET "tripleThreatAt"=COALESCE("ProfileState"."tripleThreatAt",EXCLUDED."tripleThreatAt"),"updatedAt"=CURRENT_TIMESTAMP;
INSERT INTO "MemberAchievement" ("guildId","userId","achievementId","metadata")
SELECT "guildId",'1432212068785721424','spotlight.triple_threat','{"source":"owner_authorized","reason":"One-time Triple Threat prestige grant; excluded from future Spotlight eligibility."}'::jsonb FROM "Member" WHERE "userId"='1432212068785721424'
ON CONFLICT ("guildId","userId","achievementId") DO NOTHING;
INSERT INTO "AuditEvent" ("id","guildId","actorUserId","source","action","targetType","targetId","after","reason","requestId","createdAt")
SELECT 'owner-triple-threat-'||"guildId","guildId",NULL,'owner','achievement.owner_award','achievement','spotlight.triple_threat','{"userId":"1432212068785721424","excludedFromFutureSpotlight":true}'::jsonb,'Owner-authorized one-time Triple Threat prestige grant.','owner-triple-threat-1432212068785721424',CURRENT_TIMESTAMP FROM "Member" WHERE "userId"='1432212068785721424'
ON CONFLICT ("id") DO NOTHING;
COMMIT;
