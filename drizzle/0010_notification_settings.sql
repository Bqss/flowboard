-- Notification settings table (Phase 7.6)
CREATE TABLE IF NOT EXISTS "notification_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"wa_failed" boolean DEFAULT true NOT NULL,
	"customer_replied" boolean DEFAULT true NOT NULL,
	"card_overdue" boolean DEFAULT true NOT NULL,
	"handover" boolean DEFAULT true NOT NULL,
	"email_wa_failed" boolean DEFAULT false NOT NULL,
	"email_customer_replied" boolean DEFAULT false NOT NULL,
	"email_card_overdue" boolean DEFAULT true NOT NULL,
	"email_handover" boolean DEFAULT true NOT NULL,
	"email_digest" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "notification_settings_workspace_user_idx" ON "notification_settings" ("workspace_id","user_id");
--> statement-breakpoint
ALTER TABLE "notification_settings" ADD CONSTRAINT "notification_settings_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "notification_settings" ADD CONSTRAINT "notification_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
