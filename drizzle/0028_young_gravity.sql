DROP INDEX IF EXISTS "chat_reactions_message_user_reaction_idx";--> statement-breakpoint
DELETE FROM "chat_reactions" AS older
USING "chat_reactions" AS newer
WHERE older."message_id" = newer."message_id"
  AND older."user_id" = newer."user_id"
  AND (
    older."created_at" < newer."created_at"
    OR (older."created_at" = newer."created_at" AND older."id" < newer."id")
  );--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "chat_reactions_message_user_idx" ON "chat_reactions" USING btree ("message_id","user_id");