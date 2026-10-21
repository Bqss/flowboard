CREATE TYPE "public"."task_recurrence" AS ENUM('never', 'daily', 'weekly');--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "start_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "recurrence" "task_recurrence" DEFAULT 'never' NOT NULL;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "recurrence_days" integer[] DEFAULT ARRAY[]::integer[] NOT NULL;