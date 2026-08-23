ALTER TABLE "workflows" ADD COLUMN IF NOT EXISTS "default_assignee_ids" text[] DEFAULT '{}'::text[] NOT NULL;
--> statement-breakpoint
UPDATE "workflows"
SET "default_assignee_ids" = ARRAY["default_assignee_id"::text]
WHERE "default_assignee_id" IS NOT NULL AND ("default_assignee_ids" IS NULL OR "default_assignee_ids" = '{}');
