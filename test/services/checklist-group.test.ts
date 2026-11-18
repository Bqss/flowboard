import { describe, expect, test } from 'bun:test';
import {
  CHECKLIST_GROUP_MAX_DEPTH,
  canNestGroup,
  collectDescendantGroupIds,
  getGroupDepth,
  nextSiblingPosition,
  orderGroupsParentFirst
} from '../../app/lib/checklist-group';

// Tree:  A ─ B ─ C ─ D   (depth 1..4 chain)  and  A ─ E
const chain = [
  { id: 'A', parentId: null, position: 0 },
  { id: 'B', parentId: 'A', position: 0 },
  { id: 'C', parentId: 'B', position: 0 },
  { id: 'D', parentId: 'C', position: 0 },
  { id: 'E', parentId: 'A', position: 1 }
];

describe('getGroupDepth', () => {
  test('root is 0, top-level is 1, nested increments', () => {
    expect(getGroupDepth(chain, null)).toBe(0);
    expect(getGroupDepth(chain, 'A')).toBe(1);
    expect(getGroupDepth(chain, 'B')).toBe(2);
    expect(getGroupDepth(chain, 'C')).toBe(3);
  });

  test('unknown id and cycles do not loop forever', () => {
    expect(getGroupDepth(chain, 'missing')).toBe(0);
    const cyclic = [
      { id: 'X', parentId: 'Y' },
      { id: 'Y', parentId: 'X' }
    ];
    expect(getGroupDepth(cyclic, 'X')).toBe(2);
  });
});

describe('canNestGroup', () => {
  test('max depth is 3 levels', () => {
    expect(CHECKLIST_GROUP_MAX_DEPTH).toBe(3);
    expect(canNestGroup(chain, null)).toBe(true); // new top-level
    expect(canNestGroup(chain, 'A')).toBe(true); // level 2
    expect(canNestGroup(chain, 'B')).toBe(true); // level 3
    expect(canNestGroup(chain, 'C')).toBe(false); // would be level 4
  });
});

describe('collectDescendantGroupIds', () => {
  test('returns root plus all nested descendants', () => {
    expect(collectDescendantGroupIds(chain, 'B').sort()).toEqual(['B', 'C', 'D']);
    expect(collectDescendantGroupIds(chain, 'A').sort()).toEqual(['A', 'B', 'C', 'D', 'E']);
    expect(collectDescendantGroupIds(chain, 'D')).toEqual(['D']);
  });
});

describe('nextSiblingPosition', () => {
  test('0 for empty sibling set, max+1 otherwise', () => {
    expect(nextSiblingPosition([], null)).toBe(0);
    expect(nextSiblingPosition(chain, 'A')).toBe(2); // siblings B(0), E(1)
    expect(nextSiblingPosition(chain, 'D')).toBe(0);
  });
});

describe('orderGroupsParentFirst', () => {
  test('parents always come before children, siblings sorted by position', () => {
    const shuffled = [chain[3], chain[4], chain[1], chain[2], chain[0]];
    const ordered = orderGroupsParentFirst(shuffled).map((group) => group.id);
    expect(ordered).toEqual(['A', 'B', 'E', 'C', 'D']);
    for (const group of chain) {
      if (group.parentId) {
        expect(ordered.indexOf(group.parentId)).toBeLessThan(ordered.indexOf(group.id));
      }
    }
  });

  test('group with a missing parent is treated as root', () => {
    const partial = [{ id: 'Z', parentId: 'gone', position: 0 }];
    expect(orderGroupsParentFirst(partial).map((group) => group.id)).toEqual(['Z']);
  });
});
