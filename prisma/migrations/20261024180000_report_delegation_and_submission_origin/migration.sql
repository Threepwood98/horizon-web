CREATE TYPE "report_submission_origin" AS ENUM ('manual', 'automatic');

ALTER TABLE "report"
ADD COLUMN "submission_origin" "report_submission_origin";

UPDATE "report"
SET "submission_origin" = 'manual'
WHERE "status" <> 'draft';

CREATE TABLE "report_delegation" (
  "report_id" TEXT NOT NULL,
  "leader_id" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "report_delegation_pkey" PRIMARY KEY ("report_id", "leader_id")
);

CREATE INDEX "report_delegation_leader_id_idx"
ON "report_delegation"("leader_id");

ALTER TABLE "report_delegation"
ADD CONSTRAINT "report_delegation_report_id_fkey"
FOREIGN KEY ("report_id") REFERENCES "report"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "report_delegation"
ADD CONSTRAINT "report_delegation_leader_id_fkey"
FOREIGN KEY ("leader_id") REFERENCES "user"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
