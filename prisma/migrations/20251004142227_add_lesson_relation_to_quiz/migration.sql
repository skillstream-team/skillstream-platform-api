/*
  Warnings:

  - You are about to drop the column `options` on the `Poll` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."Poll" DROP COLUMN "options";

-- CreateTable
CREATE TABLE "public"."PollOption" (
    "id" SERIAL NOT NULL,
    "pollId" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "votes" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PollOption_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."PollOption" ADD CONSTRAINT "PollOption_pollId_fkey" FOREIGN KEY ("pollId") REFERENCES "public"."Poll"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
