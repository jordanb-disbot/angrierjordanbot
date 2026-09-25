-- One public party-game round. Completed FMK assignments have independent local
-- audience votes and deliberately do not occupy this slot while a replay begins.
CREATE UNIQUE INDEX "GameSession_active_public_party_channel"
ON "GameSession" ("guildId", "channelId")
WHERE "type" IN ('wyr', 'truthordare', 'wwyd', 'finishsentence', 'onewordstory')
AND "state" IN ('DRAFT', 'OPEN', 'LOCKED', 'SETTLING');
