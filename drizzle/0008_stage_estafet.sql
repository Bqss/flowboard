ALTER TABLE "stages" ADD COLUMN "next_workflow_id" uuid;--> statement-breakpoint
ALTER TABLE "stages" ADD CONSTRAINT "stages_next_workflow_id_workflows_id_fk" FOREIGN KEY ("next_workflow_id") REFERENCES "public"."workflows"("id") ON DELETE set null ON UPDATE no action;
