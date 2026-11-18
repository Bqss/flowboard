import { and, asc, eq, inArray, isNotNull, isNull } from 'drizzle-orm';
import {
  cards,
  checklistItemGroups,
  checklistItems,
  checklistTemplateGroups,
  checklistTemplates,
  db
} from '@db';
import {
  ChecklistGroupError,
  canNestGroup,
  collectDescendantGroupIds,
  nextSiblingPosition,
  orderGroupsParentFirst
} from '../lib/checklist-group';

export type DeleteGroupMode = 'with_items' | 'move_up';

/* ------------------------------------------------------------------ queries */

export const listChecklistTemplateGroups = (stageId: string) =>
  db
    .select()
    .from(checklistTemplateGroups)
    .where(eq(checklistTemplateGroups.stageId, stageId))
    .orderBy(asc(checklistTemplateGroups.position), asc(checklistTemplateGroups.createdAt));

export const listCardChecklistGroups = (cardId: string, stageId: string) =>
  db
    .select()
    .from(checklistItemGroups)
    .where(and(eq(checklistItemGroups.cardId, cardId), eq(checklistItemGroups.stageId, stageId)))
    .orderBy(asc(checklistItemGroups.position), asc(checklistItemGroups.createdAt));

const listCardGroupsForStage = (stageId: string) =>
  db
    .select()
    .from(checklistItemGroups)
    .where(eq(checklistItemGroups.stageId, stageId))
    .orderBy(asc(checklistItemGroups.position), asc(checklistItemGroups.createdAt));

const listCardIdsInStage = async (stageId: string) =>
  (await db.select({ id: cards.id }).from(cards).where(eq(cards.stageId, stageId))).map(
    (row) => row.id
  );

const requireTemplateGroup = async (stageId: string, groupId: string) => {
  const groups = await listChecklistTemplateGroups(stageId);
  const group = groups.find((item) => item.id === groupId);
  if (!group) throw new ChecklistGroupError('Group not found.', 'not_found');
  return { group, groups };
};

const hasTemplateGroups = async (stageId: string) =>
  (await listChecklistTemplateGroups(stageId)).length > 0;

/* ------------------------------------------------------- card copy & backfill */

/**
 * Copies the stage's group tree onto a card (parents first).
 * Returns a map of templateGroupId -> cardGroupId so items can be linked to their card group.
 * Idempotent: if the card already has groups for this stage, the existing rows are reused.
 */
export const copyChecklistGroupsToCard = async (
  cardId: string,
  stageId: string
): Promise<Map<string, string>> => {
  const existing = await listCardChecklistGroups(cardId, stageId);
  if (existing.length > 0) {
    return new Map(
      existing.flatMap((group) => (group.templateGroupId ? [[group.templateGroupId, group.id]] : []))
    );
  }

  const templateGroups = orderGroupsParentFirst(await listChecklistTemplateGroups(stageId));
  const idMap = new Map<string, string>();

  for (const templateGroup of templateGroups) {
    const parentCardGroupId = templateGroup.parentId
      ? (idMap.get(templateGroup.parentId) ?? null)
      : null;

    const [row] = await db
      .insert(checklistItemGroups)
      .values({
        cardId,
        stageId,
        parentId: parentCardGroupId,
        templateGroupId: templateGroup.id,
        name: templateGroup.name,
        requiresCompletion: templateGroup.requiresCompletion,
        position: templateGroup.position
      })
      .returning({ id: checklistItemGroups.id });

    idMap.set(templateGroup.id, row.id);
  }

  return idMap;
};

/**
 * Backfill for cards created before groups existed: if the stage has template groups but this card
 * has no group rows yet, copy the tree and link the card's items to their groups via templateId.
 */
