export type ChatInboxWorkspace = { id: string; name: string; slug: string };

type ConversationWithTimestamps = {
  lastMessage: { createdAt: Date } | null;
  updatedAt: Date;
};

export const mergeWorkspaceConversations = <T extends ConversationWithTimestamps>(
  batches: { workspace: ChatInboxWorkspace; conversations: T[] }[]
): Array<T & { workspaceId: string; workspaceName: string; workspaceSlug: string }> =>
  batches
    .flatMap(({ workspace, conversations }) =>
      conversations.map((conversation) => ({
        ...conversation,
        workspaceId: workspace.id,
        workspaceName: workspace.name,
        workspaceSlug: workspace.slug
      }))
    )
    .sort((a, b) => {
      const aTime = a.lastMessage?.createdAt.getTime() ?? a.updatedAt.getTime();
      const bTime = b.lastMessage?.createdAt.getTime() ?? b.updatedAt.getTime();
      return bTime - aTime;
    });
