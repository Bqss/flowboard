CREATE TYPE "public"."task_viewer_mode" AS ENUM('all', 'group');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "workspace_member_group_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"group_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "workspace_member_groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"name" text NOT NULL,
	"created_by_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "viewer_mode" "task_viewer_mode" DEFAULT 'all' NOT NULL;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "viewer_group_id" uuid;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "workspace_member_group_members" ADD CONSTRAINT "workspace_member_group_members_group_id_workspace_member_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."workspace_member_groups"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "workspace_member_group_members" ADD CONSTRAINT "workspace_member_group_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "workspace_member_groups" ADD CONSTRAINT "workspace_member_groups_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "workspace_member_groups" ADD CONSTRAINT "workspace_member_groups_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "workspace_member_group_members_group_user_idx" ON "workspace_member_group_members" USING btree ("group_id","user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "workspace_member_group_members_user_idx" ON "workspace_member_group_members" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "workspace_member_groups_workspace_name_idx" ON "workspace_member_groups" USING btree ("workspace_id","name");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tasks" ADD CONSTRAINT "tasks_viewer_group_id_workspace_member_groups_id_fk" FOREIGN KEY ("viewer_group_id") REFERENCES "public"."workspace_member_groups"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