export const ensureCardChecklistGroups = async (cardId: string, stageId: string) => {
  const templateGroups = orderGroupsParentFirst(await listChecklistTemplateGroups(stageId));
  if (templateGroups.length === 0) return;

  // Fill in every template group this card is missing (not only when the card has no groups at all).
  const existing = await listCardChecklistGroups(cardId, stageId);
  const cardGroupIdByTemplate = new Map<string, string>();
  for (const row of existing) {
    if (row.templateGroupId) cardGroupIdByTemplate.set(row.templateGroupId, row.id);
  }

  for (const templateGroup of templateGroups) {
    if (cardGroupIdByTemplate.has(templateGroup.id)) continue;
    const parentCardGroupId = templateGroup.parentId
      ? (cardGroupIdByTemplate.get(templateGroup.parentId) ?? null)
      : null;
    const [row] = await db
      .insert(checklistItemGroups)
      .values({
        cardId,
        stageId,
        parentId: parentCardGroupId,
        templateGroupId: templateGroup.id,
        name: templateGroup.name,
        requiresCompletion: templateGroup.requiresCompletion,
        position: templateGroup.position
      })
      .returning({ id: checklistItemGroups.id });
    cardGroupIdByTemplate.set(templateGroup.id, row.id);
  }

  // Link this card's items to their group where the link is missing.
  const templates = await db
    .select({ id: checklistTemplates.id, groupId: checklistTemplates.groupId })
    .from(checklistTemplates)
    .where(eq(checklistTemplates.stageId, stageId));

  for (const template of templates) {
    const cardGroupId = template.groupId ? cardGroupIdByTemplate.get(template.groupId) : undefined;
    if (!cardGroupId) continue;
    await db
      .update(checklistItems)
      .set({ groupId: cardGroupId })
      .where(
        and(
          eq(checklistItems.cardId, cardId),
          eq(checklistItems.templateId, template.id),
          isNull(checklistItems.groupId)
        )
      );
  }
};

/** Before any template-level change is mirrored, make sure every card in the stage has the full tree. */
const prepareStageCardsForGroupSync = async (stageId: string) => {
  if (!(await hasTemplateGroups(stageId))) return;
  for (const cardId of await listCardIdsInStage(stageId)) {
    await ensureCardChecklistGroups(cardId, stageId);
  }
};

/* ------------------------------------------------------------- gate rule */

/**
 * True when some group with requiresCompletion still has unfinished items (required or not)
 * inside it or in any of its sub-groups. Blocks the card from moving to the next stage.
 */
export const hasIncompleteGatedGroup = async (cardId: string, stageId: string) => {
  const groups = await listCardChecklistGroups(cardId, stageId);
  const gates = groups.filter((group) => group.requiresCompletion);
  if (gates.length === 0) return false;

  const openItems = await db
    .select({ groupId: checklistItems.groupId })
    .from(checklistItems)
    .where(
      and(
        eq(checklistItems.cardId, cardId),
        eq(checklistItems.stageId, stageId),
        eq(checklistItems.done, false)
      )
    );

  return gates.some((gate) => {
    const scopeIds = collectDescendantGroupIds(groups, gate.id);
    return openItems.some((item) => item.groupId !== null && scopeIds.includes(item.groupId));
  });
};

/* ------------------------------------------------------------ template groups */

export const createChecklistTemplateGroup = async (
  stageId: string,
  input: { name: string; parentId?: string | null; requiresCompletion?: boolean }
) => {
  const name = input.name.trim();
  if (!name) throw new ChecklistGroupError('Nama group wajib diisi.');

  const groups = await listChecklistTemplateGroups(stageId);
  const parentId = input.parentId ?? null;
  if (parentId && !groups.some((group) => group.id === parentId)) {
    throw new ChecklistGroupError('Parent group not found.', 'not_found');
  }
  if (!canNestGroup(groups, parentId)) {
    throw new ChecklistGroupError('Group hanya boleh sampai 3 level.');
  }

  await prepareStageCardsForGroupSync(stageId);

  const requiresCompletion = input.requiresCompletion ?? false;
  const [group] = await db
    .insert(checklistTemplateGroups)
    .values({
      stageId,
      parentId,
      name,
      requiresCompletion,
      position: nextSiblingPosition(groups, parentId)
    })
    .returning();

  // Mirror onto every card currently in this stage.
  const cardIds = await listCardIdsInStage(stageId);
  if (cardIds.length > 0) {
    const cardGroups = await listCardGroupsForStage(stageId);
    const rows = cardIds.map((cardId) => {
      const ownGroups = cardGroups.filter((row) => row.cardId === cardId);
      // If the parent was not mirrored on this card, the group lands at root.
      const cardParentId = parentId
        ? (ownGroups.find((row) => row.templateGroupId === parentId)?.id ?? null)
        : null;
      return {
        cardId,
        stageId,
        parentId: cardParentId,
        templateGroupId: group.id,
        name,
        requiresCompletion,
        position: nextSiblingPosition(ownGroups, cardParentId)
      };
    });
    await db.insert(checklistItemGroups).values(rows);
  }

  return group;
};

