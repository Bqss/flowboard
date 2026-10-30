UPDATE "task_boards" SET "reminder_before_hours" = 2 WHERE "reminder_before_hours" = 24;--> statement-breakpoint
ALTER TABLE "task_boards" ALTER COLUMN "reminder_before_hours" SET DEFAULT 2;