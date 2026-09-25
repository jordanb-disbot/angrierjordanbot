-- Race and Fight share one channel slot throughout betting and live animation.
CREATE UNIQUE INDEX "GameSession_active_race_fight_channel"
ON "GameSession" ("guildId", "channelId")
WHERE "type" IN ('race', 'fight') AND "state" IN ('OPEN', 'LOCKED', 'SETTLING');
ALTER TABLE "Wager" ADD CONSTRAINT "Wager_positive_amount" CHECK ("amount" > 0);
