ALTER TABLE "task_boards" ADD COLUMN "reminder_before_hours" integer DEFAULT 24;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "due_soon_notified_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "overdue_notified_at" timestamp with time zone;