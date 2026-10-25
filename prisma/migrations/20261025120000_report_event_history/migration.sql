CREATE TYPE "report_event_type" AS ENUM (
  'created',
  'entry_added',
  'edited',
  'merged',
  'submitted',
  'resubmitted',
  'accepted',
  'rejected',
  'deleted'
);

ALTER TABLE "report"
ADD COLUMN "created_by_id" TEXT,
ADD COLUMN "submission_count" INTEGER NOT NULL DEFAULT 0;

UPDATE "report" AS "report"
SET "created_by_id" = COALESCE(
  (
    SELECT "delegation"."leader_id"
    FROM "report_delegation" AS "delegation"
    WHERE "delegation"."report_id" = "report"."id"
    ORDER BY "delegation"."created_at", "delegation"."leader_id"
    LIMIT 1
  ),
  "report"."user_id"
);

UPDATE "report"
SET "submission_count" = CASE
  WHEN "sent_at" IS NULL THEN 0
  ELSE 1
END;

ALTER TABLE "report"
ALTER COLUMN "created_by_id" SET NOT NULL;

ALTER TABLE "report"
ADD CONSTRAINT "report_created_by_id_fkey"
FOREIGN KEY ("created_by_id") REFERENCES "user"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "report_created_by_id_idx" ON "report"("created_by_id");

UPDATE "report"
SET "draft_key" = CONCAT_WS(
  ':',
  "user_id",
  "created_by_id",
  "team_id",
  "website_id",
  TO_CHAR("date", 'YYYY-MM-DD')
)
WHERE "status" = 'draft' AND "draft_key" IS NOT NULL;

