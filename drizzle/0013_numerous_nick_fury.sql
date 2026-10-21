ALTER TABLE "tasks" ADD COLUMN "viewer_group_ids" uuid[] DEFAULT ARRAY[]::uuid[] NOT NULL;
UPDATE "tasks"
SET "viewer_group_ids" = ARRAY["viewer_group_id"]
WHERE "viewer_group_id" IS NOT NULL
  AND "viewer_mode" = 'group';--> statement-breakpoint