ALTER TABLE "task_boards" ADD COLUMN "labels" text[] DEFAULT ARRAY[]::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "workflows" ADD COLUMN "labels" text[] DEFAULT ARRAY[]::text[] NOT NULL;--> statement-breakpoint
UPDATE "task_boards" SET "labels" = ARRAY["label"] WHERE "label" IS NOT NULL AND "label" != '';--> statement-breakpoint
UPDATE "workflows" SET "labels" = ARRAY["label"] WHERE "label" IS NOT NULL AND "label" != '';--> statement-breakpoint
ALTER TABLE "task_boards" DROP COLUMN IF EXISTS "label";--> statement-breakpoint
ALTER TABLE "workflows" DROP COLUMN IF EXISTS "label";