import { describe, expect, it } from 'bun:test';
import {
  isAutoBuzzTaskNotification,
  isChatBuzzMessageBody,
  shouldAutoBuzzIncomingMessage
} from '../app/lib/notifications/auto-buzz';

describe('chat buzz message detection', () => {
  it('recognises BUZZ messages sent from personal and group chats', () => {
    expect(isChatBuzzMessageBody('💥 BUZZ! Perhatian!')).toBe(true);
    expect(isChatBuzzMessageBody('💥 BUZZ! ')).toBe(true);
  });

  it('does not treat ordinary messages as BUZZ', () => {
    expect(isChatBuzzMessageBody('Hai, apa khabar?')).toBe(false);
    expect(isChatBuzzMessageBody('buzz saya tadi')).toBe(false);
    expect(isChatBuzzMessageBody('')).toBe(false);
  });
});

describe('automatic buzz policy', () => {
  it('buzzes incoming chat messages, but not the current user’s own messages', () => {
    expect(shouldAutoBuzzIncomingMessage('sender-1', 'recipient-1')).toBe(true);
    expect(shouldAutoBuzzIncomingMessage('recipient-1', 'recipient-1')).toBe(false);
    expect(shouldAutoBuzzIncomingMessage(null, 'recipient-1')).toBe(false);
    expect(shouldAutoBuzzIncomingMessage('sender-1', null)).toBe(false);
  });

  it('buzzes all task notification types requested by the app', () => {
    for (const type of [
      'task_assigned',
      'task_comment',
      'task_mention',
      'task_due_soon',
      'task_overdue'
    ] as const) {
      expect(isAutoBuzzTaskNotification(type)).toBe(true);
    }

    expect(isAutoBuzzTaskNotification('chat_message')).toBe(false);
    expect(isAutoBuzzTaskNotification('workflow_action')).toBe(false);
  });
});
