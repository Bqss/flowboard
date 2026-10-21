CREATE TABLE IF NOT EXISTS "mobile_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"access_token_hash" text NOT NULL,
	"refresh_token_hash" text NOT NULL,
	"access_expires_at" timestamp with time zone NOT NULL,
	"refresh_expires_at" timestamp with time zone NOT NULL,
	"device_name" text,
	"platform" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_used_at" timestamp with time zone,
	"revoked_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "chat_conversations" DROP CONSTRAINT "chat_conversations_kind_check";--> statement-breakpoint
ALTER TABLE "chat_conversations" ADD COLUMN "group_id" uuid;--> statement-breakpoint
ALTER TABLE "chat_conversations" ADD COLUMN "archived_at" timestamp with time zone;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "mobile_sessions" ADD CONSTRAINT "mobile_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "mobile_sessions_access_token_hash_idx" ON "mobile_sessions" USING btree ("access_token_hash");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "mobile_sessions_refresh_token_hash_idx" ON "mobile_sessions" USING btree ("refresh_token_hash");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "mobile_sessions_user_idx" ON "mobile_sessions" USING btree ("user_id");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "chat_conversations" ADD CONSTRAINT "chat_conversations_group_id_workspace_member_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."workspace_member_groups"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "chat_conversations_group_id_idx" ON "chat_conversations" USING btree ("group_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chat_conversations_workspace_archived_idx" ON "chat_conversations" USING btree ("workspace_id","archived_at");--> statement-breakpoint
DO $$
DECLARE
  chat_row RECORD;
  group_row RECORD;
  matched_group_id uuid;
  candidate_name text;
  suffix_number integer;
BEGIN
  FOR chat_row IN
    SELECT c.*
    FROM chat_conversations c
    WHERE c.kind = 'group'
      AND c.group_id IS NULL
      AND c.archived_at IS NULL
  LOOP
    matched_group_id := NULL;

    SELECT g.id
    INTO matched_group_id
    FROM workspace_member_groups g
    WHERE g.workspace_id = chat_row.workspace_id
      AND g.name = chat_row.name
      AND NOT EXISTS (
        SELECT 1
        FROM chat_conversations linked
        WHERE linked.group_id = g.id
      )
      AND NOT EXISTS (
        SELECT 1
        FROM (
          SELECT gm.user_id
          FROM workspace_member_group_members gm
          WHERE gm.group_id = g.id
          UNION
          SELECT g.created_by_id
        ) expected
        WHERE NOT EXISTS (
          SELECT 1
          FROM chat_participants cp
          WHERE cp.conversation_id = chat_row.id
            AND cp.user_id = expected.user_id
            AND cp.left_at IS NULL
        )
      )
      AND NOT EXISTS (
        SELECT 1
        FROM chat_participants cp
        WHERE cp.conversation_id = chat_row.id
          AND cp.left_at IS NULL
          AND NOT EXISTS (
            SELECT 1
            FROM (
              SELECT gm.user_id
              FROM workspace_member_group_members gm
              WHERE gm.group_id = g.id
              UNION
              SELECT g.created_by_id
            ) expected
            WHERE expected.user_id = cp.user_id
          )
      )
    LIMIT 1;

    IF matched_group_id IS NOT NULL THEN
      INSERT INTO workspace_member_group_members (group_id, user_id)
      SELECT matched_group_id, cp.user_id
      FROM chat_participants cp
      WHERE cp.conversation_id = chat_row.id
        AND cp.left_at IS NULL
      ON CONFLICT (group_id, user_id) DO NOTHING;

      INSERT INTO workspace_member_group_members (group_id, user_id)
      VALUES (matched_group_id, chat_row.created_by_id)
      ON CONFLICT (group_id, user_id) DO NOTHING;

      UPDATE chat_conversations
      SET group_id = matched_group_id,
          name = (SELECT name FROM workspace_member_groups WHERE id = matched_group_id),
          updated_at = now()
      WHERE id = chat_row.id;
    END IF;
  END LOOP;

  FOR group_row IN
    SELECT g.*
    FROM workspace_member_groups g
    WHERE NOT EXISTS (
      SELECT 1
      FROM chat_conversations c
      WHERE c.group_id = g.id
    )
  LOOP
    INSERT INTO workspace_member_group_members (group_id, user_id)
    VALUES (group_row.id, group_row.created_by_id)
    ON CONFLICT (group_id, user_id) DO NOTHING;

    INSERT INTO chat_conversations (
      workspace_id,
      kind,
      group_id,
      name,
      created_by_id
    )
    VALUES (
      group_row.workspace_id,
      'group',
      group_row.id,
      group_row.name,
      group_row.created_by_id
    );

    INSERT INTO chat_participants (conversation_id, workspace_id, user_id, role)
    SELECT c.id,
           group_row.workspace_id,
           gm.user_id,
           CASE WHEN gm.user_id = group_row.created_by_id THEN 'admin'::chat_participant_role ELSE 'member'::chat_participant_role END
    FROM chat_conversations c
    INNER JOIN workspace_member_group_members gm ON gm.group_id = group_row.id
    WHERE c.group_id = group_row.id
    ON CONFLICT (conversation_id, user_id) DO NOTHING;
  END LOOP;
END $$;
--> statement-breakpoint
ALTER TABLE "chat_conversations" ADD CONSTRAINT "chat_conversations_kind_check" CHECK ((kind = 'direct' AND direct_key IS NOT NULL AND name IS NULL) OR (kind = 'group' AND name IS NOT NULL AND direct_key IS NULL));