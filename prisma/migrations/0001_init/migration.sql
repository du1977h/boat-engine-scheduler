CREATE TABLE "User" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "loginId" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "displayName" TEXT NOT NULL,
  "role" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX "User_loginId_key" ON "User"("loginId");

CREATE TABLE "Session" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "tokenHash" TEXT NOT NULL,
  "userId" INTEGER NOT NULL,
  "expiresAt" DATETIME NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");

CREATE TABLE "Member" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "name" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX "Member_name_key" ON "Member"("name");

CREATE TABLE "ScheduleDay" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "targetDate" DATETIME NOT NULL,
  "year" INTEGER NOT NULL,
  "month" INTEGER NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastUpdatedAt" DATETIME,
  "lastUpdatedByUserId" INTEGER,
  CONSTRAINT "ScheduleDay_lastUpdatedByUserId_fkey" FOREIGN KEY ("lastUpdatedByUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "ScheduleDay_targetDate_key" ON "ScheduleDay"("targetDate");
CREATE INDEX "ScheduleDay_year_month_idx" ON "ScheduleDay"("year", "month");

CREATE TABLE "Assignment" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "scheduleDayId" INTEGER NOT NULL,
  "itemType" TEXT NOT NULL,
  "roleType" TEXT NOT NULL,
  "memberId" INTEGER,
  "updatedByUserId" INTEGER,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Assignment_scheduleDayId_fkey" FOREIGN KEY ("scheduleDayId") REFERENCES "ScheduleDay" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Assignment_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "Assignment_updatedByUserId_fkey" FOREIGN KEY ("updatedByUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "Assignment_scheduleDayId_itemType_roleType_key" ON "Assignment"("scheduleDayId", "itemType", "roleType");
CREATE INDEX "Assignment_memberId_idx" ON "Assignment"("memberId");

CREATE TABLE "ImportHistory" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "importType" TEXT NOT NULL,
  "fileName" TEXT NOT NULL,
  "rowCount" INTEGER NOT NULL,
  "success" BOOLEAN NOT NULL,
  "errorSummary" TEXT,
  "executedByUserId" INTEGER,
  "executedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ImportHistory_executedByUserId_fkey" FOREIGN KEY ("executedByUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
