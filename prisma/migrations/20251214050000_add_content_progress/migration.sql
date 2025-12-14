-- CreateTable
CREATE TABLE "ContentProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "contentItemId" TEXT NOT NULL,
    "progress" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "pagesViewed" INTEGER,
    "lastPage" INTEGER,
    "totalPages" INTEGER,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContentProgress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ContentProgress_userId_contentItemId_key" ON "ContentProgress"("userId", "contentItemId");

-- CreateIndex
CREATE INDEX "ContentProgress_userId_idx" ON "ContentProgress"("userId");

-- CreateIndex
CREATE INDEX "ContentProgress_contentItemId_idx" ON "ContentProgress"("contentItemId");

-- CreateIndex
CREATE INDEX "ContentProgress_completed_idx" ON "ContentProgress"("completed");

-- AddForeignKey
ALTER TABLE "ContentProgress" ADD CONSTRAINT "ContentProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentProgress" ADD CONSTRAINT "ContentProgress_contentItemId_fkey" FOREIGN KEY ("contentItemId") REFERENCES "ContentItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

