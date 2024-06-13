-- CreateEnum
CREATE TYPE "Type" AS ENUM ('FRONTEND', 'BACKEND', 'DESIGN', 'CORE', 'DEVOPS');

-- CreateTable
CREATE TABLE "Technology" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "Type" NOT NULL DEFAULT 'FRONTEND',
    "visibility" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Technology_pkey" PRIMARY KEY ("id")
);
