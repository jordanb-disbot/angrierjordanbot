-- Proposed migration 0019: existing models suffice; serialize family mutations via the shared atomic transaction.
CREATE UNIQUE INDEX "Marriage_one_current_pair" ON "Marriage" ("guildId", LEAST("userA","userB"), GREATEST("userA","userB")) WHERE "status" IN ('PENDING','ACTIVE');
CREATE UNIQUE INDEX "Adoption_one_current_pair" ON "Adoption" ("guildId","childUserId") WHERE "status" IN ('PENDING','ACTIVE');
CREATE UNIQUE INDEX "FamilyAuction_one_active_self" ON "FamilyAuction" ("guildId","sellerUserId") WHERE "status"='OPEN' AND "auctionType" IN ('spouse','child');
CREATE UNIQUE INDEX "FamilyAuctionBid_one_bidder" ON "FamilyAuctionBid" ("auctionId","bidderUserId");
CREATE UNIQUE INDEX "GameSession_one_pending_estate" ON "GameSession" ("guildId","ownerUserId") WHERE "type"='family_estate' AND "state" IN ('OPEN','LOCKED','SETTLING');
