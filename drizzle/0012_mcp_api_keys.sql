-- MCP API keys: per-workspace key for MCP tool access (replaces global FLOWBOARD_API_KEY)
CREATE TABLE "mcp_api_keys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"label" text NOT NULL,
	"key_hash" text NOT NULL,
	"key_prefix" text NOT NULL,
	"last_used_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "mcp_api_keys" ADD CONSTRAINT "mcp_api_keys_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE cascade;--> statement-breakpoint
CREATE UNIQUE INDEX "mcp_api_keys_key_hash_unique" ON "mcp_api_keys" ("key_hash");--> statement-breakpoint
CREATE INDEX "mcp_api_keys_workspace_idx" ON "mcp_api_keys" ("workspace_id");
