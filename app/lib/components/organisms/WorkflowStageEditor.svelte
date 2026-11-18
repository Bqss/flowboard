<script lang="ts">
  import { tick } from 'svelte';
  import { cn } from '$lib/utils.js';
  import {
    api,
    ApiError,
    type ApiWorkflowSetupStage
  } from '$lib/api/client';
  import { Button, IconButton, Checkbox, Input, Badge, Textarea, Switch } from '$lib/components/atoms/index.js';
  import {
    DropdownMenu,
    FormField,
    SelectMenu,
    toast
  } from '$lib/components/molecules/index.js';
  import { Dialog, ConfirmDialog } from '$lib/components/organisms/index.js';
  import { HugeiconsIcon } from '@hugeicons/svelte';
  import {
    Add01Icon,
    Delete02Icon,
    Edit02Icon,
    Tick02Icon,
    WhatsappIcon,
    CheckmarkBadge01Icon,
    DragDropVerticalIcon,
    Clock01Icon
  } from '@hugeicons/core-free-icons';
  import { dashboardText } from '$lib/i18n/dashboard.js';
  import { locale } from '$lib/i18n/index.js';

  const tr = (key: string, values?: Record<string, string | number>) =>
    dashboardText($locale, key, values);

  type Props = {
    workspaceId: string;
    workflowId: string;
    stages: ApiWorkflowSetupStage[];
    canManage?: boolean;
    openCreateStageModal?: () => void;
    onchange?: () => void | Promise<void>;
  };

  let {
    workspaceId,
    workflowId,
    stages = $bindable([]),
    canManage = true,
    openCreateStageModal = $bindable(),
    onchange
  }: Props = $props();

  const stageDotClasses: Record<string, string> = {
    indigo: 'bg-status-queued',
    amber: 'bg-status-progress',
    emerald: 'bg-status-done',
    rose: 'bg-status-urgent',
    cyan: 'bg-cyan-500',
    violet: 'bg-violet-500',
    fuchsia: 'bg-fuchsia-500',
    teal: 'bg-teal-500'
  };

  // State: Stage draft & checklist draft
  type StageAutomationDraft = {
    onReplyNotify: boolean;
    overdueReminderHours: string;
  };
  let stageAutomationDraft = $state<Record<string, StageAutomationDraft>>({});
  let checklistRequiredDraft = $state<Record<string, boolean>>({});

  const checklistIsRequired = (template: ApiWorkflowSetupStage['templates'][number]) =>
    checklistRequiredDraft[template.id] ?? template.required;

  const hasUnsavedSetupChanges = $derived.by(() => {
    for (const stage of stages) {
      const draft = stageAutomationDraft[stage.id];
      if (draft) {
        const stageNotify = stage.onReplyNotify ?? false;
        if (draft.onReplyNotify !== stageNotify) return true;
        const stageHours = stage.overdueReminderHours == null ? '' : String(stage.overdueReminderHours);
        if (draft.overdueReminderHours !== stageHours) return true;
      }
      for (const t of stage.templates ?? []) {
        const reqDraft = checklistRequiredDraft[t.id];
        if (reqDraft !== undefined && reqDraft !== t.required) return true;
      }
    }
    return false;
  });

  const parseReminderHours = (value: string): number | null | undefined => {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = Number(trimmed);
    if (!Number.isFinite(parsed) || parsed <= 0) return undefined;
    return parsed;
  };

  async function saveSetupChanges(showSuccess = true): Promise<boolean> {
    if (!canManage || !workspaceId || !workflowId) return true;
    try {
      const stageUpdates: Promise<unknown>[] = [];
      for (const stage of stages) {
        const draft = stageAutomationDraft[stage.id];
        if (!draft) continue;
        const parsedHours = parseReminderHours(draft.overdueReminderHours);
        if (parsedHours === undefined) {
          toast.error(tr('setup.invalidHours', { stage: stage.name }));
          return false;
        }
        const stageHours = stage.overdueReminderHours == null ? '' : String(stage.overdueReminderHours);
        const stageNotify = stage.onReplyNotify ?? false;
        const changed = draft.onReplyNotify !== stageNotify || draft.overdueReminderHours !== stageHours;
        if (changed) {
          stageUpdates.push(
            api.updateStage(workspaceId, workflowId, stage.id, {
              onReplyNotify: draft.onReplyNotify,
              overdueReminderHours: parsedHours
            })
          );
        }
      }

      const templateUpdates: Promise<unknown>[] = [];
      for (const stage of stages) {
        for (const t of stage.templates ?? []) {
          const reqDraft = checklistRequiredDraft[t.id];
          if (reqDraft !== undefined && reqDraft !== t.required) {
            templateUpdates.push(
              api.updateChecklistTemplate(workspaceId, workflowId, stage.id, t.id, {
                required: reqDraft
              })
            );
          }
        }
      }

      await Promise.all([...stageUpdates, ...templateUpdates]);

      for (const stage of stages) {
        const draft = stageAutomationDraft[stage.id];
        if (draft) {
          stage.onReplyNotify = draft.onReplyNotify;
          const parsed = parseReminderHours(draft.overdueReminderHours);
          stage.overdueReminderHours = parsed ?? null;
        }
        for (const t of stage.templates ?? []) {
          if (checklistRequiredDraft[t.id] !== undefined) {
            t.required = checklistRequiredDraft[t.id];
          }
        }
      }
      checklistRequiredDraft = {};
      if (showSuccess) toast.success(tr('setup.changesSaved'));
      onchange?.();
      return true;
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : tr('setup.saveFailed'));
      return false;
    }
  }

  async function ensureSetupChangesSaved(): Promise<boolean> {
    if (!hasUnsavedSetupChanges) return true;
    return saveSetupChanges(false);
  }

  // --- Add Stage Modal State ---
  let createStageOpen = $state(false);
  let newStageName = $state('');
  let creatingStage = $state(false);

  // Expose openCreateStageModal to parent
  $effect(() => {
    openCreateStageModal = () => {
      newStageName = '';
      createStageOpen = true;
    };
  });

  async function createStage() {
    if (!newStageName.trim() || !canManage || !workspaceId || !workflowId) return;
    if (!(await ensureSetupChangesSaved())) return;
    creatingStage = true;
    try {
      await api.createStage(workspaceId, workflowId, {
        name: newStageName.trim()
      });
      createStageOpen = false;
      toast.success(tr('setup.stageAdded'));
      await onchange?.();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : tr('setup.addStageFailed'));
    } finally {
      creatingStage = false;
    }
  }

  // Inline stage-name editing keeps the pipeline header as direct to edit as the taskboard list name.
  let editingStageId = $state<string | null>(null);
  let editingStageName = $state('');
  let stageNameInput = $state<HTMLInputElement | null>(null);
  let savingStageName = $state(false);

  async function startInlineStageRename(event: MouseEvent, stage: ApiWorkflowSetupStage) {
    if (!canManage || reordering || savingStageName) return;
    event.stopPropagation();
    editingStageId = stage.id;
    editingStageName = stage.name;
    await tick();
    stageNameInput?.focus();
    stageNameInput?.select();
  }

  function cancelInlineStageRename() {
    if (savingStageName) return;
    editingStageId = null;
    editingStageName = '';
  }

  function handleInlineStageRenameKeydown(event: KeyboardEvent, stage: ApiWorkflowSetupStage) {
    if (event.key === 'Enter') {
      event.preventDefault();
      void finishInlineStageRename(stage);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      cancelInlineStageRename();
    }
  }

  async function finishInlineStageRename(stage: ApiWorkflowSetupStage) {
    if (!canManage || !workspaceId || !workflowId || savingStageName || editingStageId !== stage.id) return;
    const nextName = editingStageName.trim();
    if (!nextName || nextName === stage.name) {
      cancelInlineStageRename();
      return;
    }
    if (!(await ensureSetupChangesSaved())) return;

    savingStageName = true;
    try {
      await api.updateStage(workspaceId, workflowId, stage.id, { name: nextName });
      stage.name = nextName;
      editingStageId = null;
      editingStageName = '';
      await onchange?.();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : tr('setup.saveStageFailed'));
    } finally {
      savingStageName = false;
    }
  }

  // --- Delete Stage State ---
  let stageToDelete = $state<ApiWorkflowSetupStage | null>(null);
  let deletingStage = $state(false);

  async function deleteStageConfirmed() {
    if (!stageToDelete || !canManage || !workspaceId || !workflowId) return;
    if (!(await ensureSetupChangesSaved())) return;
    deletingStage = true;
    try {
      await api.deleteStage(workspaceId, workflowId, stageToDelete.id);
      stageToDelete = null;
      toast.success(tr('setup.stageDeleted'));
      await onchange?.();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : tr('setup.deleteStageFailed'));
    } finally {
      deletingStage = false;
    }
  }

  let reordering = $state(false);
  // --- Drag and Drop Stage Reorder ---
  let draggingStageIndex = $state<number | null>(null);
  let stageDropTargetIndex = $state<number | null>(null);

  function onStageDragStart(event: DragEvent, index: number) {
    if (!canManage || reordering) return;
    draggingStageIndex = index;
    stageDropTargetIndex = null;
    event.dataTransfer?.setData('text/plain', stages[index]?.id ?? '');
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      const laneEl = (event.currentTarget as HTMLElement | null)?.closest('section');
      if (laneEl) {
        const rect = laneEl.getBoundingClientRect();
        event.dataTransfer.setDragImage(laneEl, Math.max(0, event.clientX - rect.left), Math.max(0, event.clientY - rect.top));
      }
    }
  }

  function onStageDragEnd() {
    draggingStageIndex = null;
    stageDropTargetIndex = null;
  }

  function onStageDragOver(event: DragEvent, index: number) {
    if (draggingStageIndex === null) return;
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
    const current = event.currentTarget as HTMLElement;
    const rect = current.getBoundingClientRect();
    const midX = rect.left + rect.width / 2;
    stageDropTargetIndex = event.clientX < midX ? index : index + 1;
  }

  async function onStageDrop(event: DragEvent, index: number) {
    event.preventDefault();
    if (draggingStageIndex === null || !canManage || reordering) return;

    const fromIndex = draggingStageIndex;
    const targetSlot = stageDropTargetIndex ?? index;
    draggingStageIndex = null;
    stageDropTargetIndex = null;

    if (fromIndex === targetSlot || fromIndex === targetSlot - 1) return;
    if (!(await ensureSetupChangesSaved())) return;

    reordering = true;
    const originalStages = [...stages];
    const newStages = [...stages];
    const [moved] = newStages.splice(fromIndex, 1);
    const insertAt = targetSlot <= fromIndex ? targetSlot : targetSlot - 1;
    newStages.splice(insertAt, 0, moved);
    stages = newStages;

    try {
      await api.reorderStages(workspaceId, workflowId, { stageIds: newStages.map((s) => s.id) });
      await onchange?.();
    } catch (err) {
      stages = originalStages;
      toast.error(err instanceof ApiError ? err.message : tr('setup.reorderFailed'));
    } finally {
      reordering = false;
    }
  }


  // --- Checklist Management Modal State ---
  let checklistModalOpen = $state(false);
  let checklistModalMode = $state<'create' | 'edit'>('create');
  let checklistModalStageId = $state<string>('');
  let checklistModalGroupId = $state<string | null>(null);
  let checklistModalTemplateId = $state<string | null>(null);
  let checklistModalLabel = $state('');
  let checklistModalRequired = $state(true);
  let checklistModalActionKind = $state<'none' | 'send' | 'followup'>('none');
  let checklistModalMessage = $state('');
  let checklistModalDelay = $state('0');
  let checklistModalDeadline = $state('');
  let checklistModalFollowupIfNoReply = $state(false);
  let savingChecklistModal = $state(false);

  const actionKindOptions = [
    { value: 'none', label: tr('setup.actionNone') },
    { value: 'send', label: tr('setup.actionSend') },
    { value: 'followup', label: tr('setup.actionFollowup') }
  ];

  function openCreateChecklistModal(stageId: string, groupId: string | null = null) {
    checklistModalStageId = stageId;
    checklistModalGroupId = groupId;
    checklistModalTemplateId = null;
    checklistModalMode = 'create';
    checklistModalLabel = '';
    checklistModalRequired = true;
    checklistModalDeadline = '';
    checklistModalActionKind = 'none';
    checklistModalMessage = '';
    checklistModalDelay = '0';
    checklistModalFollowupIfNoReply = false;
    checklistModalOpen = true;
  }

  function openEditChecklistModal(
    stageId: string,
    template: ApiWorkflowSetupStage['templates'][number]
  ) {
    checklistModalStageId = stageId;
    checklistModalTemplateId = template.id;
    checklistModalMode = 'edit';
    checklistModalLabel = template.label;
    checklistModalRequired = checklistIsRequired(template);
    checklistModalDeadline = template.deadlineHours == null ? '' : String(template.deadlineHours);
    checklistModalActionKind = (template.action?.kind as any) || 'none';
    checklistModalMessage = template.action?.messageTemplate || '';
    checklistModalDelay = String(template.action?.delayMinutes ?? 0);
    checklistModalFollowupIfNoReply = template.action?.followupIfNoReply ?? false;
    checklistModalOpen = true;

    // Older setup payloads did not include deadlineHours. Refresh only those
    // templates so an already-open page can still hydrate the saved deadline.
    if (!Object.hasOwn(template, 'deadlineHours') && workspaceId && workflowId) {
      void api
        .getWorkflowSetup(workspaceId, workflowId)
        .then((setup) => {
          if (checklistModalTemplateId !== template.id || !checklistModalOpen) return;
          const latest = setup.stages
            .flatMap((stage) => stage.templates)
            .find((item) => item.id === template.id);
          if (latest) {
            checklistModalDeadline =
              latest.deadlineHours == null ? '' : String(latest.deadlineHours);
          }
        })
        .catch(() => undefined);
    }
  }

  function insertVariable(variable: string) {
    checklistModalMessage = checklistModalMessage ? `${checklistModalMessage} ${variable}` : variable;
  }

  async function saveChecklistModal() {
    if (!canManage || !workspaceId || !workflowId || !checklistModalStageId) return;
    if (!(await ensureSetupChangesSaved())) return;
    const label = checklistModalLabel.trim();
    if (!label) return;

    try {
      const delay = Math.max(0, parseInt(checklistModalDelay) || 0);
      const parsedDeadline = parseInt(checklistModalDeadline, 10);
      const deadlineHours = Number.isFinite(parsedDeadline) && parsedDeadline > 0
        ? Math.min(parsedDeadline, 720)
        : null;
      if (checklistModalMode === 'create') {
        const res = await api.createChecklistTemplate(workspaceId, workflowId, checklistModalStageId, {
          label,
          required: checklistModalRequired,
          deadlineHours,
          groupId: checklistModalGroupId
        });
        if (checklistModalActionKind !== 'none') {
          await api.updateChecklistAction(workspaceId, workflowId, checklistModalStageId, res.template.id, {
            kind: checklistModalActionKind,
            messageTemplate: checklistModalMessage.trim(),
            delayMinutes: delay,
            followupIfNoReply: checklistModalActionKind === 'followup' ? checklistModalFollowupIfNoReply : undefined
          });
        }
        toast.success(tr('setup.itemCreated'));
      } else if (checklistModalTemplateId) {
        await api.updateChecklistTemplate(
          workspaceId,
          workflowId,
          checklistModalStageId,
          checklistModalTemplateId,
          {
            label,
            required: checklistModalRequired,
            deadlineHours
          }
        );
        await api.updateChecklistAction(workspaceId, workflowId, checklistModalStageId, checklistModalTemplateId, {
          kind: checklistModalActionKind,
          messageTemplate: checklistModalActionKind !== 'none' ? checklistModalMessage.trim() : undefined,
          delayMinutes: delay,
          followupIfNoReply: checklistModalActionKind === 'followup' ? checklistModalFollowupIfNoReply : undefined
        });
        delete checklistRequiredDraft[checklistModalTemplateId];
        toast.success(tr('setup.itemUpdated'));
      }
      checklistModalOpen = false;
      await onchange?.();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : tr('setup.itemSaveFailed'));
    } finally {
      savingChecklistModal = false;
    }
  }

  function toggleChecklistRequired(template: ApiWorkflowSetupStage['templates'][number]) {
    if (!canManage) return;
    checklistRequiredDraft[template.id] = !checklistIsRequired(template);
  }

  // --- Checklist groups (nested folders, max 3 levels) ---
  type TemplateRow = ApiWorkflowSetupStage['templates'][number];
  type GroupRow = NonNullable<ApiWorkflowSetupStage['groups']>[number];

  const groupsOf = (stage: ApiWorkflowSetupStage): GroupRow[] => stage.groups ?? [];

  const childGroupsOf = (stage: ApiWorkflowSetupStage, parentId: string | null) =>
    groupsOf(stage)
      .filter((group) => (group.parentId ?? null) === parentId)
      .sort((a, b) => a.position - b.position);

  const childTemplatesOf = (stage: ApiWorkflowSetupStage, groupId: string | null) =>
    stage.templates
      .filter((template) => (template.groupId ?? null) === groupId)
      .sort((a, b) => a.position - b.position);


  let groupModalOpen = $state(false);
  let groupModalMode = $state<'create' | 'rename'>('create');
  let groupModalStageId = $state('');
  let groupModalGroupId = $state<string | null>(null);
  let groupModalParentId = $state<string | null>(null);
  let groupModalName = $state('');
  let groupModalGate = $state(false);
  let savingGroup = $state(false);

  function openCreateGroup(stageId: string, parentId: string | null = null) {
    groupModalStageId = stageId;
    groupModalMode = 'create';
    groupModalGroupId = null;
    groupModalParentId = parentId;
    groupModalName = '';
    groupModalGate = false;
    groupModalOpen = true;
  }

  function openRenameGroup(stageId: string, group: GroupRow) {
    groupModalStageId = stageId;
    groupModalMode = 'rename';
    groupModalGroupId = group.id;
    groupModalParentId = group.parentId ?? null;
    groupModalName = group.name;
    groupModalGate = group.requiresCompletion;
    groupModalOpen = true;
  }

  async function saveGroupModal() {
    if (!canManage || !workspaceId || !workflowId) return;
    const name = groupModalName.trim();
    if (!name) return;
    if (!(await ensureSetupChangesSaved())) return;

    savingGroup = true;
    try {
      if (groupModalMode === 'create') {
        await api.createChecklistGroup(workspaceId, workflowId, groupModalStageId, {
          name,
          parentId: groupModalParentId,
          requiresCompletion: groupModalGate
        });
      } else if (groupModalGroupId) {
        await api.updateChecklistGroup(workspaceId, workflowId, groupModalStageId, groupModalGroupId, {
          name,
          requiresCompletion: groupModalGate
        });
      }
      groupModalOpen = false;
      toast.success(tr('setup.groupSaved'));
      await onchange?.();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : tr('setup.groupSaveFailed'));
    } finally {
      savingGroup = false;
    }
  }

  let groupToDelete = $state<{ stageId: string; group: GroupRow } | null>(null);
  let deletingGroup = $state(false);

  async function deleteGroupConfirmed(mode: 'with_items' | 'move_up') {
    if (!groupToDelete || !canManage || !workspaceId || !workflowId) return;
    if (!(await ensureSetupChangesSaved())) return;

    deletingGroup = true;
    try {
      await api.deleteChecklistGroup(
        workspaceId,
        workflowId,
        groupToDelete.stageId,
        groupToDelete.group.id,
        mode
      );
      groupToDelete = null;
      toast.success(tr('setup.groupDeleted'));
      await onchange?.();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : tr('setup.groupDeleteFailed'));
    } finally {
      deletingGroup = false;
    }
  }

  // --- Drag & drop: reorder items and move them into or out of groups ---
  let dragItem = $state<{ templateId: string; stageId: string } | null>(null);
  let dropTarget = $state<{ stageId: string; containerId: string | null; beforeId: string | null } | null>(null);

  function startItemDrag(event: DragEvent, stage: ApiWorkflowSetupStage, template: TemplateRow) {
    if (!canManage) {
      event.preventDefault();
      return;
    }
    dragItem = { templateId: template.id, stageId: stage.id };
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', template.id);
    }
  }

  function endItemDrag() {
    dragItem = null;
    dropTarget = null;
  }

  // Items can only move within the stage they belong to.
  function acceptDrag(event: DragEvent, stageId: string) {
    if (!dragItem || dragItem.stageId !== stageId) return false;
    event.preventDefault();
    return true;
  }

  function dragOverCard(event: DragEvent, stage: ApiWorkflowSetupStage, template: TemplateRow) {
    if (!acceptDrag(event, stage.id) || !dragItem) return;
    event.stopPropagation();
    if (template.id === dragItem.templateId) {
      dropTarget = null;
      return;
    }
    const containerId = template.groupId ?? null;
    const siblings = childTemplatesOf(stage, containerId).filter((row) => row.id !== dragItem?.templateId);
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const insertBefore = event.clientY < rect.top + rect.height / 2;
    const index = siblings.findIndex((row) => row.id === template.id);
    const beforeId = insertBefore ? template.id : (siblings[index + 1]?.id ?? null);
    dropTarget = { stageId: stage.id, containerId, beforeId };
  }

  function dragOverContainer(event: DragEvent, stage: ApiWorkflowSetupStage, containerId: string | null) {
    if (!acceptDrag(event, stage.id)) return;
    event.stopPropagation();
    dropTarget = { stageId: stage.id, containerId, beforeId: null };
  }

  function dropItem(event: DragEvent, stage: ApiWorkflowSetupStage) {
    if (!acceptDrag(event, stage.id)) return;
    event.stopPropagation();
    void applyItemDrop();
  }

  /** Recomputes the whole stage layout after a drop and saves it in one request. */
  async function applyItemDrop() {
    const dragged = dragItem;
    const target = dropTarget;
    dragItem = null;
    dropTarget = null;
    if (!dragged || !target || !canManage || !workspaceId || !workflowId) return;

    const stage = stages.find((row) => row.id === target.stageId);
    const moving = stage?.templates.find((row) => row.id === dragged.templateId);
    if (!stage || !moving) return;
    if (!(await ensureSetupChangesSaved())) return;

    const keyOf = (groupId: string | null) => groupId ?? 'root';
    const lists = new Map<string, string[]>();
    for (const groupId of [null, ...groupsOf(stage).map((group) => group.id)]) {
      lists.set(keyOf(groupId), childTemplatesOf(stage, groupId).map((row) => row.id));
    }

    const sourceKey = keyOf(moving.groupId ?? null);
    lists.set(sourceKey, (lists.get(sourceKey) ?? []).filter((id) => id !== moving.id));

    const targetKey = keyOf(target.containerId);
    const targetIds = lists.get(targetKey) ?? [];
    const index = target.beforeId ? targetIds.indexOf(target.beforeId) : -1;
    lists.set(
      targetKey,
      index >= 0
        ? [...targetIds.slice(0, index), moving.id, ...targetIds.slice(index)]
        : [...targetIds, moving.id]
    );

    const items: Array<{ id: string; groupId: string | null; position: number }> = [];
    for (const [key, ids] of lists) {
      ids.forEach((id, position) => items.push({ id, groupId: key === 'root' ? null : key, position }));
    }

    try {
      await api.saveChecklistLayout(workspaceId, workflowId, stage.id, { items });
      await onchange?.();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : tr('setup.itemSaveFailed'));
    }
  }

  // --- Delete Checklist State ---
  let checklistToDelete = $state<{
    stageId: string;
    template: ApiWorkflowSetupStage['templates'][number];
  } | null>(null);
  let deletingChecklist = $state(false);

  function promptDeleteChecklist(
    stageId: string,
    template: ApiWorkflowSetupStage['templates'][number]
  ) {
    checklistToDelete = { stageId, template };
  }

  async function deleteChecklistConfirmed() {
    if (!checklistToDelete || !canManage || !workspaceId || !workflowId) return;
    if (!(await ensureSetupChangesSaved())) return;
    deletingChecklist = true;
    try {
      await api.deleteChecklistTemplate(
        workspaceId,
        workflowId,
        checklistToDelete.stageId,
        checklistToDelete.template.id
      );
      delete checklistRequiredDraft[checklistToDelete.template.id];
      checklistToDelete = null;
      toast.success(tr('setup.itemDeleted'));
      await onchange?.();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : tr('setup.itemDeleteFailed'));
    } finally {
      deletingChecklist = false;
    }
  }
