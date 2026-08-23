CREATE TABLE IF NOT EXISTS "customers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"name" text NOT NULL,
	"wa" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "cards" ADD COLUMN IF NOT EXISTS "customer_id" uuid;
--> statement-breakpoint
INSERT INTO "customers" ("workspace_id", "name", "wa")
SELECT w."workspace_id", c."customer_name", 'legacy-' || c."id"::text
FROM "cards" c
INNER JOIN "workflows" w ON w."id" = c."workflow_id"
WHERE c."customer_id" IS NULL;
--> statement-breakpoint
UPDATE "cards"
SET "customer_id" = sub."customer_id"
FROM (
  SELECT c."id" AS "card_id", cu."id" AS "customer_id"
  FROM "cards" c
  INNER JOIN "workflows" w ON w."id" = c."workflow_id"
  INNER JOIN "customers" cu ON cu."workspace_id" = w."workspace_id" AND cu."wa" = 'legacy-' || c."id"::text
  WHERE c."customer_id" IS NULL
) AS sub
WHERE "cards"."id" = sub."card_id";
--> statement-breakpoint
ALTER TABLE "cards" DROP COLUMN IF EXISTS "customer_name";
--> statement-breakpoint
ALTER TABLE "cards" ALTER COLUMN "customer_id" SET NOT NULL;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "customers" ADD CONSTRAINT "customers_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
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
CREATE UNIQUE INDEX IF NOT EXISTS "customers_workspace_wa_idx" ON "customers" USING btree ("workspace_id","wa");
