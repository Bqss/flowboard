ALTER TABLE "google_sheets_connections" ALTER COLUMN "workflow_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "google_sheets_connections" ALTER COLUMN "spreadsheet_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "google_sheets_connections" ALTER COLUMN "spreadsheet_name" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "google_sheets_connections" ALTER COLUMN "column_mapping" DROP NOT NULL;