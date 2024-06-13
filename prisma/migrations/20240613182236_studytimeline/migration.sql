-- CreateTable
CREATE TABLE "StudyTimeline" (
    "id" SERIAL NOT NULL,
    "instituteName" TEXT NOT NULL,
    "grade" TEXT NOT NULL,
    "information" TEXT NOT NULL,
    "subInformation" TEXT NOT NULL,
    "time" TEXT NOT NULL,

    CONSTRAINT "StudyTimeline_pkey" PRIMARY KEY ("id")
);
