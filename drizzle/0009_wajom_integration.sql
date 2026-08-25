ALTER TYPE "public"."whatsapp_job_status" ADD VALUE IF NOT EXISTS 'queued';--> statement-breakpoint
ALTER TYPE "public"."whatsapp_job_status" ADD VALUE IF NOT EXISTS 'delivered';--> statement-breakpoint
ALTER TYPE "public"."whatsapp_job_status" ADD VALUE IF NOT EXISTS 'read';--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE IF NOT EXISTS 'handover';--> statement-breakpoint
ALTER TABLE "cards" ADD COLUMN IF NOT EXISTS "handover_reason" text;--> statement-breakpoint
ALTER TABLE "cards" ADD COLUMN IF NOT EXISTS "handed_over_at" timestamp with time zone;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "wajom_connections" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "workspace_id" uuid NOT NULL,
  "default_workflow_id" uuid,
  "name" text NOT NULL,
  "instance_id" text NOT NULL,
  "country_code" text DEFAULT '62' NOT NULL,
  "send_endpoint" text NOT NULL,
  "health_endpoint" text,
  "send_api_key_encrypted" text,
  "connector_token_hash" text NOT NULL,
  "connector_token_prefix" text NOT NULL,
  "enabled_tools" text[] DEFAULT ARRAY['get_onboarding_status', 'register_customer', 'complete_onboarding_step', 'move_customer_stage', 'handover_to_staff']::text[] NOT NULL,
  "enabled" boolean DEFAULT true NOT NULL,
  "revoked_at" timestamp with time zone,
  "last_used_at" timestamp with time zone,
  "last_checked_at" timestamp with time zone,
  "last_error" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "integration_audit_logs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "workspace_id" uuid NOT NULL,
  "connection_id" uuid,
  "request_id" text NOT NULL,
  "tool" text NOT NULL,
  "method" text NOT NULL,
  "input_keys" text[] DEFAULT ARRAY[]::text[] NOT NULL,
  "success" boolean NOT NULL,
  "status_code" integer NOT NULL,
  "latency_ms" integer NOT NULL,
  "result_summary" jsonb,
  "error_code" text,
  "error_message" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "integration_idempotency_keys" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "connection_id" uuid NOT NULL,
  "key" text NOT NULL,
  "tool" text NOT NULL,
  "status" text DEFAULT 'processing' NOT NULL,
  "response" jsonb,
  "status_code" integer,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "whatsapp_jobs" ADD COLUMN IF NOT EXISTS "connection_id" uuid;--> statement-breakpoint
ALTER TABLE "whatsapp_jobs" ADD COLUMN IF NOT EXISTS "provider_message_id" text;--> statement-breakpoint
ALTER TABLE "whatsapp_jobs" ADD COLUMN IF NOT EXISTS "provider_status" text;--> statement-breakpoint
ALTER TABLE "whatsapp_jobs" ADD COLUMN IF NOT EXISTS "attempts" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "whatsapp_jobs" ADD COLUMN IF NOT EXISTS "last_attempt_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "whatsapp_jobs" ADD COLUMN IF NOT EXISTS "sent_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "whatsapp_jobs" ADD COLUMN IF NOT EXISTS "delivered_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "whatsapp_jobs" ADD COLUMN IF NOT EXISTS "read_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "whatsapp_jobs" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "wajom_connections" ADD CONSTRAINT "wajom_connections_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "wajom_connections" ADD CONSTRAINT "wajom_connections_default_workflow_id_workflows_id_fk" FOREIGN KEY ("default_workflow_id") REFERENCES "public"."workflows"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "integration_audit_logs" ADD CONSTRAINT "integration_audit_logs_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "integration_audit_logs" ADD CONSTRAINT "integration_audit_logs_connection_id_wajom_connections_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."wajom_connections"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "integration_idempotency_keys" ADD CONSTRAINT "integration_idempotency_keys_connection_id_wajom_connections_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."wajom_connections"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "whatsapp_jobs" ADD CONSTRAINT "whatsapp_jobs_connection_id_wajom_connections_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."wajom_connections"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "wajom_connections" ADD CONSTRAINT "wajom_connections_connector_token_hash_unique" UNIQUE ("connector_token_hash");
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "wajom_connections_workspace_idx" ON "wajom_connections" USING btree ("workspace_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "wajom_connections_workspace_workflow_idx" ON "wajom_connections" USING btree ("workspace_id", "default_workflow_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "integration_audit_logs_workspace_created_idx" ON "integration_audit_logs" USING btree ("workspace_id", "created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "integration_audit_logs_connection_created_idx" ON "integration_audit_logs" USING btree ("connection_id", "created_at");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "integration_idempotency_connection_key_idx" ON "integration_idempotency_keys" USING btree ("connection_id", "key");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "whatsapp_jobs_due_idx" ON "whatsapp_jobs" USING btree ("status", "scheduled_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "whatsapp_jobs_connection_idx" ON "whatsapp_jobs" USING btree ("connection_id", "status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "whatsapp_jobs_provider_message_idx" ON "whatsapp_jobs" USING btree ("provider_message_id");