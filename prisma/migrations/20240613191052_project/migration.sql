-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT[],
    "detail" TEXT NOT NULL,
    "tags" TEXT[],
    "link" TEXT NOT NULL,
    "git" TEXT NOT NULL,
    "img" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "type" "Type" NOT NULL DEFAULT 'FRONTEND',

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);
