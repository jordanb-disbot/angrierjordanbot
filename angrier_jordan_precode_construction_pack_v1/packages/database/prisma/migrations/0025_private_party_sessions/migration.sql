-- Private card sessions do not occupy the shared public party-game slot.
-- The previous partial index did not distinguish JSON visibility, so an open
-- private Truth/Dare or WWYD card could block an unrelated public WYR round.
DROP INDEX IF EXISTS "GameSession_active_public_party_channel";

CREATE UNIQUE INDEX "GameSession_active_public_party_channel"
ON "GameSession" ("guildId", "channelId")
WHERE "type" IN ('wyr', 'truthordare', 'wwyd', 'finishsentence', 'onewordstory')
  AND "state" IN ('DRAFT', 'OPEN', 'LOCKED', 'SETTLING')
  AND COALESCE("data"->>'visibility', 'public') <> 'private';
