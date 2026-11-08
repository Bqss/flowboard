import { describe, expect, test } from 'bun:test';

describe('Chat Message Actions', () => {
  const THREE_HOURS_MS = 3 * 60 * 60 * 1000;

  test('edit time window: allowed within 3 hours, rejected after 3 hours', () => {
    const canEditMessage = (createdAt: Date, now: number = Date.now()) => {
      const elapsed = now - createdAt.getTime();
      return elapsed <= THREE_HOURS_MS;
    };

    const now = Date.now();
    // 5 minutes ago -> allowed
    const fiveMinutesAgo = new Date(now - 5 * 60 * 1000);
    expect(canEditMessage(fiveMinutesAgo, now)).toBe(true);

    // 2 hours 59 minutes ago -> allowed
    const almostThreeHours = new Date(now - (3 * 60 - 1) * 60 * 1000);
    expect(canEditMessage(almostThreeHours, now)).toBe(true);

    // Exactly 3 hours ago -> allowed
    const exactlyThreeHours = new Date(now - 3 * 60 * 60 * 1000);
    expect(canEditMessage(exactlyThreeHours, now)).toBe(true);

    // 3 hours and 1 second ago -> rejected
    const threeHoursAndOneSec = new Date(now - (3 * 60 * 60 * 1000 + 1000));
    expect(canEditMessage(threeHoursAndOneSec, now)).toBe(false);

    // Yesterday -> rejected
    const yesterday = new Date(now - 24 * 60 * 60 * 1000);
    expect(canEditMessage(yesterday, now)).toBe(false);
  });

  test('pin toggle logic: toggles between pinned and unpinned timestamp', () => {
    const togglePinState = (
      currentPinnedAt: Date | null,
      userId: string
    ): { pinnedAt: Date | null; pinnedById: string | null } => {
      const isPinned = Boolean(currentPinnedAt);
      return {
        pinnedAt: isPinned ? null : new Date(),
        pinnedById: isPinned ? null : userId
      };
    };

    // Initial state: not pinned
    const pinned = togglePinState(null, 'user-1');
    expect(pinned.pinnedAt).toBeInstanceOf(Date);
    expect(pinned.pinnedById).toBe('user-1');

    // Unpin: toggles back to null
    const unpinned = togglePinState(pinned.pinnedAt, 'user-1');
    expect(unpinned.pinnedAt).toBeNull();
    expect(unpinned.pinnedById).toBeNull();
  });

  test('forward message payload construction clones content and attachments for target rooms', () => {
    const sourceMessage = {
      id: 'msg-1',
      body: 'Important update for team',
      attachments: [
        { id: 'att-1', fileName: 'doc.pdf', filePath: '/uploads/doc.pdf', fileType: 'application/pdf', fileSize: 1024 }
      ]
    };

    const buildForwardPayloads = (
      message: typeof sourceMessage,
      targetConversationIds: string[],
      senderId: string
    ) => {
      return targetConversationIds.map((targetConvId) => ({
        conversationId: targetConvId,
        senderId,
        body: message.body,
        attachments: message.attachments.map((att) => ({
          ...att,
          conversationId: targetConvId
        }))
      }));
    };

    const targets = ['conv-a', 'conv-b'];
    const payloads = buildForwardPayloads(sourceMessage, targets, 'user-me');

    expect(payloads).toHaveLength(2);
    expect(payloads[0].conversationId).toBe('conv-a');
    expect(payloads[0].body).toBe('Important update for team');
    expect(payloads[0].attachments[0].filePath).toBe('/uploads/doc.pdf');
    expect(payloads[1].conversationId).toBe('conv-b');
  });
});
