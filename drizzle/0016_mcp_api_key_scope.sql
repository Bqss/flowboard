-- Add description to workflows (used for MCP agent prompt context).
ALTER TABLE "workflows" ADD COLUMN IF NOT EXISTS "description" text;--> statement-breakpoint

-- Add scope_mode and enabled_tools to mcp_api_keys.
ALTER TABLE "mcp_api_keys" ADD COLUMN IF NOT EXISTS "scope_mode" text NOT NULL DEFAULT 'all';--> statement-breakpoint
ALTER TABLE "mcp_api_keys" ADD COLUMN IF NOT EXISTS "enabled_tools" text[] NOT NULL DEFAULT '{}'::text[];--> statement-breakpoint

-- Backfill existing keys: all scope + all 10 tools.
UPDATE "mcp_api_keys"
SET "scope_mode" = 'all',
    "enabled_tools" = ARRAY[
      'create_card',
      'notify_assignee',
      'move_stage',
      'stop_followups',
      'toggle_checklist_item',
      'list_workflows',
      'get_workflow_stages',
      'get_card',
      'find_card_by_wa',
      'list_cards'
    ]::text[]
WHERE "enabled_tools" = '{}'::text[];--> statement-breakpoint

-- Mapping table for selected-workflow scope.
CREATE TABLE IF NOT EXISTS "mcp_api_key_workflows" (
	"api_key_id" uuid NOT NULL,
	"workflow_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "mcp_api_key_workflows" ADD CONSTRAINT "mcp_api_key_workflows_api_key_id_mcp_api_keys_id_fk" FOREIGN KEY ("api_key_id") REFERENCES "mcp_api_keys"("id") ON DELETE cascade;--> statement-breakpoint
ALTER TABLE "mcp_api_key_workflows" ADD CONSTRAINT "mcp_api_key_workflows_workflow_id_workflows_id_fk" FOREIGN KEY ("workflow_id") REFERENCES "workflows"("id") ON DELETE cascade;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "mcp_api_key_workflows_key_workflow_idx" ON "mcp_api_key_workflows" ("api_key_id", "workflow_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "mcp_api_key_workflows_workflow_idx" ON "mcp_api_key_workflows" ("workflow_id");
