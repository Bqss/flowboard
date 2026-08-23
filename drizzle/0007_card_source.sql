CREATE TYPE "public"."card_source" AS ENUM('manual', 'csv', 'mcp', 'estafet');--> statement-breakpoint
ALTER TABLE "cards" ADD COLUMN "source" "card_source" DEFAULT 'manual' NOT NULL;
