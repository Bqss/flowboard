import { describe, expect, it } from 'bun:test';
import { resolveTaskCommentNotificationRecipients } from '../app/services/notification-targets';

describe('resolveTaskCommentNotificationRecipients', () => {
  it('deduplicates task participants and prioritizes a mention without notifying the actor', () => {
    expect(
      resolveTaskCommentNotificationRecipients({
        actorId: 'author',
        assigneeId: 'assignee',
        creatorId: 'creator',
        mentionedUserIds: ['assignee', 'mentioned', 'creator', 'author', 'mentioned']
      })
    ).toEqual([
      { userId: 'assignee', type: 'task_mention' },
      { userId: 'creator', type: 'task_mention' },
      { userId: 'mentioned', type: 'task_mention' }
    ]);
  });

  it('notifies a shared assignee and creator once for an ordinary comment', () => {
    expect(
      resolveTaskCommentNotificationRecipients({
        actorId: 'author',
        assigneeId: 'teammate',
        creatorId: 'teammate',
        mentionedUserIds: []
      })
    ).toEqual([{ userId: 'teammate', type: 'task_comment' }]);
  });

  it('returns no recipients when the actor is the only task participant', () => {
    expect(
      resolveTaskCommentNotificationRecipients({
        actorId: 'author',
        assigneeId: 'author',
        creatorId: 'author',
        mentionedUserIds: ['author']
      })
    ).toEqual([]);
  });
});
