CREATE TYPE "public"."chat_conversation_context" AS ENUM('group', 'taskboard', 'workflow');--> statement-breakpoint
ALTER TABLE "chat_conversations" DROP CONSTRAINT "chat_conversations_kind_check";--> statement-breakpoint
ALTER TABLE "tasks" DROP CONSTRAINT "tasks_viewer_group_id_workspace_member_groups_id_fk";
--> statement-breakpoint
DROP INDEX IF EXISTS "chat_conversations_group_id_idx";--> statement-breakpoint
ALTER TABLE "chat_conversations" ADD COLUMN "context_type" "chat_conversation_context";--> statement-breakpoint
ALTER TABLE "chat_conversations" ADD COLUMN "context_id" uuid;--> statement-breakpoint
ALTER TABLE "task_boards" ADD COLUMN "workspace_member_group_id" uuid;--> statement-breakpoint
ALTER TABLE "workflows" ADD COLUMN "workspace_member_group_id" uuid;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "task_boards" ADD CONSTRAINT "task_boards_workspace_member_group_id_workspace_member_groups_id_fk" FOREIGN KEY ("workspace_member_group_id") REFERENCES "public"."workspace_member_groups"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "workflows" ADD CONSTRAINT "workflows_workspace_member_group_id_workspace_member_groups_id_fk" FOREIGN KEY ("workspace_member_group_id") REFERENCES "public"."workspace_member_groups"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "chat_conversations_context_idx" ON "chat_conversations" USING btree ("workspace_id","context_type","context_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chat_conversations_group_idx" ON "chat_conversations" USING btree ("group_id");--> statement-breakpoint
ALTER TABLE "tasks" DROP COLUMN IF EXISTS "viewer_mode";--> statement-breakpoint
ALTER TABLE "tasks" DROP COLUMN IF EXISTS "viewer_group_id";--> statement-breakpoint
ALTER TABLE "tasks" DROP COLUMN IF EXISTS "viewer_group_ids";--> statement-breakpoint
ALTER TABLE "chat_conversations" ADD CONSTRAINT "chat_conversations_kind_check" CHECK ((kind = 'direct' AND direct_key IS NOT NULL AND name IS NULL) OR (kind = 'group' AND name IS NOT NULL AND direct_key IS NULL));
DROP TYPE "public"."task_viewer_mode";
