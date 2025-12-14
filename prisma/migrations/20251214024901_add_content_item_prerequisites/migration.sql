-- CreateTable
CREATE TABLE "ContentItemPrerequisite" (
    "id" TEXT NOT NULL,
    "contentItemId" TEXT NOT NULL,
    "prerequisiteId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContentItemPrerequisite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ContentItemPrerequisite_contentItemId_prerequisiteId_key" ON "ContentItemPrerequisite"("contentItemId", "prerequisiteId");

-- CreateIndex
CREATE INDEX "ContentItemPrerequisite_contentItemId_idx" ON "ContentItemPrerequisite"("contentItemId");

-- CreateIndex
CREATE INDEX "ContentItemPrerequisite_prerequisiteId_idx" ON "ContentItemPrerequisite"("prerequisiteId");

-- AddForeignKey
ALTER TABLE "ContentItemPrerequisite" ADD CONSTRAINT "ContentItemPrerequisite_contentItemId_fkey" FOREIGN KEY ("contentItemId") REFERENCES "ContentItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentItemPrerequisite" ADD CONSTRAINT "ContentItemPrerequisite_prerequisiteId_fkey" FOREIGN KEY ("prerequisiteId") REFERENCES "ContentItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