/** Renames / toggles a template group and applies the same change to every card's copy. */
export const updateChecklistTemplateGroup = async (
  stageId: string,
  groupId: string,
  input: { name?: string; requiresCompletion?: boolean }
) => {
  await requireTemplateGroup(stageId, groupId);

  const patch: { name?: string; requiresCompletion?: boolean } = {};
  if (input.name !== undefined) {
    const name = input.name.trim();
    if (!name) throw new ChecklistGroupError('Nama group wajib diisi.');
    patch.name = name;
  }
  if (input.requiresCompletion !== undefined) patch.requiresCompletion = input.requiresCompletion;
  if (Object.keys(patch).length === 0) return null;

  await prepareStageCardsForGroupSync(stageId);

  const [updated] = await db
    .update(checklistTemplateGroups)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(checklistTemplateGroups.id, groupId))
    .returning();

  await db
    .update(checklistItemGroups)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(checklistItemGroups.templateGroupId, groupId));

  return updated;
};

/**
 * Deletes a template group and mirrors the deletion onto cards.
 * - move_up: child groups and items move to the parent (nothing is lost).
 * - with_items: items and sub-groups inside are deleted. Unchecked card items are deleted;
 *   checked card items are kept and moved to the parent so progress history is not lost.
 */
export const deleteChecklistTemplateGroup = async (
  stageId: string,
  groupId: string,
  mode: DeleteGroupMode
) => {
  const { group: target, groups } = await requireTemplateGroup(stageId, groupId);
  const parentId = target.parentId;

  await prepareStageCardsForGroupSync(stageId);

  // --- Card side (first; card rows reference template group ids) ---
  const cardGroups = await listCardGroupsForStage(stageId);
  const cardRoots = cardGroups.filter((row) => row.templateGroupId === groupId);

  for (const root of cardRoots) {
    const ownGroups = cardGroups.filter((row) => row.cardId === root.cardId);
    const subtreeIds = collectDescendantGroupIds(ownGroups, root.id);

    if (mode === 'move_up') {
      await db
        .update(checklistItemGroups)
        .set({ parentId: root.parentId })
        .where(eq(checklistItemGroups.parentId, root.id));
      await db
        .update(checklistItems)
        .set({ groupId: root.parentId })
        .where(eq(checklistItems.groupId, root.id));
    } else {
      await db
        .delete(checklistItems)
        .where(and(inArray(checklistItems.groupId, subtreeIds), eq(checklistItems.done, false)));
      await db
        .update(checklistItems)
        .set({ groupId: root.parentId })
        .where(inArray(checklistItems.groupId, subtreeIds));
    }

    // Deleting the root cascades any remaining sub-groups.
    await db.delete(checklistItemGroups).where(eq(checklistItemGroups.id, root.id));
  }

  // --- Template side ---
  if (mode === 'move_up') {
    await db
      .update(checklistTemplateGroups)
      .set({ parentId })
      .where(eq(checklistTemplateGroups.parentId, groupId));
    await db
      .update(checklistTemplates)
      .set({ groupId: parentId })
      .where(eq(checklistTemplates.groupId, groupId));
  } else {
    const subtreeIds = collectDescendantGroupIds(groups, groupId);
    // Card items linked to these templates get templateId set to null by FK (detached, kept on card).
    await db.delete(checklistTemplates).where(inArray(checklistTemplates.groupId, subtreeIds));
  }

  // Deleting the root cascades template sub-groups.
  await db.delete(checklistTemplateGroups).where(eq(checklistTemplateGroups.id, groupId));

  return true;
};

/* ------------------------------------------------------------ template items */

