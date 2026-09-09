ALTER TYPE "public"."card_source" ADD VALUE 'sheets';--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "google_sheets_connections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"workflow_id" uuid NOT NULL,
	"name" text NOT NULL,
	"spreadsheet_id" text NOT NULL,
	"spreadsheet_name" text NOT NULL,
	"sheet_name" text DEFAULT 'Sheet1' NOT NULL,
	"refresh_token_encrypted" text NOT NULL,
	"column_mapping" jsonb NOT NULL,
	"header_row_count" integer DEFAULT 1 NOT NULL,
	"last_synced_row" integer DEFAULT 0 NOT NULL,
	"last_synced_at" timestamp with time zone,
	"last_error" text,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "google_sheets_connections" ADD CONSTRAINT "google_sheets_connections_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "google_sheets_connections" ADD CONSTRAINT "google_sheets_connections_workflow_id_workflows_id_fk" FOREIGN KEY ("workflow_id") REFERENCES "public"."workflows"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "google_sheets_connections_workspace_idx" ON "google_sheets_connections" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "google_sheets_connections_workflow_idx" ON "google_sheets_connections" USING btree ("workflow_id");