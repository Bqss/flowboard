CREATE TABLE IF NOT EXISTS "checklist_item_groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"card_id" uuid NOT NULL,
	"stage_id" uuid NOT NULL,
	"parent_id" uuid,
	"template_group_id" uuid,
	"name" text NOT NULL,
	"requires_completion" boolean DEFAULT false NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "checklist_template_groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"stage_id" uuid NOT NULL,
	"parent_id" uuid,
	"name" text NOT NULL,
	"requires_completion" boolean DEFAULT false NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "checklist_items" ADD COLUMN "group_id" uuid;--> statement-breakpoint
ALTER TABLE "checklist_templates" ADD COLUMN "group_id" uuid;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "checklist_item_groups" ADD CONSTRAINT "checklist_item_groups_card_id_cards_id_fk" FOREIGN KEY ("card_id") REFERENCES "public"."cards"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "checklist_item_groups" ADD CONSTRAINT "checklist_item_groups_stage_id_stages_id_fk" FOREIGN KEY ("stage_id") REFERENCES "public"."stages"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "checklist_item_groups" ADD CONSTRAINT "checklist_item_groups_parent_id_checklist_item_groups_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."checklist_item_groups"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "checklist_item_groups" ADD CONSTRAINT "checklist_item_groups_template_group_id_checklist_template_groups_id_fk" FOREIGN KEY ("template_group_id") REFERENCES "public"."checklist_template_groups"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "checklist_template_groups" ADD CONSTRAINT "checklist_template_groups_stage_id_stages_id_fk" FOREIGN KEY ("stage_id") REFERENCES "public"."stages"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "checklist_template_groups" ADD CONSTRAINT "checklist_template_groups_parent_id_checklist_template_groups_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."checklist_template_groups"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "checklist_items" ADD CONSTRAINT "checklist_items_group_id_checklist_item_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."checklist_item_groups"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "checklist_templates" ADD CONSTRAINT "checklist_templates_group_id_checklist_template_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."checklist_template_groups"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
