-- AlterTable
ALTER TABLE "Consent" ADD COLUMN "channel" TEXT NOT NULL DEFAULT 'combined';

ALTER TABLE "Consent" ALTER COLUMN "channel" DROP DEFAULT;