CREATE TABLE "report_event" (
  "id" TEXT NOT NULL,
  "report_id" TEXT NOT NULL,
  "related_report_id" TEXT,
  "type" "report_event_type" NOT NULL,
  "cycle" INTEGER NOT NULL DEFAULT 0,
  "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "actor_id" TEXT,
  "actor_name" TEXT,
  "actor_role" "user_role",
  "owner_id" TEXT NOT NULL,
  "owner_name" TEXT NOT NULL,
  "creator_id" TEXT NOT NULL,
  "creator_name" TEXT NOT NULL,
  "team_id" TEXT NOT NULL,
  "team_name" TEXT NOT NULL,
  "website_id" TEXT NOT NULL,
  "website_name" TEXT NOT NULL,
  "report_date" DATE NOT NULL,
  "amount" DECIMAL(12, 2) NOT NULL,
  "breakdown" DECIMAL(12, 2)[] NOT NULL DEFAULT ARRAY[]::DECIMAL(12, 2)[],
  "status" "report_status" NOT NULL,
  "submission_origin" "report_submission_origin",
  "rejection_note" TEXT,
  "start_amount" DECIMAL(12, 2),
  "end_amount" DECIMAL(12, 2),
  "backfilled" BOOLEAN NOT NULL DEFAULT false,

  CONSTRAINT "report_event_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "report_event_report_id_occurred_at_idx"
ON "report_event"("report_id", "occurred_at");

CREATE INDEX "report_event_owner_id_occurred_at_idx"
ON "report_event"("owner_id", "occurred_at");

CREATE INDEX "report_event_team_id_occurred_at_idx"
ON "report_event"("team_id", "occurred_at");

CREATE INDEX "report_event_type_occurred_at_idx"
ON "report_event"("type", "occurred_at");

INSERT INTO "report_event" (
  "id",
  "report_id",
  "type",
  "cycle",
  "occurred_at",
  "actor_id",
  "actor_name",
  "actor_role",
  "owner_id",
  "owner_name",
  "creator_id",
  "creator_name",
  "team_id",
  "team_name",
  "website_id",
  "website_name",
  "report_date",
  "amount",
  "breakdown",
  "status",
  "backfilled"
)
SELECT
  CONCAT('backfill:', "report"."id", ':created'),
  "report"."id",
  'created'::"report_event_type",
  0,
  "report"."created_at",
  "creator"."id",
  "creator"."name",
  "creator"."role",
  "owner"."id",
  "owner"."name",
  "creator"."id",
  "creator"."name",
  "team"."id",
  "team"."name",
  "website"."id",
  "website"."name",
  "report"."date",
  "report"."amount",
  "report"."breakdown",
  'draft'::"report_status",
  true
FROM "report"
JOIN "user" AS "owner" ON "owner"."id" = "report"."user_id"
JOIN "user" AS "creator" ON "creator"."id" = "report"."created_by_id"
JOIN "team" ON "team"."id" = "report"."team_id"
JOIN "website" ON "website"."id" = "report"."website_id";

INSERT INTO "report_event" (
  "id",
  "report_id",
  "type",
  "cycle",
  "occurred_at",
  "actor_name",
  "owner_id",
  "owner_name",
  "creator_id",
  "creator_name",
  "team_id",
  "team_name",
  "website_id",
  "website_name",
  "report_date",
  "amount",
  "breakdown",
  "status",
  "submission_origin",
  "backfilled"
)
SELECT
  CONCAT('backfill:', "report"."id", ':submitted'),
  "report"."id",
  'submitted'::"report_event_type",
  1,
  "report"."sent_at",
  CASE
    WHEN "report"."submission_origin" = 'automatic' THEN 'Sistema'
    ELSE NULL
  END,
  "owner"."id",
  "owner"."name",
  "creator"."id",
  "creator"."name",
  "team"."id",
  "team"."name",
  "website"."id",
  "website"."name",
  "report"."date",
  "report"."amount",
  "report"."breakdown",
  'sent'::"report_status",
  "report"."submission_origin",
  true
FROM "report"
JOIN "user" AS "owner" ON "owner"."id" = "report"."user_id"
JOIN "user" AS "creator" ON "creator"."id" = "report"."created_by_id"
JOIN "team" ON "team"."id" = "report"."team_id"
JOIN "website" ON "website"."id" = "report"."website_id"
WHERE "report"."sent_at" IS NOT NULL;

INSERT INTO "report_event" (
  "id",
  "report_id",
  "type",
  "cycle",
  "occurred_at",
  "actor_id",
  "actor_name",
  "actor_role",
  "owner_id",
  "owner_name",
  "creator_id",
  "creator_name",
  "team_id",
  "team_name",
  "website_id",
  "website_name",
  "report_date",
  "amount",
  "breakdown",
  "status",
  "submission_origin",
  "rejection_note",
  "start_amount",
  "end_amount",
  "backfilled"
)
SELECT
  CONCAT('backfill:', "report"."id", ':', "report"."status"::TEXT),
  "report"."id",
  "report"."status"::TEXT::"report_event_type",
  1,
  "report"."reviewed_at",
  "reviewer"."id",
  "reviewer"."name",
  "reviewer"."role",
  "owner"."id",
  "owner"."name",
  "creator"."id",
  "creator"."name",
  "team"."id",
  "team"."name",
  "website"."id",
  "website"."name",
  "report"."date",
  "report"."amount",
  "report"."breakdown",
  "report"."status",
  "report"."submission_origin",
  "report"."rejection_note",
  "report"."start_amount",
  "report"."end_amount",
  true
FROM "report"
JOIN "user" AS "owner" ON "owner"."id" = "report"."user_id"
JOIN "user" AS "creator" ON "creator"."id" = "report"."created_by_id"
JOIN "team" ON "team"."id" = "report"."team_id"
JOIN "website" ON "website"."id" = "report"."website_id"
LEFT JOIN "user" AS "reviewer" ON "reviewer"."id" = "report"."reviewed_by_id"
WHERE "report"."reviewed_at" IS NOT NULL
  AND "report"."status" IN ('accepted', 'rejected');

DROP TABLE "report_delegation";