/**
 * Creates a template item and mirrors it onto every card in the stage (unchecked, at the end).
 * groupId is a template group id (or null for root).
 */
export const createChecklistTemplateItem = async (
  stageId: string,
  input: { label: string; required?: boolean; deadlineHours?: number | null; groupId?: string | null }
) => {
  const label = input.label.trim();
  if (!label) throw new ChecklistGroupError('Label checklist wajib diisi.');

  const groupId = input.groupId ?? null;
  if (groupId) await requireTemplateGroup(stageId, groupId);

  await prepareStageCardsForGroupSync(stageId);

  const siblings = await db
    .select({ position: checklistTemplates.position })
    .from(checklistTemplates)
    .where(
      and(
        eq(checklistTemplates.stageId, stageId),
        groupId === null ? isNull(checklistTemplates.groupId) : eq(checklistTemplates.groupId, groupId)
      )
    );
  const position = siblings.length === 0 ? 0 : Math.max(...siblings.map((row) => row.position)) + 1;

  const [template] = await db
    .insert(checklistTemplates)
    .values({
      stageId,
      groupId,
      label,
      required: input.required ?? true,
      deadlineHours: input.deadlineHours ?? null,
      position
    })
    .returning();

  const cardIds = await listCardIdsInStage(stageId);
  if (cardIds.length > 0) {
    const cardGroups = groupId ? await listCardGroupsForStage(stageId) : [];
    const cardItems = await db
      .select({ cardId: checklistItems.cardId, position: checklistItems.position })
      .from(checklistItems)
      .where(eq(checklistItems.stageId, stageId));

    const rows = cardIds.map((cardId) => {
      const cardGroupId = groupId
        ? (cardGroups.find((row) => row.cardId === cardId && row.templateGroupId === groupId)?.id ??
          null)
        : null;
      const ownPositions = cardItems.filter((row) => row.cardId === cardId).map((row) => row.position);
      const nextPosition = ownPositions.length === 0 ? 0 : Math.max(...ownPositions) + 1;
      return {
        cardId,
        stageId,
        templateId: template.id,
        groupId: cardGroupId,
        label: template.label,
        required: template.required,
        position: nextPosition
      };
    });
    await db.insert(checklistItems).values(rows);
  }

  return template;
};

/** Mirrors label / required changes of a template item onto the card copies linked to it. */
export const syncChecklistTemplateItemToCards = async (
  templateId: string,
  patch: { label?: string; required?: boolean }
) => {
  const set: { label?: string; required?: boolean } = {};
  if (patch.label !== undefined) set.label = patch.label.trim();
  if (patch.required !== undefined) set.required = patch.required;
  if (Object.keys(set).length === 0) return;

  await db
    .update(checklistItems)
    .set({ ...set, updatedAt: new Date() })
    .where(eq(checklistItems.templateId, templateId));
};

/**
 * Deletes a template item and its unchecked card copies. Checked card copies stay on the card
 * (templateId becomes null via FK) so progress history is kept.
 */
export const deleteChecklistTemplateItem = async (stageId: string, templateId: string) => {
  const [template] = await db
    .select()
    .from(checklistTemplates)
    .where(and(eq(checklistTemplates.id, templateId), eq(checklistTemplates.stageId, stageId)))
    .limit(1);
  if (!template) throw new ChecklistGroupError('Checklist item not found.', 'not_found');

  await db
    .delete(checklistItems)
    .where(and(eq(checklistItems.templateId, templateId), eq(checklistItems.done, false)));
  await db.delete(checklistTemplates).where(eq(checklistTemplates.id, templateId));

  return template;
};

/**
 * Moves a template item into a group (or to root when groupId is null) and mirrors it onto
 * every card's copy of that item, linked by templateId.
 */
