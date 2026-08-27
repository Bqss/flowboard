-- Missing stage + checklist template columns (Phase 7.2 schema fields)
ALTER TABLE "stages" ADD COLUMN IF NOT EXISTS "on_reply_notify" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "stages" ADD COLUMN IF NOT EXISTS "overdue_reminder_hours" integer;
--> statement-breakpoint
ALTER TABLE "checklist_templates" ADD COLUMN IF NOT EXISTS "deadline_hours" integer;
