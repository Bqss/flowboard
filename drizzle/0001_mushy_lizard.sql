CREATE TYPE "public"."closure_by" AS ENUM('initiator', 'assignee');--> statement-breakpoint
CREATE TYPE "public"."deadline_unit" AS ENUM('hours', 'days');--> statement-breakpoint
CREATE TYPE "public"."repeat_rule" AS ENUM('none', 'daily', 'weekly', 'monthly');--> statement-breakpoint
CREATE TYPE "public"."urgency" AS ENUM('high', 'medium', 'low');--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'card_due_soon' BEFORE 'handover';--> statement-breakpoint
ALTER TABLE "cards" ADD COLUMN "due_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "cards" ADD COLUMN "due_soon_notified_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "cards" ADD COLUMN "overdue_notified_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "cards" ADD COLUMN "completed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "cards" ADD COLUMN "completed_by_id" uuid;--> statement-breakpoint
ALTER TABLE "workflows" ADD COLUMN "urgency" "urgency" DEFAULT 'medium' NOT NULL;--> statement-breakpoint
ALTER TABLE "workflows" ADD COLUMN "deadline_value" integer;--> statement-breakpoint
ALTER TABLE "workflows" ADD COLUMN "deadline_unit" "deadline_unit" DEFAULT 'days' NOT NULL;--> statement-breakpoint
ALTER TABLE "workflows" ADD COLUMN "reminder_before_value" integer;--> statement-breakpoint
ALTER TABLE "workflows" ADD COLUMN "reminder_before_unit" "deadline_unit" DEFAULT 'hours' NOT NULL;--> statement-breakpoint
ALTER TABLE "workflows" ADD COLUMN "repeat_rule" "repeat_rule" DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE "workflows" ADD COLUMN "closure_by" "closure_by" DEFAULT 'initiator' NOT NULL;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cards" ADD CONSTRAINT "cards_completed_by_id_users_id_fk" FOREIGN KEY ("completed_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