</script>

{#snippet addMenuIcon()}
  <HugeiconsIcon icon={Add01Icon} size={14} strokeWidth={2} />
{/snippet}

<!-- Stage Setup Pipeline Board (Modern Light Design matching Flowboard tokens) -->
<div class="flex gap-4 overflow-x-auto pb-8 pt-1 items-start">
  {#each stages as stage, index (stage.id)}
    {@const requiredCount = (stage.templates?.filter((t) => checklistIsRequired(t)).length ?? 0)}
    {@const totalItems = stage.templates?.length ?? 0}

    {#if canManage && draggingStageIndex !== null && stageDropTargetIndex === index && stageDropTargetIndex !== draggingStageIndex && stageDropTargetIndex !== draggingStageIndex + 1}
      <div
        class="h-[calc(100%-16px)] min-h-[320px] w-1.5 shrink-0 self-center rounded-full bg-primary ring-4 ring-primary/20 transition-all animate-pulse -mx-1 z-20"
        aria-hidden="true"
      ></div>
    {/if}
    <section
      aria-label={`Peringkat ${stage.name}`}
      id={`stage-lane-${stage.id}`}
      class={cn(
        "w-[330px] shrink-0 rounded-2xl bg-canvas-sunken p-3 flex flex-col space-y-3 shadow-xs border border-hairline transition-all duration-150",
        draggingStageIndex === index && "opacity-40 ring-2 ring-primary/40 scale-[0.98]"
      )}
      ondragover={(event) => onStageDragOver(event, index)}
      ondrop={(event) => onStageDrop(event, index)}
      data-onboarding={index === 0 ? 'stage-lane' : undefined}
    >
      <!-- Lane Header -->
      <header
        role="group"
        aria-label={`Tajuk peringkat ${stage.name}`}
        class={cn(
          "mb-1 flex items-center justify-between gap-2 select-none",
          canManage && stages.length > 1 && "cursor-grab active:cursor-grabbing"
        )}
        draggable={canManage && stages.length > 1}
        ondragstart={(e) => onStageDragStart(e, index)}
        ondragend={onStageDragEnd}
      >
        <div class="flex min-w-0 items-center gap-1.5">
          {#if canManage && stages.length > 1}
            <span class="flex size-5 shrink-0 items-center justify-center rounded text-mute/50 hover:text-mute transition-colors cursor-grab active:cursor-grabbing" title="Seret untuk mengubah urutan peringkat" aria-hidden="true">
              <HugeiconsIcon icon={DragDropVerticalIcon} size={15} strokeWidth={1.8} />
            </span>
          {/if}
          <span
            class={cn(
              'size-2.5 shrink-0 rounded-full shadow-xs',
              stageDotClasses[stage.color] ?? 'bg-status-idle'
            )}
            aria-hidden="true"
          ></span>
          {#if editingStageId === stage.id}
            <input
              bind:this={stageNameInput}
              bind:value={editingStageName}
              type="text"
              maxlength="120"
              disabled={savingStageName}
              aria-label={`Edit nama peringkat ${stage.name}`}
              onclick={(event) => event.stopPropagation()}
              onpointerdown={(event) => event.stopPropagation()}
              onkeydown={(event) => handleInlineStageRenameKeydown(event, stage)}
              onblur={() => void finishInlineStageRename(stage)}
              class="h-8 min-w-0 w-36 rounded-md border border-primary bg-card px-2 text-sm font-bold text-ink outline-none ring-2 ring-primary/15"
            />
          {:else}
            <h3
              class={cn(
                'truncate tracking-tight text-sm font-bold text-ink',
                canManage && 'cursor-text'
              )}
              ondblclick={(event) => void startInlineStageRename(event, stage)}
              title={canManage ? 'Klik dua kali untuk mengubah nama peringkat' : stage.name}
            >
              {stage.name}
            </h3>
          {/if}
        </div>

        <div role="presentation" class="flex items-center gap-1.5 shrink-0" ondragstart={(e) => e.stopPropagation()} {...index === 0 ? { 'data-onboarding': 'stage-controls' } : {}}>
          <span class="text-xs font-semibold text-mute px-0.5" title={`${totalItems} checklist item`}>
            {totalItems}
          </span>
          {#if canManage}
            <IconButton
              label={tr('setup.deleteStage')}
              variant="ghost"
              size="sm"
              onclick={() => (stageToDelete = stage)}
              class="h-7 w-7 rounded-md text-mute hover:text-status-urgent-ink hover:bg-status-urgent-soft"
            >
              <HugeiconsIcon icon={Delete02Icon} size={14} strokeWidth={1.8} />
            </IconButton>
          {/if}
        </div>
      </header>

      {#if requiredCount > 0}
        <div class="flex flex-wrap items-center gap-1.5 text-badge text-mute font-medium">
          <span class="rounded-full bg-status-progress-soft text-status-progress-ink px-2 py-0.5 font-bold">
            {requiredCount} {tr('setup.requiredBadge')}
          </span>
        </div>
      {/if}

      {#snippet templateCard(template: TemplateRow, tIndex: number)}
        {@const isRequired = checklistIsRequired(template)}
        {@const hasAction = template.action?.kind && template.action.kind !== 'none'}

        <div
          role="group"
          aria-label={template.label}
          draggable={canManage}
          ondragstart={(e) => startItemDrag(e, stage, template)}
          ondragend={endItemDrag}
          ondragover={(e) => dragOverCard(e, stage, template)}
          ondrop={(e) => dropItem(e, stage)}
          class={cn(
            'group relative rounded-xl bg-card p-3 shadow-card border border-hairline hover:border-hairline-strong hover:shadow-card-hover transition-all duration-150 space-y-1.5',
            canManage && 'cursor-grab active:cursor-grabbing',
            dragItem?.templateId === template.id && 'opacity-50',
            dropTarget?.stageId === stage.id && dropTarget.beforeId === template.id && 'ring-2 ring-primary/50'
          )}
          data-onboarding={index === 0 && tIndex === 0 ? 'checklist-item' : undefined}
        >
          <div class="space-y-1.5">
            <!-- Top Row: Badges & Action Controls -->
            <div class="flex items-center justify-between gap-1">
              <div class="flex flex-wrap items-center gap-1 min-w-0">
                {#if canManage}
                  <button
                    type="button"
                    title={tr('setup.toggleRule')}
                    onclick={() => toggleChecklistRequired(template)}
                    class="cursor-pointer transition-transform active:scale-95 focus:outline-none"
                  >
                    <Badge
                      tone={isRequired ? 'queued' : 'idle'}
                      variant="soft"
                      class="text-badge font-semibold px-2 py-0.5"
                    >
                      {isRequired ? tr('setup.required') : tr('common.optional')}
                    </Badge>
                  </button>
                {:else}
                  <Badge
                    tone={isRequired ? 'queued' : 'idle'}
                    variant="soft"
                    class="text-badge font-semibold px-2 py-0.5"
                  >
                    {isRequired ? tr('setup.required') : tr('common.optional')}
                  </Badge>
                {/if}
                {#if template.deadlineHours}
                  <Badge tone="warning" variant="soft" class="inline-flex items-center gap-1 px-2 py-0.5 text-badge font-semibold">
                    <HugeiconsIcon icon={Clock01Icon} size={11} strokeWidth={1.8} />
                    {tr('setup.checklistDeadlineBadge', { hours: template.deadlineHours })}
                  </Badge>
                {/if}


                {#if hasAction}
                  <button
                    type="button"
                    onclick={() => openEditChecklistModal(stage.id, template)}
                    class="inline-flex items-center gap-1 rounded-full bg-status-done-soft text-status-done-ink px-2 py-0.5 text-badge font-semibold hover:opacity-80 transition-opacity cursor-pointer"
                    title={tr('setup.actionWa')}
                  >
                    <HugeiconsIcon icon={WhatsappIcon} size={11} strokeWidth={2} />
                    <span>{template.action?.kind === 'send' ? tr('setup.sendOnce') : tr('setup.followup')}</span>
                  </button>
                {/if}
              </div>

              {#if canManage}
                <div class="flex items-center gap-0.5 opacity-60 group-hover:opacity-100 transition-opacity ml-auto shrink-0">
                  <IconButton
                    label={tr('setup.actionWa')}
                    variant="ghost"
                    size="sm"
                    onclick={() => openEditChecklistModal(stage.id, template)}
                    class="h-6 w-6 rounded-md text-mute hover:text-status-done-ink hover:bg-status-done-soft"
                  >
                    <HugeiconsIcon icon={WhatsappIcon} size={13} strokeWidth={1.8} />
                  </IconButton>

                  <IconButton
                    label={tr('setup.editItem')}
                    variant="ghost"
                    size="sm"
                    onclick={() => openEditChecklistModal(stage.id, template)}
                    class="h-6 w-6 rounded-md text-mute hover:text-ink hover:bg-lane"
                  >
                    <HugeiconsIcon icon={Edit02Icon} size={13} strokeWidth={1.8} />
                  </IconButton>

                  <IconButton
                    label={tr('setup.deleteItem')}
                    variant="ghost"
                    size="sm"
                    onclick={() => promptDeleteChecklist(stage.id, template)}
                    class="h-6 w-6 rounded-md text-mute hover:text-status-urgent-ink hover:bg-status-urgent-soft"
                  >
                    <HugeiconsIcon icon={Delete02Icon} size={13} strokeWidth={1.8} />
                  </IconButton>
                </div>
              {/if}
            </div>

            <!-- Checklist Item Label -->
            <p class="text-base font-semibold text-ink leading-relaxed break-words pt-0.5">
              {template.label}
            </p>

            <!-- Message Template Snippet Preview (if attached) -->
            {#if hasAction && template.action?.messageTemplate}
              <div class="mt-1.5 flex items-start gap-1.5 rounded-lg bg-canvas-sunken p-2 text-meta text-body">
                <HugeiconsIcon icon={WhatsappIcon} size={13} strokeWidth={2} class="text-status-done-ink shrink-0 mt-0.5" />
                <p class="line-clamp-1 italic text-badge leading-tight text-mute">
                  "{template.action.messageTemplate}"
                </p>
              </div>
            {/if}

          </div>
        </div>
      {/snippet}

      {#snippet groupBlock(group: GroupRow, depth: number)}
        {@const subGroups = childGroupsOf(stage, group.id)}
        {@const items = childTemplatesOf(stage, group.id)}
        <div
          role="presentation"
          ondragover={(e) => dragOverContainer(e, stage, group.id)}
          ondrop={(e) => dropItem(e, stage)}
          class={cn(
            'rounded-xl border border-hairline bg-card p-2 space-y-2 transition-shadow',
            dropTarget?.stageId === stage.id && dropTarget.containerId === group.id && dropTarget.beforeId === null && 'ring-2 ring-primary/50'
          )}
        >
          <div class="flex items-center justify-between gap-1">
            <div class="flex items-center gap-1.5 min-w-0">
              <span class="text-meta font-bold text-ink truncate">{group.name}</span>
              {#if group.requiresCompletion}
                <Badge tone="progress" variant="soft" class="text-badge font-semibold px-2 py-0.5">
                  {tr('setup.gateBadge')}
                </Badge>
              {/if}
            </div>
            {#if canManage}
              <div class="flex items-center gap-0.5 shrink-0">
                <IconButton
                  label={tr('setup.renameGroupTitle')}
                  variant="ghost"
                  size="sm"
                  onclick={() => openRenameGroup(stage.id, group)}
                  class="h-6 w-6 rounded-md text-mute hover:text-ink hover:bg-lane"
                >
                  <HugeiconsIcon icon={Edit02Icon} size={13} strokeWidth={1.8} />
                </IconButton>
                <IconButton
                  label={tr('setup.deleteGroup')}
                  variant="ghost"
                  size="sm"
                  onclick={() => (groupToDelete = { stageId: stage.id, group })}
                  class="h-6 w-6 rounded-md text-mute hover:text-status-urgent-ink hover:bg-status-urgent-soft"
                >
                  <HugeiconsIcon icon={Delete02Icon} size={13} strokeWidth={1.8} />
                </IconButton>
              </div>
            {/if}
          </div>

          <div class="space-y-2 border-l-2 border-hairline pl-2">
            {#each subGroups as subGroup (subGroup.id)}
              {@render groupBlock(subGroup, depth + 1)}
            {/each}
            {#each items as template, tIndex (template.id)}
              {@render templateCard(template, tIndex)}
            {/each}
            {#if subGroups.length === 0 && items.length === 0}
              <p class="text-badge text-faint px-1">{tr('setup.emptyGroup')}</p>
            {/if}
          </div>

          {#if canManage}
            <DropdownMenu
              align="start"
              items={[
                {
                  label: tr('setup.addChecklistItem'),
                  icon: addMenuIcon,
                  onselect: () => openCreateChecklistModal(stage.id, group.id)
                },
                ...(depth < 3
                  ? [
                      {
                        label: tr('setup.addSubgroup'),
                        icon: addMenuIcon,
                        onselect: () => openCreateGroup(stage.id, group.id)
                      }
                    ]
                  : [])
              ]}
            >
              {#snippet trigger({ toggle })}
                <button
                  type="button"
                  onclick={toggle}
                  class="inline-flex cursor-pointer items-center gap-1 rounded-md border border-hairline bg-card px-2 py-1 text-badge font-bold text-ink-soft hover:border-primary hover:text-primary"
                >
                  <HugeiconsIcon icon={Add01Icon} size={12} strokeWidth={2.2} />
                  <span>{tr('setup.addMenu')}</span>
                </button>
              {/snippet}
            </DropdownMenu>
          {/if}
        </div>
      {/snippet}

      <!-- Checklist Items Stack -->
      <div
        role="presentation"
        ondragover={(e) => dragOverContainer(e, stage, null)}
        ondrop={(e) => dropItem(e, stage)}
        class="space-y-2 flex-1 min-h-[40px]"
      >
        {#if totalItems === 0 && groupsOf(stage).length === 0}
          <div class="rounded-xl bg-canvas-sunken/40 p-4 text-center">
            <p class="text-meta font-medium text-mute">{tr('setup.noChecklist')}</p>
            <p class="text-meta text-faint mt-0.5">{tr('setup.typeToAdd')}</p>
          </div>
        {:else}
          {#each childGroupsOf(stage, null) as group (group.id)}
            {@render groupBlock(group, 1)}
          {/each}
          {#each childTemplatesOf(stage, null) as template, tIndex (template.id)}
            {@render templateCard(template, tIndex)}
          {/each}
        {/if}
      </div>

      <!-- Add menu: checklist item or group -->
      {#if canManage}
        <DropdownMenu
          align="start"
          items={[
            {
              label: tr('setup.addChecklistItem'),
              icon: addMenuIcon,
              onselect: () => openCreateChecklistModal(stage.id)
            },
            {
              label: tr('setup.addGroup'),
              icon: addMenuIcon,
              onselect: () => openCreateGroup(stage.id, null)
            }
          ]}
        >
          {#snippet trigger({ toggle })}
            <button
              type="button"
              onclick={toggle}
              data-onboarding={index === 0 ? 'add-checklist-btn' : undefined}
              class="w-full flex items-center justify-center gap-1.5 rounded-xl bg-card py-2.5 px-3 text-meta font-bold text-ink-soft shadow-control hover:border-primary hover:bg-primary-soft hover:text-primary transition-all cursor-pointer group active:scale-[0.99] border border-hairline"
            >
              <HugeiconsIcon icon={Add01Icon} size={15} strokeWidth={2.2} class="text-mute group-hover:text-primary transition-colors" />
              <span>{tr('setup.addMenu')}</span>
            </button>
          {/snippet}
        </DropdownMenu>
      {/if}
    </section>
  {/each}
  {#if canManage && draggingStageIndex !== null && stageDropTargetIndex === stages.length && stageDropTargetIndex !== draggingStageIndex && stageDropTargetIndex !== draggingStageIndex + 1}
    <div
      class="h-[calc(100%-16px)] min-h-[320px] w-1.5 shrink-0 self-center rounded-full bg-primary ring-4 ring-primary/20 transition-all animate-pulse -mx-1 z-20"
      aria-hidden="true"
    ></div>
  {/if}

  <!-- Rightmost "Add Stage" Ghost Lane [Image #3 - Always Visible in Edit Mode] -->
  {#if canManage}
    <button
      type="button"
      onclick={() => (createStageOpen = true)}
      data-onboarding="add-stage-ghost"
      class="w-[280px] shrink-0 min-h-[160px] rounded-2xl border-2 border-dashed border-hairline-strong hover:border-primary hover:bg-primary-soft/30 flex flex-col items-center justify-center p-6 text-center transition-all cursor-pointer group"
      ondragover={(event) => {
        if (draggingStageIndex !== null) {
          event.preventDefault();
          if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
          stageDropTargetIndex = stages.length;
        }
      }}
      ondrop={(event) => onStageDrop(event, stages.length)}
    >
      <div class="flex h-10 w-10 items-center justify-center rounded-full bg-lane group-hover:bg-primary-soft group-hover:text-primary transition-colors text-mute mb-2">
        <HugeiconsIcon icon={Add01Icon} size={20} strokeWidth={2} />
      </div>
      <p class="text-meta font-bold text-ink group-hover:text-primary transition-colors">
        {tr('setup.newStage')}
      </p>
      <p class="text-badge text-mute mt-0.5">
        {tr('setup.newStageDescription')}
      </p>
    </button>
  {/if}
</div>

<!-- Modal: Add Stage -->
<Dialog
  bind:open={createStageOpen}
  title={tr('setup.newStage')}
  description={tr('setup.newStageDescription')}
  size="xl"
>
  <form
    onsubmit={(e) => {
      e.preventDefault();
      createStage();
    }}
    class="space-y-4 py-2"
  >
    <FormField label={tr('setup.stageName')} required helper={tr('setup.stageNameHelper')}>
      {#snippet control(args)}
        <Input
          {...args}
          bind:value={newStageName}
          placeholder={tr('setup.stageNamePlaceholder')}
          class="h-10 text-base"
          autofocus
        />
      {/snippet}
    </FormField>

  </form>
  {#snippet footer()}
    <div class="flex justify-end gap-2">
      <Button variant="secondary" onclick={() => (createStageOpen = false)}>
        {tr('setup.cancel')}
      </Button>
      <Button
        variant="primary"
        onclick={createStage}
        loading={creatingStage}
        disabled={!newStageName.trim()}
      >
        <HugeiconsIcon icon={Add01Icon} size={18} strokeWidth={1.8} />
        <span>{tr('setup.addStage')}</span>
      </Button>
    </div>
  {/snippet}
</Dialog>

<!-- Modal: Confirm Delete Stage -->
<ConfirmDialog
  open={stageToDelete !== null}
  title={tr('setup.deleteStageTitle', { name: stageToDelete?.name ?? '' })}
  description={tr('setup.deleteStageDescription')}
  confirmLabel={tr('setup.deleteStage')}
  cancelLabel={tr('setup.cancel')}
  destructive
  loading={deletingStage}
  onconfirm={deleteStageConfirmed}
  oncancel={() => (stageToDelete = null)}
/>

<!-- Modal: Create / Rename Checklist Group -->
<Dialog
  bind:open={groupModalOpen}
  title={groupModalMode === 'create' ? tr('setup.newGroupTitle') : tr('setup.renameGroupTitle')}
  description={tr('setup.groupMaxDepth')}
  size="sm"
>
  <form
    onsubmit={(e) => {
      e.preventDefault();
      saveGroupModal();
    }}
    class="space-y-4 py-2"
  >
    <FormField label={tr('setup.groupNameLabel')} required>
      {#snippet control(args)}
        <Input
          {...args}
          bind:value={groupModalName}
          placeholder={tr('setup.groupNameLabel')}
          class="h-10 text-base"
          autofocus
          required
        />
      {/snippet}
    </FormField>

    <div class="rounded-xl border border-hairline bg-canvas-sunken p-3 flex items-center justify-between gap-3">
      <span class="text-meta font-bold text-ink">{tr('setup.groupRequiresCompletion')}</span>
      <Switch bind:checked={groupModalGate} />
    </div>
  </form>
  {#snippet footer()}
    <div class="flex justify-end gap-2">
      <Button variant="secondary" onclick={() => (groupModalOpen = false)}>
        {tr('setup.cancel')}
      </Button>
      <Button
        variant="primary"
        onclick={saveGroupModal}
        loading={savingGroup}
        disabled={!groupModalName.trim()}
      >
        <span>{groupModalMode === 'create' ? tr('setup.createGroup') : tr('setup.saveGroup')}</span>
      </Button>
    </div>
  {/snippet}
</Dialog>

<!-- Modal: Delete Checklist Group (choose what happens to its contents) -->
<Dialog
  open={groupToDelete !== null}
  onclose={() => (groupToDelete = null)}
  title={tr('setup.deleteGroupTitle', { label: groupToDelete?.group?.name ?? '' })}
  description={tr('setup.deleteGroupDescription')}
  size="sm"
>
  <p class="text-meta text-mute py-2">{tr('setup.deleteGroupNote')}</p>
  {#snippet footer()}
    <div class="flex flex-wrap justify-end gap-2">
      <Button variant="secondary" onclick={() => (groupToDelete = null)}>
        {tr('setup.cancel')}
      </Button>
      <Button variant="secondary" loading={deletingGroup} onclick={() => deleteGroupConfirmed('move_up')}>
        {tr('setup.deleteGroupMoveUp')}
      </Button>
      <Button variant="destructive" loading={deletingGroup} onclick={() => deleteGroupConfirmed('with_items')}>
        {tr('setup.deleteGroupWithItems')}
      </Button>
    </div>
  {/snippet}
</Dialog>

<!-- Modal: Confirm Delete Checklist -->
<ConfirmDialog
  open={checklistToDelete !== null}
  title={tr('setup.deleteChecklistTitle', { label: checklistToDelete?.template?.label ?? '' })}
  description={tr('setup.deleteChecklistDescription')}
  confirmLabel={tr('setup.deleteChecklistConfirm')}
  cancelLabel={tr('setup.cancel')}
  destructive
  loading={deletingChecklist}
  onconfirm={deleteChecklistConfirmed}
  oncancel={() => (checklistToDelete = null)}
/>

<!-- Modal: Create / Edit Checklist Item with WhatsApp Automation -->
<Dialog
  bind:open={checklistModalOpen}
  title={checklistModalMode === 'create' ? tr('setup.newChecklistTitle') : tr('setup.editChecklistTitle')}
  description={checklistModalMode === 'create' ? tr('setup.newChecklistDescription') : tr('setup.editChecklistDescription')}
  size="md"
>
  <form
    onsubmit={(e) => {
      e.preventDefault();
      saveChecklistModal();
    }}
    class="space-y-4 py-2"
  >
    <FormField label={tr('setup.checklistLabel')} required helper={tr('setup.checklistLabelExample')}>
      {#snippet control(args)}
        <Input
          {...args}
          bind:value={checklistModalLabel}
          placeholder={tr('setup.checklistLabelExample')}
          class="h-10 text-base"
          autofocus
          required
        />
      {/snippet}
    </FormField>

    <!-- Requirement Switch Card -->
    <div class="flex items-center justify-between gap-3 rounded-xl border border-hairline bg-canvas-sunken p-3">
      <div class="min-w-0">
        <span class="text-meta font-bold text-ink block">{tr('setup.requiredComplete')}</span>
        <p class="text-badge text-mute">{tr('setup.stageRequirement')}</p>
      </div>
      <Switch bind:checked={checklistModalRequired} size="sm" aria-label={tr('setup.requiredComplete')} />
    </div>

    <FormField label={tr('setup.checklistDeadline')} helper={tr('setup.checklistDeadlineHelper')}>
      {#snippet control(args)}
        <Input
          {...args}
          type="number"
          min="1"
          max="720"
          bind:value={checklistModalDeadline}
          placeholder={tr('setup.checklistDeadlinePlaceholder')}
          class="h-10"
        />
      {/snippet}
    </FormField>

    <!-- WhatsApp Automation Settings Box -->
    <div class="space-y-3 rounded-xl border border-hairline bg-card p-3.5 shadow-xs">
      <div class="flex items-center gap-2">
        <div class="flex h-6 w-6 items-center justify-center rounded-full bg-status-done-soft text-status-done-ink shrink-0">
          <HugeiconsIcon icon={WhatsappIcon} size={14} strokeWidth={2} />
        </div>
        <div>
          <span class="text-meta font-bold text-ink block">{tr('setup.whatsappAction')}</span>
          <p class="text-badge text-mute">{tr('setup.whatsappActionDescription')}</p>
        </div>
      </div>

      <FormField label={tr('setup.actionType')}>
        {#snippet control()}
          <SelectMenu
            options={actionKindOptions}
            bind:value={checklistModalActionKind}
          />
        {/snippet}
      </FormField>

      {#if checklistModalActionKind !== 'none'}
        <FormField
          label={tr('setup.messageTemplate')}
          helper={tr('setup.templateHelper')}
          required
        >
          {#snippet control(args)}
            <div class="space-y-2">
              <Textarea
                {...args}
                bind:value={checklistModalMessage}
                rows={4}
                placeholder={tr('setup.templatePlaceholder')}
                required
              />
              <div class="flex flex-wrap items-center gap-1.5 pt-0.5">
                <span class="text-badge text-mute font-medium">{tr('setup.insertVariable')}</span>
                {#each ['{{nama}}', '{{wa}}', '{{product}}', '{{tag}}', '{{link}}'] as v}
                  <button
                    type="button"
                    onclick={() => insertVariable(v)}
                    class="inline-flex items-center rounded-md bg-lane px-1.5 py-0.5 text-badge font-mono font-semibold text-primary hover:bg-primary-soft hover:border-primary-border/60 transition-colors cursor-pointer"
                  >
                    {v}
                  </button>
                {/each}
              </div>
            </div>
          {/snippet}
        </FormField>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FormField label={tr('setup.delay')}>
            {#snippet control(args)}
              <Input
                {...args}
                type="number"
                min="0"
                bind:value={checklistModalDelay}
                class="h-9 text-meta"
              />
            {/snippet}
          </FormField>

          {#if checklistModalActionKind === 'followup'}
            <div class="flex items-end pb-2">
              <label class="flex items-center gap-2 text-meta text-ink cursor-pointer select-none">
                <Checkbox bind:checked={checklistModalFollowupIfNoReply} />
                <span>{tr('setup.onlyIfNoReply')}</span>
              </label>
            </div>
          {/if}
        </div>
      {/if}
    </div>
  </form>
  {#snippet footer()}
    <div class="flex justify-end gap-2">
      <Button variant="secondary" onclick={() => (checklistModalOpen = false)}>
        {tr('setup.cancel')}
      </Button>
      <Button
        variant="primary"
        onclick={saveChecklistModal}
        loading={savingChecklistModal}
        disabled={!checklistModalLabel.trim() || (checklistModalActionKind !== 'none' && !checklistModalMessage.trim())}
      >
        <HugeiconsIcon icon={Tick02Icon} size={16} strokeWidth={1.8} />
        <span>{checklistModalMode === 'create' ? tr('setup.createChecklistItem') : tr('setup.saveChecklistItem')}</span>
      </Button>
    </div>
  {/snippet}
</Dialog>
