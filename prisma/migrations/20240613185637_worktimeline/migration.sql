-- AlterTable
ALTER TABLE "StudyTimeline" ADD COLUMN     "visibility" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "WorkTimeline" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "time" TEXT NOT NULL,
    "detail" TEXT[],

    CONSTRAINT "WorkTimeline_pkey" PRIMARY KEY ("id")
);
