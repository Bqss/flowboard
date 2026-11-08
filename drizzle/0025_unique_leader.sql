ALTER TABLE "task_boards" ADD COLUMN "workspace_member_group_ids" text[] DEFAULT '{}'::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "task_boards" ADD COLUMN "allowed_user_ids" text[] DEFAULT '{}'::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "workflows" ADD COLUMN "workspace_member_group_ids" text[] DEFAULT '{}'::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "workflows" ADD COLUMN "allowed_user_ids" text[] DEFAULT '{}'::text[] NOT NULL;
--> statement-breakpoint
UPDATE "workflows"
SET "workspace_member_group_ids" = ARRAY["workspace_member_group_id"::text]
WHERE "workspace_member_group_id" IS NOT NULL
  AND cardinality("workspace_member_group_ids") = 0;--> statement-breakpoint
UPDATE "task_boards"
SET "workspace_member_group_ids" = ARRAY["workspace_member_group_id"::text]
WHERE "workspace_member_group_id" IS NOT NULL
  AND cardinality("workspace_member_group_ids") = 0;