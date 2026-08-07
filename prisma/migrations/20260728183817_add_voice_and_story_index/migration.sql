-- AlterTable
-- Adds voice selection and RVM delivery-sequence tracking to Customer,
-- and removes the retired smsAddon flag (SMS add-on was dropped from Phase 1).
ALTER TABLE "Customer" ADD COLUMN     "voice" TEXT NOT NULL DEFAULT 'female';
ALTER TABLE "Customer" ADD COLUMN     "storyIndex" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Customer" ADD COLUMN     "lastDeliveredAt" TIMESTAMP(3);
ALTER TABLE "Customer" DROP COLUMN "smsAddon";