export const moveChecklistTemplateItem = async (
  stageId: string,
  templateId: string,
  groupId: string | null
) => {
  const [template] = await db
    .select()
    .from(checklistTemplates)
    .where(and(eq(checklistTemplates.id, templateId), eq(checklistTemplates.stageId, stageId)))
    .limit(1);
  if (!template) throw new ChecklistGroupError('Checklist item not found.', 'not_found');

  if (groupId) await requireTemplateGroup(stageId, groupId);

  await prepareStageCardsForGroupSync(stageId);

  const siblings = await db
    .select({ position: checklistTemplates.position })
    .from(checklistTemplates)
    .where(
      and(
        eq(checklistTemplates.stageId, stageId),
        groupId === null ? isNull(checklistTemplates.groupId) : eq(checklistTemplates.groupId, groupId)
      )
    );
  const position = siblings.length === 0 ? 0 : Math.max(...siblings.map((row) => row.position)) + 1;

  const [updated] = await db
    .update(checklistTemplates)
    .set({ groupId, position })
    .where(eq(checklistTemplates.id, templateId))
    .returning();

  const linkedItems = await db
    .select({ id: checklistItems.id, cardId: checklistItems.cardId })
    .from(checklistItems)
    .where(eq(checklistItems.templateId, templateId));

  if (linkedItems.length > 0) {
    const cardGroupRows = groupId
      ? await db
          .select({ id: checklistItemGroups.id, cardId: checklistItemGroups.cardId })
          .from(checklistItemGroups)
          .where(eq(checklistItemGroups.templateGroupId, groupId))
      : [];

    for (const item of linkedItems) {
      const targetGroupId = groupId
        ? (cardGroupRows.find((row) => row.cardId === item.cardId)?.id ?? null)
        : null;
      await db
        .update(checklistItems)
        .set({ groupId: targetGroupId })
        .where(eq(checklistItems.id, item.id));
    }
  }

  return updated;
};

/**
 * Saves the full template layout of a stage after drag & drop: every item gets its group (or root) and position.
 * The same group and position are mirrored onto each card's copy of the item (linked by templateId).
 */
export const saveChecklistItemLayout = async (
  stageId: string,
  items: Array<{ id: string; groupId: string | null; position: number }>
) => {
  const templates = await db
    .select({ id: checklistTemplates.id })
    .from(checklistTemplates)
    .where(eq(checklistTemplates.stageId, stageId));
  const templateIds = new Set(templates.map((template) => template.id));
  const incomingIds = new Set(items.map((item) => item.id));
  if (
    items.length !== templateIds.size ||
    incomingIds.size !== items.length ||
    items.some((item) => !templateIds.has(item.id))
  ) {
    throw new ChecklistGroupError('Susunan checklist sudah berubah. Muat ulang halaman lalu coba lagi.');
  }

  const groups = await listChecklistTemplateGroups(stageId);
  const groupIds = new Set(groups.map((group) => group.id));
  if (items.some((item) => item.groupId !== null && !groupIds.has(item.groupId))) {
    throw new ChecklistGroupError('Group not found.', 'not_found');
  }

  await prepareStageCardsForGroupSync(stageId);

  for (const item of items) {
    await db
      .update(checklistTemplates)
      .set({ groupId: item.groupId, position: item.position })
      .where(eq(checklistTemplates.id, item.id));
  }

  // Mirror onto card copies: map (card, template group) -> card group.
  const cardGroups = await listCardGroupsForStage(stageId);
  const cardGroupByKey = new Map<string, string>();
  for (const row of cardGroups) {
    if (row.templateGroupId) cardGroupByKey.set(`${row.cardId}|${row.templateGroupId}`, row.id);
  }

  const layoutByTemplate = new Map(items.map((item) => [item.id, item]));
  const linkedItems = await db
    .select({ id: checklistItems.id, cardId: checklistItems.cardId, templateId: checklistItems.templateId })
    .from(checklistItems)
    .where(and(eq(checklistItems.stageId, stageId), isNotNull(checklistItems.templateId)));

  for (const row of linkedItems) {
    const layout = row.templateId ? layoutByTemplate.get(row.templateId) : undefined;
    if (!layout) continue;
    const cardGroupId = layout.groupId
      ? (cardGroupByKey.get(`${row.cardId}|${layout.groupId}`) ?? null)
      : null;
    await db
      .update(checklistItems)
      .set({ groupId: cardGroupId, position: layout.position, updatedAt: new Date() })
      .where(eq(checklistItems.id, row.id));
  }

  return true;
};
