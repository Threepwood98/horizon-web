-- Preserve each amount entered for a report and provide an atomic key for active drafts.
ALTER TABLE "report"
ADD COLUMN "breakdown" DECIMAL(12, 2)[] NOT NULL DEFAULT ARRAY[]::DECIMAL(12, 2)[],
ADD COLUMN "draft_key" TEXT;

UPDATE "report"
SET "breakdown" = ARRAY["amount"];

-- Existing duplicate drafts are consolidated into the oldest report in each group.
WITH "draft_groups" AS (
  SELECT
    (ARRAY_AGG("id" ORDER BY "created_at", "id"))[1] AS "canonical_id",
    ARRAY_AGG("id" ORDER BY "created_at", "id") AS "report_ids",
    SUM("amount")::DECIMAL(12, 2) AS "total_amount",
    ARRAY_AGG("amount" ORDER BY "created_at", "id") AS "entry_amounts"
  FROM "report"
  WHERE "status" = 'draft'
  GROUP BY "user_id", "team_id", "website_id", "date"
  HAVING COUNT(*) > 1
),
"updated_drafts" AS (
  UPDATE "report" AS "report"
  SET
    "amount" = "draft_groups"."total_amount",
    "breakdown" = "draft_groups"."entry_amounts"
  FROM "draft_groups"
  WHERE "report"."id" = "draft_groups"."canonical_id"
  RETURNING "report"."id"
)
DELETE FROM "report" AS "report"
USING "draft_groups"
WHERE "report"."id" = ANY("draft_groups"."report_ids")
  AND "report"."id" <> "draft_groups"."canonical_id";

UPDATE "report"
SET "draft_key" = CONCAT_WS(
  ':',
  "user_id",
  "team_id",
  "website_id",
  TO_CHAR("date", 'YYYY-MM-DD')
)
WHERE "status" = 'draft';

CREATE UNIQUE INDEX "report_draft_key_key" ON "report"("draft_key");
