-- 0016 creates entity chat rows before the taskboard/workflow enum values exist.
-- Finalize their kind after 0017 has committed those enum values.
UPDATE chat_conversations
SET kind = 'taskboard'
WHERE context_type = 'taskboard'
  AND kind <> 'taskboard';

UPDATE chat_conversations
SET kind = 'workflow'
WHERE context_type = 'workflow'
  AND kind <> 'workflow';
