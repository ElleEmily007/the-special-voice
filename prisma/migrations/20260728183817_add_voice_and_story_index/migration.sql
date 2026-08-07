-- CreateTable
-- Baseline: Customer did not exist on this database; prior migration assumed
-- an already-provisioned table and failed with 42P01.
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "stripeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "voice" TEXT NOT NULL DEFAULT 'female',
    "testament" TEXT NOT NULL DEFAULT 'new',
    "frequency" INTEGER NOT NULL DEFAULT 1,
    "subscriptionId" TEXT,
    "planId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'trial',
    "trialEndsAt" TIMESTAMP(3),
    "storyIndex" INTEGER NOT NULL DEFAULT 0,
    "lastDeliveredAt" TIMESTAMP(3),
    "optedOut" BOOLEAN NOT NULL DEFAULT false,
    "optedOutAt" TIMESTAMP(3),
    "consentedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Customer_stripeId_key" ON "Customer"("stripeId");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_email_key" ON "Customer"("email");
