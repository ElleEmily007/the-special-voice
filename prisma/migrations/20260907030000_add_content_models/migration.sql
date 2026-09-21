-- AlterTable
ALTER TABLE "Customer" ADD COLUMN "trackKey" TEXT NOT NULL DEFAULT 'new';

-- CreateTable
CREATE TABLE "Story" (
    "id" TEXT NOT NULL,
    "testament" TEXT NOT NULL,
    "storyNumber" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Story_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Clip" (
    "id" TEXT NOT NULL,
    "storyId" TEXT NOT NULL,
    "take" INTEGER NOT NULL DEFAULT 1,
    "label" TEXT,
    "maleUrl" TEXT,
    "femaleUrl" TEXT,
    "maleBytes" INTEGER,
    "femaleBytes" INTEGER,
    "maleSeconds" DOUBLE PRECISION,
    "femaleSeconds" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "role" TEXT NOT NULL DEFAULT 'story',
    "legacyId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Clip_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Track" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Track_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrackItem" (
    "id" TEXT NOT NULL,
    "trackId" TEXT NOT NULL,
    "clipId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "TrackItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Delivery" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "clipId" TEXT NOT NULL,
    "voice" TEXT NOT NULL,
    "audioUrl" TEXT,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ok" BOOLEAN NOT NULL DEFAULT true,
    "providerStatus" INTEGER,
    "error" TEXT,

    CONSTRAINT "Delivery_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Story_testament_idx" ON "Story"("testament");

-- CreateIndex
CREATE UNIQUE INDEX "Story_testament_storyNumber_key" ON "Story"("testament", "storyNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Clip_legacyId_key" ON "Clip"("legacyId");

-- CreateIndex
CREATE INDEX "Clip_status_idx" ON "Clip"("status");

-- CreateIndex
CREATE INDEX "Clip_role_idx" ON "Clip"("role");

-- CreateIndex
CREATE UNIQUE INDEX "Clip_storyId_take_key" ON "Clip"("storyId", "take");

-- CreateIndex
CREATE UNIQUE INDEX "Track_key_key" ON "Track"("key");

-- CreateIndex
CREATE INDEX "TrackItem_trackId_position_idx" ON "TrackItem"("trackId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "TrackItem_trackId_position_key" ON "TrackItem"("trackId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "TrackItem_trackId_clipId_key" ON "TrackItem"("trackId", "clipId");

-- CreateIndex
CREATE INDEX "Delivery_customerId_sentAt_idx" ON "Delivery"("customerId", "sentAt");

-- CreateIndex
CREATE UNIQUE INDEX "Delivery_customerId_clipId_key" ON "Delivery"("customerId", "clipId");

-- AddForeignKey
ALTER TABLE "Clip" ADD CONSTRAINT "Clip_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "Story"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrackItem" ADD CONSTRAINT "TrackItem_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "Track"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrackItem" ADD CONSTRAINT "TrackItem_clipId_fkey" FOREIGN KEY ("clipId") REFERENCES "Clip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Delivery" ADD CONSTRAINT "Delivery_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Delivery" ADD CONSTRAINT "Delivery_clipId_fkey" FOREIGN KEY ("clipId") REFERENCES "Clip"("id") ON DELETE CASCADE ON UPDATE CASCADE;
