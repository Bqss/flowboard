CREATE TYPE "public"."card_source" AS ENUM('manual', 'csv', 'mcp', 'estafet');--> statement-breakpoint
CREATE TYPE "public"."checklist_action_kind" AS ENUM('none', 'send', 'followup');--> statement-breakpoint
CREATE TYPE "public"."notification_type" AS ENUM('wa_failed', 'customer_replied', 'card_overdue', 'handover', 'workflow_action');--> statement-breakpoint
CREATE TYPE "public"."plan_interval" AS ENUM('monthly', 'yearly');--> statement-breakpoint
CREATE TYPE "public"."subscription_status" AS ENUM('trial', 'active', 'past_due', 'canceled');--> statement-breakpoint
CREATE TYPE "public"."voucher_type" AS ENUM('percent', 'fixed', 'trial_days');--> statement-breakpoint
CREATE TYPE "public"."whatsapp_job_status" AS ENUM('pending', 'queued', 'sent', 'delivered', 'read', 'failed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."workspace_role" AS ENUM('owner', 'member');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "cards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workflow_id" uuid NOT NULL,
	"stage_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"product" text,
	"tag" text,
	"assignee_id" uuid,
	"stage_entered_at" timestamp with time zone DEFAULT now() NOT NULL,
	"wa_followups_stopped" boolean DEFAULT false NOT NULL,
	"handover_reason" text,
	"handed_over_at" timestamp with time zone,
	"wa_error_flag" boolean DEFAULT false NOT NULL,
	"source" "card_source" DEFAULT 'manual' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "checklist_actions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"template_id" uuid NOT NULL,
	"kind" "checklist_action_kind" DEFAULT 'none' NOT NULL,
	"message_template" text,
	"delay_minutes" integer DEFAULT 0 NOT NULL,
	"followup_if_no_reply" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "checklist_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"card_id" uuid NOT NULL,
	"stage_id" uuid NOT NULL,
	"template_id" uuid,
	"label" text NOT NULL,
	"required" boolean DEFAULT true NOT NULL,
	"done" boolean DEFAULT false NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "checklist_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"stage_id" uuid NOT NULL,
	"label" text NOT NULL,
	"required" boolean DEFAULT true NOT NULL,
	"deadline_hours" integer,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "customers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"name" text NOT NULL,
	"wa" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "inbound_idempotency_keys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"endpoint_id" uuid NOT NULL,
	"key" text NOT NULL,
	"status" text DEFAULT 'processing' NOT NULL,
	"response" jsonb,
	"status_code" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "inbound_request_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"endpoint_id" uuid NOT NULL,
	"request_id" text NOT NULL,
	"source" text,
	"payload_summary" jsonb,
	"success" boolean NOT NULL,
	"status_code" integer NOT NULL,
	"card_id" uuid,
	"customer_id" uuid,
	"idempotent_replay" boolean DEFAULT false NOT NULL,
	"error_code" text,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
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
);
--> statement-breakpoint
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
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "mcp_api_key_workflows" (
	"api_key_id" uuid NOT NULL,
	"workflow_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "mcp_api_keys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"label" text NOT NULL,
	"key_hash" text NOT NULL,
	"key_prefix" text NOT NULL,
	"scope_mode" text DEFAULT 'all' NOT NULL,
	"enabled_tools" text[] DEFAULT '{}'::text[] NOT NULL,
	"last_used_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "mcp_api_keys_key_hash_unique" UNIQUE("key_hash")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "notification_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"wa_failed" boolean DEFAULT true NOT NULL,
	"customer_replied" boolean DEFAULT true NOT NULL,
	"card_overdue" boolean DEFAULT true NOT NULL,
	"handover" boolean DEFAULT true NOT NULL,
	"email_wa_failed" boolean DEFAULT false NOT NULL,
	"email_customer_replied" boolean DEFAULT false NOT NULL,
	"email_card_overdue" boolean DEFAULT true NOT NULL,
	"email_handover" boolean DEFAULT true NOT NULL,
	"email_digest" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"card_id" uuid,
	"type" "notification_type" NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "onboarding_state" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"completed_challenges" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"seen_tours" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"price_cents" integer DEFAULT 0 NOT NULL,
	"currency" text DEFAULT 'MYR' NOT NULL,
	"interval" "plan_interval" DEFAULT 'monthly' NOT NULL,
	"seats_limit" integer DEFAULT 0 NOT NULL,
	"workflows_limit" integer DEFAULT 0 NOT NULL,
	"wa_messages_per_month" integer DEFAULT 0 NOT NULL,
	"trial_days" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "plans_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "stages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workflow_id" uuid NOT NULL,
	"name" text NOT NULL,
	"color" text DEFAULT 'indigo' NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"on_reply_notify" boolean DEFAULT false NOT NULL,
	"overdue_reminder_hours" integer,
	"auto_move_on_complete" boolean DEFAULT false NOT NULL,
	"next_workflow_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"plan_id" uuid NOT NULL,
	"status" "subscription_status" DEFAULT 'trial' NOT NULL,
	"trial_ends_at" timestamp with time zone,
	"current_period_start" timestamp with time zone,
	"current_period_end" timestamp with time zone,
	"canceled_at" timestamp with time zone,
	"grace_ends_at" timestamp with time zone,
	"chip_purchase_id" text,
	"chip_recurring_token" text,
	"chip_client_email" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "subscriptions_workspace_id_unique" UNIQUE("workspace_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"password_hash" text,
	"provider" text,
	"provider_id" text,
	"phone" text,
	"avatar_url" text,
	"active_workspace_id" uuid,
	"platform_admin" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "voucher_redemptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"voucher_id" uuid NOT NULL,
	"workspace_id" uuid NOT NULL,
	"subscription_id" uuid,
	"redeemed_by_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "vouchers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"type" "voucher_type" NOT NULL,
	"value" integer NOT NULL,
	"duration_cycles" integer,
	"plan_id" uuid,
	"max_redemptions" integer,
	"max_redemptions_per_workspace" integer DEFAULT 1 NOT NULL,
	"redeemed_count" integer DEFAULT 0 NOT NULL,
	"expires_at" timestamp with time zone,
	"active" boolean DEFAULT true NOT NULL,
	"note" text,
	"created_by_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "vouchers_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "wajom_connections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"name" text NOT NULL,
	"instance_id" text NOT NULL,
	"country_code" text DEFAULT '60' NOT NULL,
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
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "wajom_connections_connector_token_hash_unique" UNIQUE("connector_token_hash")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "whatsapp_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"connection_id" uuid,
	"card_id" uuid NOT NULL,
	"checklist_item_id" uuid,
	"template_id" uuid,
	"to_wa" text NOT NULL,
	"message_body" text NOT NULL,
	"scheduled_at" timestamp with time zone NOT NULL,
	"status" "whatsapp_job_status" DEFAULT 'pending' NOT NULL,
	"provider_message_id" text,
	"provider_status" text,
	"attempts" integer DEFAULT 0 NOT NULL,
	"last_attempt_at" timestamp with time zone,
	"sent_at" timestamp with time zone,
	"delivered_at" timestamp with time zone,
	"read_at" timestamp with time zone,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "workflow_inbound_endpoints" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workflow_id" uuid NOT NULL,
	"workspace_id" uuid NOT NULL,
	"api_key_hash" text NOT NULL,
	"api_key_prefix" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"revoked_at" timestamp with time zone,
	"last_used_at" timestamp with time zone,
	"last_request_at" timestamp with time zone,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "workflow_inbound_endpoints_api_key_hash_unique" UNIQUE("api_key_hash")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "workflows" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"owner_id" uuid NOT NULL,
	"default_assignee_id" uuid,
	"default_assignee_ids" text[] DEFAULT '{}'::text[] NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "workspace_invites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"email" text NOT NULL,
	"role" "workspace_role" DEFAULT 'member' NOT NULL,
	"token" text NOT NULL,
	"invited_by_id" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"accepted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "workspace_invites_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "workspace_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "workspace_role" DEFAULT 'member' NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "workspaces" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "workspaces_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cards" ADD CONSTRAINT "cards_workflow_id_workflows_id_fk" FOREIGN KEY ("workflow_id") REFERENCES "public"."workflows"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cards" ADD CONSTRAINT "cards_stage_id_stages_id_fk" FOREIGN KEY ("stage_id") REFERENCES "public"."stages"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cards" ADD CONSTRAINT "cards_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cards" ADD CONSTRAINT "cards_assignee_id_users_id_fk" FOREIGN KEY ("assignee_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "checklist_actions" ADD CONSTRAINT "checklist_actions_template_id_checklist_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."checklist_templates"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "checklist_items" ADD CONSTRAINT "checklist_items_card_id_cards_id_fk" FOREIGN KEY ("card_id") REFERENCES "public"."cards"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "checklist_items" ADD CONSTRAINT "checklist_items_stage_id_stages_id_fk" FOREIGN KEY ("stage_id") REFERENCES "public"."stages"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "checklist_items" ADD CONSTRAINT "checklist_items_template_id_checklist_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."checklist_templates"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "checklist_templates" ADD CONSTRAINT "checklist_templates_stage_id_stages_id_fk" FOREIGN KEY ("stage_id") REFERENCES "public"."stages"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "customers" ADD CONSTRAINT "customers_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "inbound_idempotency_keys" ADD CONSTRAINT "inbound_idempotency_keys_endpoint_id_workflow_inbound_endpoints_id_fk" FOREIGN KEY ("endpoint_id") REFERENCES "public"."workflow_inbound_endpoints"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "inbound_request_logs" ADD CONSTRAINT "inbound_request_logs_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "inbound_request_logs" ADD CONSTRAINT "inbound_request_logs_endpoint_id_workflow_inbound_endpoints_id_fk" FOREIGN KEY ("endpoint_id") REFERENCES "public"."workflow_inbound_endpoints"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "inbound_request_logs" ADD CONSTRAINT "inbound_request_logs_card_id_cards_id_fk" FOREIGN KEY ("card_id") REFERENCES "public"."cards"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "inbound_request_logs" ADD CONSTRAINT "inbound_request_logs_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "integration_audit_logs" ADD CONSTRAINT "integration_audit_logs_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "integration_audit_logs" ADD CONSTRAINT "integration_audit_logs_connection_id_wajom_connections_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."wajom_connections"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "integration_idempotency_keys" ADD CONSTRAINT "integration_idempotency_keys_connection_id_wajom_connections_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."wajom_connections"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "mcp_api_key_workflows" ADD CONSTRAINT "mcp_api_key_workflows_api_key_id_mcp_api_keys_id_fk" FOREIGN KEY ("api_key_id") REFERENCES "public"."mcp_api_keys"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "mcp_api_key_workflows" ADD CONSTRAINT "mcp_api_key_workflows_workflow_id_workflows_id_fk" FOREIGN KEY ("workflow_id") REFERENCES "public"."workflows"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "mcp_api_keys" ADD CONSTRAINT "mcp_api_keys_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "notification_settings" ADD CONSTRAINT "notification_settings_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "notification_settings" ADD CONSTRAINT "notification_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "notifications" ADD CONSTRAINT "notifications_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "notifications" ADD CONSTRAINT "notifications_card_id_cards_id_fk" FOREIGN KEY ("card_id") REFERENCES "public"."cards"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "onboarding_state" ADD CONSTRAINT "onboarding_state_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "stages" ADD CONSTRAINT "stages_workflow_id_workflows_id_fk" FOREIGN KEY ("workflow_id") REFERENCES "public"."workflows"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "stages" ADD CONSTRAINT "stages_next_workflow_id_workflows_id_fk" FOREIGN KEY ("next_workflow_id") REFERENCES "public"."workflows"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_plan_id_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "voucher_redemptions" ADD CONSTRAINT "voucher_redemptions_voucher_id_vouchers_id_fk" FOREIGN KEY ("voucher_id") REFERENCES "public"."vouchers"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "voucher_redemptions" ADD CONSTRAINT "voucher_redemptions_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "voucher_redemptions" ADD CONSTRAINT "voucher_redemptions_subscription_id_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscriptions"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "voucher_redemptions" ADD CONSTRAINT "voucher_redemptions_redeemed_by_id_users_id_fk" FOREIGN KEY ("redeemed_by_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "vouchers" ADD CONSTRAINT "vouchers_plan_id_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "vouchers" ADD CONSTRAINT "vouchers_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "wajom_connections" ADD CONSTRAINT "wajom_connections_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "whatsapp_jobs" ADD CONSTRAINT "whatsapp_jobs_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "whatsapp_jobs" ADD CONSTRAINT "whatsapp_jobs_connection_id_wajom_connections_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."wajom_connections"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "whatsapp_jobs" ADD CONSTRAINT "whatsapp_jobs_card_id_cards_id_fk" FOREIGN KEY ("card_id") REFERENCES "public"."cards"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "whatsapp_jobs" ADD CONSTRAINT "whatsapp_jobs_checklist_item_id_checklist_items_id_fk" FOREIGN KEY ("checklist_item_id") REFERENCES "public"."checklist_items"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "whatsapp_jobs" ADD CONSTRAINT "whatsapp_jobs_template_id_checklist_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."checklist_templates"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "workflow_inbound_endpoints" ADD CONSTRAINT "workflow_inbound_endpoints_workflow_id_workflows_id_fk" FOREIGN KEY ("workflow_id") REFERENCES "public"."workflows"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "workflow_inbound_endpoints" ADD CONSTRAINT "workflow_inbound_endpoints_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "workflows" ADD CONSTRAINT "workflows_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "workflows" ADD CONSTRAINT "workflows_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "workflows" ADD CONSTRAINT "workflows_default_assignee_id_users_id_fk" FOREIGN KEY ("default_assignee_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "workspace_invites" ADD CONSTRAINT "workspace_invites_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "workspace_invites" ADD CONSTRAINT "workspace_invites_invited_by_id_users_id_fk" FOREIGN KEY ("invited_by_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "checklist_actions_template_idx" ON "checklist_actions" USING btree ("template_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "customers_workspace_wa_idx" ON "customers" USING btree ("workspace_id","wa");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "inbound_idempotency_endpoint_key_idx" ON "inbound_idempotency_keys" USING btree ("endpoint_id","key");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "inbound_request_logs_endpoint_created_idx" ON "inbound_request_logs" USING btree ("endpoint_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "inbound_request_logs_workspace_created_idx" ON "inbound_request_logs" USING btree ("workspace_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "integration_audit_logs_workspace_created_idx" ON "integration_audit_logs" USING btree ("workspace_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "integration_audit_logs_connection_created_idx" ON "integration_audit_logs" USING btree ("connection_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "integration_idempotency_connection_key_idx" ON "integration_idempotency_keys" USING btree ("connection_id","key");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "mcp_api_key_workflows_key_workflow_idx" ON "mcp_api_key_workflows" USING btree ("api_key_id","workflow_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "mcp_api_key_workflows_workflow_idx" ON "mcp_api_key_workflows" USING btree ("workflow_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "mcp_api_keys_workspace_idx" ON "mcp_api_keys" USING btree ("workspace_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "notification_settings_workspace_user_idx" ON "notification_settings" USING btree ("workspace_id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "onboarding_state_user_idx" ON "onboarding_state" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "plans_active_sort_idx" ON "plans" USING btree ("active","sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "stages_workflow_position_idx" ON "stages" USING btree ("workflow_id","position");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "subscriptions_status_idx" ON "subscriptions" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "users_provider_provider_id_idx" ON "users" USING btree ("provider","provider_id") WHERE provider IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "voucher_redemptions_voucher_workspace_idx" ON "voucher_redemptions" USING btree ("voucher_id","workspace_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "voucher_redemptions_workspace_idx" ON "voucher_redemptions" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "vouchers_active_idx" ON "vouchers" USING btree ("active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "wajom_connections_workspace_idx" ON "wajom_connections" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "whatsapp_jobs_due_idx" ON "whatsapp_jobs" USING btree ("status","scheduled_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "whatsapp_jobs_connection_idx" ON "whatsapp_jobs" USING btree ("connection_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "whatsapp_jobs_provider_message_idx" ON "whatsapp_jobs" USING btree ("provider_message_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "workflow_inbound_endpoints_workflow_idx" ON "workflow_inbound_endpoints" USING btree ("workflow_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "workflow_inbound_endpoints_workspace_idx" ON "workflow_inbound_endpoints" USING btree ("workspace_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "workspace_members_workspace_user_idx" ON "workspace_members" USING btree ("workspace_id","user_id");