-- 0016 creates entity chat rows before the taskboard/workflow enum values exist.
-- Finalize their kind after 0017 has committed those enum values.
ALTER TABLE chat_conversations
DROP CONSTRAINT IF EXISTS chat_conversations_kind_check;

UPDATE chat_conversations
SET kind = 'taskboard'
WHERE context_type = 'taskboard'
  AND kind <> 'taskboard';

UPDATE chat_conversations
SET kind = 'workflow'
WHERE context_type = 'workflow'
  AND kind <> 'workflow';

ALTER TABLE chat_conversations
ADD CONSTRAINT chat_conversations_kind_check
CHECK (
  (kind = 'direct' AND direct_key IS NOT NULL AND name IS NULL)
  OR (kind IN ('group', 'taskboard', 'workflow') AND name IS NOT NULL AND direct_key IS NULL)
);
