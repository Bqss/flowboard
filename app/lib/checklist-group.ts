// Pure helpers for nested checklist groups. No DB imports so they can be unit-tested directly.

export const CHECKLIST_GROUP_MAX_DEPTH = 3;

export class ChecklistGroupError extends Error {
  constructor(
    message: string,
    public code: 'not_found' | 'validation' = 'validation'
  ) {
    super(message);
    this.name = 'ChecklistGroupError';
  }
}

export type GroupNode = { id: string; parentId: string | null };

/** Depth of a group: 0 for root (null), 1 for a top-level group, 2 for its child, and so on. */
export const getGroupDepth = (groups: GroupNode[], groupId: string | null): number => {
  let depth = 0;
  let currentId = groupId;
  const seen = new Set<string>();
  while (currentId) {
    if (seen.has(currentId)) break; // guard against corrupted cycles
    seen.add(currentId);
    const node = groups.find((group) => group.id === currentId);
    if (!node) break;
    depth += 1;
    currentId = node.parentId;
  }
  return depth;
};

/** True when a new group can be created under parentId without exceeding the max depth. */
export const canNestGroup = (groups: GroupNode[], parentId: string | null): boolean =>
  getGroupDepth(groups, parentId) + 1 <= CHECKLIST_GROUP_MAX_DEPTH;

/** rootId plus every group nested under it (any depth). */
export const collectDescendantGroupIds = (groups: GroupNode[], rootId: string): string[] => {
  const result = [rootId];
  const queue = [rootId];
  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const group of groups) {
      if (group.parentId === current && !result.includes(group.id)) {
        result.push(group.id);
        queue.push(group.id);
      }
    }
  }
  return result;
};

/** Next free position among siblings (children of parentId). */
export const nextSiblingPosition = (
  groups: Array<GroupNode & { position: number }>,
  parentId: string | null
): number => {
  const siblings = groups.filter((group) => group.parentId === parentId);
  if (siblings.length === 0) return 0;
  return Math.max(...siblings.map((group) => group.position)) + 1;
};

/**
 * Order groups so every parent comes before its children (BFS from roots, siblings by position).
 * Groups whose parent is missing are treated as roots, so a partial tree still copies cleanly.
 */
export const orderGroupsParentFirst = <T extends GroupNode & { position: number }>(
  groups: T[]
): T[] => {
  const ids = new Set(groups.map((group) => group.id));
  const byPosition = (a: T, b: T) => a.position - b.position;
  const roots = groups
    .filter((group) => group.parentId === null || !ids.has(group.parentId))
    .sort(byPosition);

  const ordered: T[] = [];
  const queue = [...roots];
  while (queue.length > 0) {
    const current = queue.shift()!;
    ordered.push(current);
    const children = groups.filter((group) => group.parentId === current.id).sort(byPosition);
    queue.push(...children);
  }
  return ordered;
};
