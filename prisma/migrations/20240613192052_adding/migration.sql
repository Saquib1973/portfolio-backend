-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "visibility" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "WorkTimeline" ADD COLUMN     "visibility" BOOLEAN NOT NULL DEFAULT true;
