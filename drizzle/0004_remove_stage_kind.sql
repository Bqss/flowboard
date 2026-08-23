ALTER TABLE "stages" ADD COLUMN IF NOT EXISTS "color" text DEFAULT 'indigo' NOT NULL;
--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stages' AND column_name = 'kind') THEN
    UPDATE "stages" SET "color" = 'indigo' WHERE "kind"::text = 'pending';
    UPDATE "stages" SET "color" = 'amber' WHERE "kind"::text = 'progress';
    UPDATE "stages" SET "color" = 'rose' WHERE "kind"::text = 'waiting';
    UPDATE "stages" SET "color" = 'emerald' WHERE "kind"::text = 'done';
    ALTER TABLE "stages" DROP COLUMN "kind";
  END IF;
END $$;
--> statement-breakpoint
DROP TYPE IF EXISTS "stage_kind";
