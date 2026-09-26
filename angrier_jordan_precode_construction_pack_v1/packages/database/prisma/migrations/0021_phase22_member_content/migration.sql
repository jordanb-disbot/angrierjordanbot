-- Additive migration: preserve stable prompt IDs, legacy answers and existing completion dates.
ALTER TABLE "IntroductionPrompt"
 ADD COLUMN "minLength" INTEGER,
 ADD COLUMN "inputStyle" TEXT NOT NULL DEFAULT 'paragraph',
 ADD COLUMN "showOnCard" BOOLEAN NOT NULL DEFAULT true,
 ADD COLUMN "deletedAt" TIMESTAMP(3),
 ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "IntroductionSubmission"
 ADD COLUMN "outputChannelId" TEXT,
 ADD COLUMN "publishedRevision" INTEGER NOT NULL DEFAULT 0;
CREATE TABLE "IntroductionFormConfig" (
 "guildId" TEXT NOT NULL PRIMARY KEY,
 "sourceFingerprint" TEXT,
 "introductionChannelId" TEXT,
 "panelMessageId" TEXT,
 "headerText" TEXT NOT NULL DEFAULT 'PULL UP A CHAIR',
 "footerText" TEXT NOT NULL DEFAULT 'Welcome to Chairs. Make yourself comfortable.',
 "showAvatar" BOOLEAN NOT NULL DEFAULT true,
 "showDisplayName" BOOLEAN NOT NULL DEFAULT true,
 "showJoinDate" BOOLEAN NOT NULL DEFAULT false,
 "allowAdminIntroConfig" BOOLEAN NOT NULL DEFAULT false,
 "version" INTEGER NOT NULL DEFAULT 1,
 "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE "LoreProgress" (
 "guildId" TEXT NOT NULL,
 "userId" TEXT NOT NULL,
 "chapterId" TEXT NOT NULL,
 "currentPage" INTEGER NOT NULL DEFAULT 0,
 "contentVersion" INTEGER NOT NULL DEFAULT 1,
 "completedAt" TIMESTAMP(3),
 "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY ("guildId", "userId", "chapterId"),
 FOREIGN KEY ("guildId", "userId") REFERENCES "Member"("guildId", "userId") ON DELETE CASCADE ON UPDATE CASCADE,
 CONSTRAINT "LoreProgress_page_nonnegative" CHECK ("currentPage" >= 0)
);
ALTER TABLE "TutorialProgress"
 ADD COLUMN "currentStep" INTEGER NOT NULL DEFAULT 0,
 ADD COLUMN "contentVersion" INTEGER NOT NULL DEFAULT 1,
 ADD COLUMN "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
