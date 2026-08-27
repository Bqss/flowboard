-- Stage auto-advance on checklist complete (missing from earlier migrations)
ALTER TABLE "stages" ADD COLUMN IF NOT EXISTS "auto_move_on_complete" boolean DEFAULT false NOT NULL;
