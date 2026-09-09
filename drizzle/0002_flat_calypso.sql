CREATE TABLE IF NOT EXISTS "direct_conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"member_one_id" uuid NOT NULL,
	"member_two_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "direct_conversations_member_order_check" CHECK ("direct_conversations"."member_one_id" < "direct_conversations"."member_two_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "direct_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"sender_id" uuid NOT NULL,
	"body" text NOT NULL,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "direct_conversations" ADD CONSTRAINT "direct_conversations_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "direct_conversations" ADD CONSTRAINT "direct_conversations_member_one_id_users_id_fk" FOREIGN KEY ("member_one_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "direct_conversations" ADD CONSTRAINT "direct_conversations_member_two_id_users_id_fk" FOREIGN KEY ("member_two_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "direct_messages" ADD CONSTRAINT "direct_messages_conversation_id_direct_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."direct_conversations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "direct_messages" ADD CONSTRAINT "direct_messages_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "direct_conversations_workspace_members_idx" ON "direct_conversations" USING btree ("workspace_id","member_one_id","member_two_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "direct_conversations_workspace_member_one_idx" ON "direct_conversations" USING btree ("workspace_id","member_one_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "direct_conversations_workspace_member_two_idx" ON "direct_conversations" USING btree ("workspace_id","member_two_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "direct_messages_conversation_created_idx" ON "direct_messages" USING btree ("conversation_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "direct_messages_conversation_sender_read_idx" ON "direct_messages" USING btree ("conversation_id","sender_id","read_at");