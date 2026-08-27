-- Remove default_workflow_id binding from wajom_connections.
-- Connections are now bound to workspace, not a single workflow.
-- WhatsApp scheduler resolves the active workspace connection at send time.

DROP INDEX IF EXISTS "wajom_connections_workspace_workflow_idx";--> statement-breakpoint
ALTER TABLE "wajom_connections" DROP CONSTRAINT IF EXISTS "wajom_connections_default_workflow_id_workflows_id_fk";--> statement-breakpoint
ALTER TABLE "wajom_connections" DROP COLUMN IF EXISTS "default_workflow_id";--> statement-breakpoint
