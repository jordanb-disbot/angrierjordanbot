-- Line may coexist with Race/Fight, but there is one active Line per channel.
CREATE UNIQUE INDEX "GameSession_active_line_channel" ON "GameSession" ("guildId", "channelId")
WHERE "type" = 'line' AND "state" IN ('OPEN', 'LOCKED', 'SETTLING');
