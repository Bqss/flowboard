DO $$
DECLARE
  board_row RECORD;
  wf_row RECORD;
  dept_row RECORD;
  new_conv_id uuid;
BEGIN
  -- 1. Ensure existing group chats have context_type = 'group'
  UPDATE chat_conversations
  SET context_type = 'group'
  WHERE kind = 'group'
    AND group_id IS NOT NULL
    AND context_type IS NULL;


  -- 2. Backfill task boards: create chat conversation and participants for every board
  FOR board_row IN
    SELECT tb.*
    FROM task_boards tb
    WHERE NOT EXISTS (
      SELECT 1
      FROM chat_conversations c
      WHERE c.context_type = 'taskboard'
        AND c.context_id = tb.id
    )
  LOOP
    INSERT INTO chat_conversations (
      workspace_id,
      kind,
      context_type,
      context_id,
      group_id,
      name,
      created_by_id
    )
    VALUES (
      board_row.workspace_id,
      'group',
      'taskboard',
      board_row.id,
      board_row.workspace_member_group_id,
      board_row.name,
      board_row.owner_id
    )
    RETURNING id INTO new_conv_id;

    IF board_row.workspace_member_group_id IS NOT NULL THEN
      INSERT INTO chat_participants (conversation_id, workspace_id, user_id, role)
      SELECT new_conv_id,
             board_row.workspace_id,
             u.user_id,
             CASE WHEN u.user_id = board_row.owner_id THEN 'admin'::chat_participant_role ELSE 'member'::chat_participant_role END
      FROM (
        SELECT gm.user_id
        FROM workspace_member_group_members gm
        WHERE gm.group_id = board_row.workspace_member_group_id
        UNION
        SELECT board_row.owner_id AS user_id
      ) u
      ON CONFLICT (conversation_id, user_id) DO NOTHING;
    ELSE
      INSERT INTO chat_participants (conversation_id, workspace_id, user_id, role)
      SELECT new_conv_id,
             board_row.workspace_id,
             wm.user_id,
             CASE WHEN wm.user_id = board_row.owner_id THEN 'admin'::chat_participant_role ELSE 'member'::chat_participant_role END
      FROM workspace_members wm
      WHERE wm.workspace_id = board_row.workspace_id
      ON CONFLICT (conversation_id, user_id) DO NOTHING;
    END IF;
  END LOOP;

  -- 3. Backfill workflows: create chat conversation and participants for every workflow
  FOR wf_row IN
    SELECT wf.*
    FROM workflows wf
    WHERE NOT EXISTS (
      SELECT 1
      FROM chat_conversations c
      WHERE c.context_type = 'workflow'
        AND c.context_id = wf.id
    )
  LOOP
    INSERT INTO chat_conversations (
      workspace_id,
      kind,
      context_type,
      context_id,
      group_id,
      name,
      created_by_id
    )
    VALUES (
      wf_row.workspace_id,
      'group',
      'workflow',
      wf_row.id,
      wf_row.workspace_member_group_id,
      wf_row.name,
      wf_row.owner_id
    )
    RETURNING id INTO new_conv_id;

    IF wf_row.workspace_member_group_id IS NOT NULL THEN
      INSERT INTO chat_participants (conversation_id, workspace_id, user_id, role)
      SELECT new_conv_id,
             wf_row.workspace_id,
             u.user_id,
             CASE WHEN u.user_id = wf_row.owner_id THEN 'admin'::chat_participant_role ELSE 'member'::chat_participant_role END
      FROM (
        SELECT gm.user_id
        FROM workspace_member_group_members gm
        WHERE gm.group_id = wf_row.workspace_member_group_id
        UNION
        SELECT wf_row.owner_id AS user_id
      ) u
      ON CONFLICT (conversation_id, user_id) DO NOTHING;
    ELSE
      INSERT INTO chat_participants (conversation_id, workspace_id, user_id, role)
      SELECT new_conv_id,
             wf_row.workspace_id,
             wm.user_id,
             CASE WHEN wm.user_id = wf_row.owner_id THEN 'admin'::chat_participant_role ELSE 'member'::chat_participant_role END
      FROM workspace_members wm
      WHERE wm.workspace_id = wf_row.workspace_id
      ON CONFLICT (conversation_id, user_id) DO NOTHING;
    END IF;
  END LOOP;

  -- 4. Backfill departments (workspace_member_groups): ensure every member group has a chat conversation
  FOR dept_row IN
    SELECT g.*
    FROM workspace_member_groups g
    WHERE NOT EXISTS (
      SELECT 1
      FROM chat_conversations c
      WHERE c.group_id = g.id
        AND c.kind = 'group'
    )
  LOOP
    INSERT INTO chat_conversations (
      workspace_id,
      kind,
      context_type,
      group_id,
      name,
      created_by_id
    )
    VALUES (
      dept_row.workspace_id,
      'group',
      'group',
      dept_row.id,
      dept_row.name,
      dept_row.created_by_id
    )
    RETURNING id INTO new_conv_id;

    INSERT INTO chat_participants (conversation_id, workspace_id, user_id, role)
    SELECT new_conv_id,
           dept_row.workspace_id,
           u.user_id,
           CASE WHEN u.user_id = dept_row.created_by_id THEN 'admin'::chat_participant_role ELSE 'member'::chat_participant_role END
    FROM (
      SELECT gm.user_id
      FROM workspace_member_group_members gm
      WHERE gm.group_id = dept_row.id
      UNION
      SELECT dept_row.created_by_id AS user_id
    ) u
    ON CONFLICT (conversation_id, user_id) DO NOTHING;
  END LOOP;
END $$;
