<script lang="ts">
  import { cn } from '$lib/utils.js';
  import {
    api,
    ApiError,
    type ApiWorkflow,
    type ApiWorkflowSetupStage
  } from '$lib/api/client';
  import {
    Button,
    IconButton,
    Checkbox,
    Input,
    Badge,
    Textarea
  } from '$lib/components/atoms/index.js';
  import {
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
    ArrowRight01Icon,
    ArrowLeft01Icon,
    Clock01Icon,
    Alert02Icon,
    Tick02Icon,
    PlayIcon,
    WhatsappIcon,
    FlowConnectionIcon,
    CheckmarkBadge01Icon,
    CircleIcon,
    DragDropVerticalIcon
  } from '@hugeicons/core-free-icons';
  import { dashboardText } from '$lib/i18n/dashboard.js';
  import { locale } from '$lib/i18n/index.js';

  const tr = (key: string, values?: Record<string, string | number>) =>
    dashboardText($locale, key, values);

  type Props = {
    workspaceId: string;
    workflowId: string;
    stages: ApiWorkflowSetupStage[];
    allWorkflows?: ApiWorkflow[];
    canManage?: boolean;
    openCreateStageModal?: () => void;
    onchange?: () => void | Promise<void>;
  };

  let {
    workspaceId,
    workflowId,
    stages = $bindable([]),
    allWorkflows = [],
    canManage = true,
    openCreateStageModal = $bindable(),
    onchange
  }: Props = $props();

  // Color Definitions & Meta
  const stageColorOptions = [
    'indigo',
    'amber',
    'emerald',
    'rose',
    'cyan',
    'violet',
    'fuchsia',
    'teal'
  ] as const;

  const stageColorMeta: Record<
    string,
    {
      name: string;
      description: string;
      icon: any;
      bgBadge: string;
      textBadge: string;
      borderBadge: string;
      color: string;
    }
  > = {
    indigo: {
      name: 'Indigo',
      description: tr('setup.colorIndigo'),
      icon: Clock01Icon,
      bgBadge: 'bg-primary-soft',
      textBadge: 'text-primary',
      borderBadge: 'border-primary-border/60',
      color: '#6366f1'
    },
    amber: {
      name: 'Amber',
      description: tr('setup.colorAmber'),
      icon: PlayIcon,
      bgBadge: 'bg-status-progress-soft',
      textBadge: 'text-status-progress-ink',
      borderBadge: 'border-status-progress-border/60',
      color: '#f59e0b'
    },
    emerald: {
      name: 'Hijau',
      description: tr('setup.colorEmerald'),
      icon: Tick02Icon,
      bgBadge: 'bg-status-done-soft',
      textBadge: 'text-status-done-ink',
      borderBadge: 'border-status-done-border/60',
      color: '#10b981'
    },
    rose: {
      name: 'Mawar',
      description: tr('setup.colorRose'),
      icon: Alert02Icon,
      bgBadge: 'bg-status-urgent-soft',
      textBadge: 'text-status-urgent-ink',
      borderBadge: 'border-status-urgent-border/60',
      color: '#f43f5e'
    },
    cyan: {
      name: 'Cyan',
      description: tr('setup.colorCyan'),
      icon: CircleIcon,
      bgBadge: 'bg-cyan-50 dark:bg-cyan-950/30',
      textBadge: 'text-cyan-700 dark:text-cyan-300',
      borderBadge: 'border-cyan-200 dark:border-cyan-800',
      color: '#06b6d4'
    },
    violet: {
      name: 'Ungu',
      description: tr('setup.colorViolet'),
      icon: CircleIcon,
      bgBadge: 'bg-violet-50 dark:bg-violet-950/30',
      textBadge: 'text-violet-700 dark:text-violet-300',
      borderBadge: 'border-violet-200 dark:border-violet-800',
      color: '#8b5cf6'
    },
    fuchsia: {
      name: 'Fuchsia',
      description: tr('setup.colorFuchsia'),
      icon: CircleIcon,
      bgBadge: 'bg-fuchsia-50 dark:bg-fuchsia-950/30',
      textBadge: 'text-fuchsia-700 dark:text-fuchsia-300',
      borderBadge: 'border-fuchsia-200 dark:border-fuchsia-800',
      color: '#d946ef'
    },
    teal: {
      name: 'Teal',
      description: tr('setup.colorTeal'),
      icon: CircleIcon,
      bgBadge: 'bg-teal-50 dark:bg-teal-950/30',
      textBadge: 'text-teal-700 dark:text-teal-300',
      borderBadge: 'border-teal-200 dark:border-teal-800',
      color: '#14b8a6'
    }
  };

  const customColorPresets = [
    '#ef4444', '#f97316', '#eab308', '#84cc16',
    '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1',
    '#8b5cf6', '#a855f7', '#d946ef', '#ec4899',
    '#64748b', '#78716c'
  ];

  const isCustomColor = (color: string) => !stageColorOptions.includes(color as any);

  const resolveColorMeta = (color: string) => {
    if (stageColorMeta[color]) return stageColorMeta[color];
    return {
      name: color.startsWith('#') ? color.toUpperCase() : color,
      description: 'Custom color',
      icon: CircleIcon,
      bgBadge: 'bg-lane',
      textBadge: 'text-ink',
      borderBadge: 'border-hairline',
      color: color.startsWith('#') ? color : '#6366f1'
    };
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
  let newStageColor = $state<string>('indigo');
  let newStageCustomColor = $state<string | null>(null);
  let newStageNextWorkflowId = $state<string>('');
  let newStageAutoNextOnLastChecklist = $state(false);
  let newStageNotifyOnReply = $state(false);
  let newStageOverdueHours = $state('');
  let creatingStage = $state(false);

  // Expose openCreateStageModal to parent
  $effect(() => {
    openCreateStageModal = () => {
      newStageName = '';
      newStageColor = 'indigo';
      newStageCustomColor = null;
      newStageNextWorkflowId = '';
      newStageAutoNextOnLastChecklist = false;
      newStageNotifyOnReply = false;
      newStageOverdueHours = '';
      createStageOpen = true;
    };
  });

  async function createStage() {
    if (!newStageName.trim() || !canManage || !workspaceId || !workflowId) return;
    if (!(await ensureSetupChangesSaved())) return;
    creatingStage = true;
    try {
      const reminderHours = parseReminderHours(newStageOverdueHours);
      if (reminderHours === undefined) {
        toast.error(tr('setup.invalidHoursGeneric'));
        creatingStage = false;
        return;
      }
      const res = await api.createStage(workspaceId, workflowId, {
        name: newStageName.trim(),
        color: newStageColor
      });
      if (newStageNextWorkflowId || newStageNotifyOnReply || reminderHours) {
        await api.updateStage(workspaceId, workflowId, res.stage.id, {
          nextWorkflowId: newStageNextWorkflowId || null,
          onReplyNotify: newStageNotifyOnReply,
          overdueReminderHours: reminderHours
        });
      }
      createStageOpen = false;
      toast.success(tr('setup.stageAdded'));
      await onchange?.();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : tr('setup.addStageFailed'));
    } finally {
      creatingStage = false;
    }
  }

  // --- Edit Stage Modal State ---
  let editStageOpen = $state(false);
  let stageToEdit = $state<ApiWorkflowSetupStage | null>(null);
  let editStageName = $state('');
  let editStageColor = $state<string>('indigo');
  let editStageCustomColor = $state<string | null>(null);
  let editStageNextWorkflowId = $state<string>('');
  let editStageAutoNextOnLastChecklist = $state(false);
  let editNotifyOnReply = $state(false);
  let editOverdueHours = $state('');
  let savingEditStage = $state(false);

  function startEditStage(stage: ApiWorkflowSetupStage) {
    stageToEdit = stage;
    editStageName = stage.name;
    const draft = stageAutomationDraft[stage.id];
    editNotifyOnReply = draft?.onReplyNotify ?? stage.onReplyNotify ?? false;
    editOverdueHours = draft?.overdueReminderHours ?? (stage.overdueReminderHours == null ? '' : String(stage.overdueReminderHours));
    editStageColor = stage.color || 'indigo';
    editStageCustomColor = isCustomColor(stage.color) ? stage.color : null;
    editStageNextWorkflowId = stage.nextWorkflowId ?? '';
    editStageOpen = true;
  }

  function closeEditStage() {
    editStageOpen = false;
    stageToEdit = null;
  }

  async function saveEditStage() {
    if (!stageToEdit || !editStageName.trim() || !canManage || !workspaceId || !workflowId) return;
    if (!(await ensureSetupChangesSaved())) return;
    const reminderHours = parseReminderHours(editOverdueHours);
    if (reminderHours === undefined) {
      toast.error(tr('setup.invalidHoursGeneric'));
      return;
    }
    savingEditStage = true;
    try {
      await api.updateStage(workspaceId, workflowId, stageToEdit.id, {
        name: editStageName.trim(),
        color: editStageColor,
        nextWorkflowId: editStageNextWorkflowId || null,
        onReplyNotify: editNotifyOnReply,
        overdueReminderHours: reminderHours
      });
      closeEditStage();
      toast.success(tr('setup.stageSaved'));
      await onchange?.();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : tr('setup.saveStageFailed'));
    } finally {
      savingEditStage = false;
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

  // --- Move Stage (Reorder) ---
  let reordering = $state(false);
  async function moveStage(index: number, direction: 'up' | 'down') {
    if (!canManage || !workspaceId || !workflowId || reordering) return;
    if (!(await ensureSetupChangesSaved())) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= stages.length) return;

    reordering = true;
    const originalStages = [...stages];
    const newStages = [...stages];
    const [moved] = newStages.splice(index, 1);
    newStages.splice(targetIndex, 0, moved);
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
  let checklistModalTemplateId = $state<string | null>(null);
  let checklistModalLabel = $state('');
  let checklistModalRequired = $state(true);
  let checklistModalActionKind = $state<'none' | 'send' | 'followup'>('none');
  let checklistModalMessage = $state('');
  let checklistModalDelay = $state('0');
  let checklistModalFollowupIfNoReply = $state(false);
  let savingChecklistModal = $state(false);

  const actionKindOptions = [
    { value: 'none', label: tr('setup.actionNone') },
    { value: 'send', label: tr('setup.actionSend') },
    { value: 'followup', label: tr('setup.actionFollowup') }
  ];

  function openCreateChecklistModal(stageId: string) {
    checklistModalStageId = stageId;
    checklistModalTemplateId = null;
    checklistModalMode = 'create';
    checklistModalLabel = '';
    checklistModalRequired = true;
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
    checklistModalActionKind = (template.action?.kind as any) || 'none';
    checklistModalMessage = template.action?.messageTemplate || '';
    checklistModalDelay = String(template.action?.delayMinutes ?? 0);
    checklistModalFollowupIfNoReply = template.action?.followupIfNoReply ?? false;
    checklistModalOpen = true;
  }

  function insertVariable(variable: string) {
    checklistModalMessage = checklistModalMessage ? `${checklistModalMessage} ${variable}` : variable;
  }

  async function saveChecklistModal() {
    if (!canManage || !workspaceId || !workflowId || !checklistModalStageId) return;
    if (!(await ensureSetupChangesSaved())) return;
    const label = checklistModalLabel.trim();
    if (!label) return;

    savingChecklistModal = true;
    try {
      const delay = Math.max(0, parseInt(checklistModalDelay) || 0);
      if (checklistModalMode === 'create') {
        const res = await api.createChecklistTemplate(workspaceId, workflowId, checklistModalStageId, {
          label,
          required: checklistModalRequired
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
            required: checklistModalRequired
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

<!-- Stage Setup Pipeline Board (Modern Light Design matching Flowboard tokens) -->
<div class="flex gap-4 overflow-x-auto pb-8 pt-1 items-start">
  {#each stages as stage, index (stage.id)}
    {@const meta = resolveColorMeta(stage.color)}
    {@const targetWf = allWorkflows.find((w) => w.id === stage.nextWorkflowId)}
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
      <!-- Lane Header Card -->
      <div
        role="group"
        aria-label={`Tajuk peringkat ${stage.name}`}
        class={cn(
          "relative rounded-xl bg-card p-3.5 shadow-card space-y-2.5 overflow-hidden border border-hairline select-none",
          canManage && stages.length > 1 && "cursor-grab active:cursor-grabbing"
        )}
        draggable={canManage && stages.length > 1}
        ondragstart={(e) => onStageDragStart(e, index)}
        ondragend={onStageDragEnd}
      >
        <!-- Top Row: Stage Step, Color Badge & Controls -->
        <div class="flex items-center justify-between gap-2 pt-0.5">
          <div class="flex items-center gap-1.5 min-w-0">
            {#if canManage && stages.length > 1}
              <span class="flex size-5 shrink-0 items-center justify-center rounded text-mute/50 hover:text-mute transition-colors cursor-grab active:cursor-grabbing" title="Seret untuk mengubah urutan peringkat" aria-hidden="true">
                <HugeiconsIcon icon={DragDropVerticalIcon} size={15} strokeWidth={1.8} />
              </span>
            {/if}
            <span class="inline-flex h-6 w-6 items-center justify-center rounded-full bg-lane text-[13px] font-bold text-ink-soft shrink-0">
              {index + 1}
            </span>
            <span
              class="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[13px] font-semibold border {meta.bgBadge} {meta.textBadge} {meta.borderBadge} shrink-0"
            >
              <HugeiconsIcon icon={meta.icon} size={13} strokeWidth={2} />
              <span>{meta.name}</span>
            </span>
          </div>

          {#if canManage}
            <div class="flex items-center gap-0.5 shrink-0 text-mute" ondragstart={(e) => e.stopPropagation()} {...index === 0 ? { 'data-onboarding': 'stage-controls' } : {}}>
              <IconButton
                label={tr('setup.moveLeft')}
                variant="ghost"
                size="sm"
                disabled={index === 0 || reordering}
                onclick={() => moveStage(index, 'up')}
                class="h-6 w-6 rounded-lg text-mute hover:text-ink hover:bg-lane disabled:opacity-20"
              >
                <HugeiconsIcon icon={ArrowLeft01Icon} size={13} strokeWidth={1.8} />
              </IconButton>

              <IconButton
                label={tr('setup.moveRight')}
                variant="ghost"
                size="sm"
                disabled={index === stages.length - 1 || reordering}
                onclick={() => moveStage(index, 'down')}
                class="h-6 w-6 rounded-lg text-mute hover:text-ink hover:bg-lane disabled:opacity-20"
              >
                <HugeiconsIcon icon={ArrowRight01Icon} size={13} strokeWidth={1.8} />
              </IconButton>

              <IconButton
                label={tr('setup.editStage')}
                variant="ghost"
                size="sm"
                onclick={() => startEditStage(stage)}
                class="h-6 w-6 rounded-lg text-mute hover:text-primary hover:bg-primary-soft"
              >
                <HugeiconsIcon icon={Edit02Icon} size={13} strokeWidth={1.8} />
              </IconButton>

              <IconButton
                label={tr('setup.deleteStage')}
                variant="ghost"
                size="sm"
                onclick={() => (stageToDelete = stage)}
                class="h-6 w-6 rounded-lg text-mute hover:text-status-urgent-ink hover:bg-status-urgent-soft"
              >
                <HugeiconsIcon icon={Delete02Icon} size={13} strokeWidth={1.8} />
              </IconButton>
            </div>
          {/if}
        </div>

        <!-- Stage Title & Counters -->
        <div>
          <h3 class="text-base font-bold text-ink leading-snug break-words tracking-tight">
            {stage.name}
          </h3>
          <div class="mt-1 flex items-center gap-1.5 text-[12px] text-mute font-medium">
            <span class="rounded-full bg-lane px-2 py-0.5">
              {totalItems} {totalItems === 1 ? tr('setup.itemCountOne') : tr('setup.itemCountMany')}
            </span>
            {#if requiredCount > 0}
              <span class="rounded-full bg-status-progress-soft text-status-progress-ink px-2 py-0.5 font-bold">
                {requiredCount} {tr('setup.requiredBadge')}
              </span>
            {/if}
          </div>
        </div>

        <!-- Next workflow routing indicator if configured -->
        {#if targetWf}
          <div class="flex items-center gap-1.5 rounded-lg bg-primary-soft/60 px-2.5 py-1.5 text-[12px] font-medium text-primary border border-primary/20">
            <HugeiconsIcon icon={FlowConnectionIcon} size={13} strokeWidth={2} class="shrink-0" />
            <span class="truncate">
              {tr('setup.autoNextTo', { name: targetWf.name })}
            </span>
          </div>
        {/if}
      </div>

      <!-- Checklist Items Stack -->
      <div class="space-y-2 flex-1 min-h-[40px]">
        {#if totalItems === 0}
          <div class="rounded-xl bg-canvas-sunken/40 p-4 text-center">
            <p class="text-[13px] font-medium text-mute">{tr('setup.noChecklist')}</p>
            <p class="text-[13px] text-faint mt-0.5">{tr('setup.typeToAdd')}</p>
          </div>
        {:else}
          {#each stage.templates as template, tIndex (template.id)}
            {@const isRequired = checklistIsRequired(template)}
            {@const hasAction = template.action?.kind && template.action.kind !== 'none'}

            <div
              class="group relative rounded-xl bg-card p-3 shadow-card border border-hairline hover:border-hairline-strong hover:shadow-card-hover transition-all duration-150 space-y-1.5"
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
                          class="text-[12px] font-semibold px-2 py-0.2"
                        >
                          {isRequired ? tr('setup.required') : tr('common.optional')}
                        </Badge>
                      </button>
                    {:else}
                      <Badge
                        tone={isRequired ? 'queued' : 'idle'}
                        variant="soft"
                        class="text-[12px] font-semibold px-2 py-0.2"
                      >
                        {isRequired ? tr('setup.required') : tr('common.optional')}
                      </Badge>
                    {/if}

                    {#if hasAction}
                      <button
                        type="button"
                        onclick={() => openEditChecklistModal(stage.id, template)}
                        class="inline-flex items-center gap-1 rounded-full bg-status-done-soft text-status-done-ink px-2 py-0.2 text-[12px] font-semibold hover:opacity-80 transition-opacity cursor-pointer"
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
                  <div class="mt-1.5 flex items-start gap-1.5 rounded-lg bg-canvas-sunken p-2 text-[13px] text-body">
                    <HugeiconsIcon icon={WhatsappIcon} size={13} strokeWidth={2} class="text-status-done-ink shrink-0 mt-0.5" />
                    <p class="line-clamp-1 italic text-[12px] leading-tight text-mute">
                      "{template.action.messageTemplate}"
                    </p>
                  </div>
                {/if}
              </div>
            </div>
          {/each}
        {/if}
      </div>

      <!-- Add Checklist Item Action Button -->
      {#if canManage}
        <button
          type="button"
          onclick={() => openCreateChecklistModal(stage.id)}
          class="w-full flex items-center justify-center gap-1.5 rounded-xl bg-card py-2.5 px-3 text-[13px] font-bold text-ink-soft shadow-control hover:border-primary hover:bg-primary-soft hover:text-primary transition-all cursor-pointer group active:scale-[0.99] border border-hairline"
          data-onboarding={index === 0 ? 'add-checklist-btn' : undefined}
        >
          <HugeiconsIcon icon={Add01Icon} size={15} strokeWidth={2.2} class="text-mute group-hover:text-primary transition-colors" />
          <span>{tr('setup.addChecklistItem')}</span>
        </button>
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
      <p class="text-[13px] font-bold text-ink group-hover:text-primary transition-colors">
        {tr('setup.newStage')}
      </p>
      <p class="text-[12px] text-mute mt-0.5">
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

    <!-- Visual Color & Icon Badge Picker -->
    <div class="space-y-3">
      <div>
        <span class="ds-label text-ink font-semibold text-[13px] block">{tr('setup.colorIcon')}</span>
        <p class="text-[13px] text-mute mt-0.5">{tr('setup.colorIconDescription')}</p>
      </div>
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {#each stageColorOptions as colorKey}
          {@const kMeta = stageColorMeta[colorKey]}
          {@const isSelected = !newStageCustomColor && newStageColor === colorKey}
          <button
            type="button"
            onclick={() => { newStageColor = colorKey; newStageCustomColor = null; }}
            class="flex flex-col items-center gap-1.5 rounded-xl p-2.5 text-center transition-all cursor-pointer {isSelected ? 'bg-primary-soft/40 ring-2 ring-primary shadow-sm' : 'bg-card hover:bg-lane ring-1 ring-hairline/30'}"
          >
            <span
              class="flex h-8 w-8 items-center justify-center rounded-full text-white shadow-sm"
              style="background-color: {kMeta.color};"
            >
              <HugeiconsIcon icon={kMeta.icon} size={16} strokeWidth={2} />
            </span>
            <span class="text-[13px] font-semibold text-ink">{kMeta.name}</span>
            <span class="text-[12px] text-mute">{kMeta.description}</span>
          </button>
        {/each}
      </div>

      <!-- Custom color picker -->
      <div class="rounded-xl bg-canvas-sunken/50 ring-1 ring-hairline/30 p-3.5 space-y-2.5">
        <div class="flex items-center justify-between">
          <span class="text-[13px] font-semibold text-ink">Custom color</span>
          <div class="flex items-center gap-2">
            <input
              type="color"
              value={newStageCustomColor ?? '#6366f1'}
              oninput={(e) => { newStageCustomColor = e.currentTarget.value; newStageColor = e.currentTarget.value; }}
              class="h-8 w-10 cursor-pointer rounded-lg border-0 bg-transparent p-0"
              aria-label="Pick custom color"
            />
            {#if newStageCustomColor}
              <span class="text-[12px] font-mono text-mute uppercase">{newStageCustomColor}</span>
              <button
                type="button"
                onclick={() => { newStageCustomColor = null; newStageColor = 'indigo'; }}
                class="text-[12px] text-mute hover:text-ink transition-colors"
              >
                Reset
              </button>
            {/if}
          </div>
        </div>
        <div class="flex flex-wrap gap-1.5">
          {#each customColorPresets as preset}
            <button
              type="button"
              onclick={() => { newStageCustomColor = preset; newStageColor = preset; }}
              class="size-6 rounded-full ring-1 ring-hairline/30 transition-transform hover:scale-110 {newStageCustomColor === preset ? 'ring-2 ring-primary ring-offset-1' : ''}"
              style="background-color: {preset};"
              aria-label={preset}
            ></button>
          {/each}
        </div>
      </div>
    </div>
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

<!-- Modal: Edit Stage -->
<Dialog
  bind:open={editStageOpen}
  onclose={closeEditStage}
  title={tr('setup.editStageTitle', { name: stageToEdit?.name ?? '' })}
  description={tr('setup.editStageDescription')}
  size="xl"
>
  <form
    onsubmit={(e) => {
      e.preventDefault();
      saveEditStage();
    }}
    class="space-y-4 py-2"
  >
    <FormField label={tr('setup.stageName')} required>
      {#snippet control(args)}
        <Input
          {...args}
          bind:value={editStageName}
          class="h-10 text-base"
          autofocus
        />
      {/snippet}
    </FormField>

    <!-- Color Picker -->
    <div class="space-y-3">
      <div>
        <span class="ds-label text-ink font-semibold text-[13px] block">{tr('setup.colorIcon')}</span>
        <p class="text-[13px] text-mute mt-0.5">{tr('setup.colorIconDescription')}</p>
      </div>
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {#each stageColorOptions as colorKey}
          {@const kMeta = stageColorMeta[colorKey]}
          {@const isSelected = !editStageCustomColor && editStageColor === colorKey}
          <button
            type="button"
            onclick={() => { editStageColor = colorKey; editStageCustomColor = null; }}
            class="flex flex-col items-center gap-1.5 rounded-xl p-2.5 text-center transition-all cursor-pointer {isSelected ? 'bg-primary-soft/40 ring-2 ring-primary shadow-sm' : 'bg-card hover:bg-lane ring-1 ring-hairline/30'}"
          >
            <span
              class="flex h-8 w-8 items-center justify-center rounded-full text-white shadow-sm"
              style="background-color: {kMeta.color};"
            >
              <HugeiconsIcon icon={kMeta.icon} size={16} strokeWidth={2} />
            </span>
            <span class="text-[13px] font-semibold text-ink">{kMeta.name}</span>
            <span class="text-[12px] text-mute">{kMeta.description}</span>
          </button>
        {/each}
      </div>

      <div class="rounded-xl bg-canvas-sunken/50 ring-1 ring-hairline/30 p-3.5 space-y-2.5">
        <div class="flex items-center justify-between">
          <span class="text-[13px] font-semibold text-ink">Custom color</span>
          <div class="flex items-center gap-2">
            <input
              type="color"
              value={editStageCustomColor ?? '#6366f1'}
              oninput={(e) => { editStageCustomColor = e.currentTarget.value; editStageColor = e.currentTarget.value; }}
              class="h-8 w-10 cursor-pointer rounded-lg border-0 bg-transparent p-0"
              aria-label="Pick custom color"
            />
            {#if editStageCustomColor}
              <span class="text-[12px] font-mono text-mute uppercase">{editStageCustomColor}</span>
              <button
                type="button"
                onclick={() => { editStageCustomColor = null; editStageColor = 'indigo'; }}
                class="text-[12px] text-mute hover:text-ink transition-colors"
              >
                Reset
              </button>
            {/if}
          </div>
        </div>
        <div class="flex flex-wrap gap-1.5">
          {#each customColorPresets as preset}
            <button
              type="button"
              onclick={() => { editStageCustomColor = preset; editStageColor = preset; }}
              class="size-6 rounded-full ring-1 ring-hairline/30 transition-transform hover:scale-110 {editStageCustomColor === preset ? 'ring-2 ring-primary ring-offset-1' : ''}"
              style="background-color: {preset};"
              aria-label={preset}
            ></button>
          {/each}
        </div>
      </div>
    </div>

    <!-- Workflow Transition Automation -->
    <div class="space-y-3 rounded-xl border border-hairline bg-canvas-sunken/40 p-4">
      <div class="flex items-center gap-2">
        <HugeiconsIcon icon={FlowConnectionIcon} size={16} strokeWidth={2} class="text-primary" />
        <span class="text-[13px] font-bold text-ink">{tr('setup.autoTransitionTitle')}</span>
      </div>

      <FormField
        label={tr('setup.autoTransition')}
        helper={tr('setup.autoTransitionHelper')}
      >
        {#snippet control(args)}
          <SelectMenu
            {...args}
            bind:value={editStageNextWorkflowId}
            options={[
              { value: '', label: tr('setup.noTransition') },
              ...allWorkflows
                .filter((w) => w.id !== workflowId)
                .map((w) => ({ value: w.id, label: w.name }))
            ]}
          />
        {/snippet}
      </FormField>

      {#if editStageNextWorkflowId}
        <label class="flex items-center gap-2 text-[13px] text-ink cursor-pointer select-none pt-1">
          <Checkbox bind:checked={editStageAutoNextOnLastChecklist} />
          <span>{tr('setup.autoNextOnLastChecklist')}</span>
        </label>
      {/if}
    </div>
  </form>
  {#snippet footer()}
    <div class="flex justify-end gap-2">
      <Button variant="secondary" onclick={closeEditStage}>
        {tr('setup.cancel')}
      </Button>
      <Button
        variant="primary"
        onclick={saveEditStage}
        loading={savingEditStage}
        disabled={!editStageName.trim()}
      >
        <HugeiconsIcon icon={Tick02Icon} size={18} strokeWidth={1.8} />
        <span>{tr('setup.saveChanges')}</span>
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
    <div class="rounded-xl border border-hairline bg-canvas-sunken p-3 flex items-center justify-between gap-3">
      <div class="min-w-0">
        <span class="text-[13px] font-bold text-ink block">{tr('setup.requiredComplete')}</span>
        <p class="text-[12px] text-mute">{tr('setup.stageRequirement')}</p>
      </div>
      <Checkbox bind:checked={checklistModalRequired} />
    </div>

    <!-- WhatsApp Automation Settings Box -->
    <div class="space-y-3 rounded-xl border border-hairline bg-card p-3.5 shadow-xs">
      <div class="flex items-center gap-2">
        <div class="flex h-6 w-6 items-center justify-center rounded-full bg-status-done-soft text-status-done-ink shrink-0">
          <HugeiconsIcon icon={WhatsappIcon} size={14} strokeWidth={2} />
        </div>
        <div>
          <span class="text-[13px] font-bold text-ink block">{tr('setup.whatsappAction')}</span>
          <p class="text-[12px] text-mute">{tr('setup.whatsappActionDescription')}</p>
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
                <span class="text-[12px] text-mute font-medium">{tr('setup.insertVariable')}</span>
                {#each ['{{nama}}', '{{wa}}', '{{product}}', '{{tag}}', '{{link}}'] as v}
                  <button
                    type="button"
                    onclick={() => insertVariable(v)}
                    class="inline-flex items-center rounded-md bg-lane px-1.5 py-0.5 text-[12px] font-mono font-semibold text-primary hover:bg-primary-soft hover:border-primary-border/60 transition-colors cursor-pointer"
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
                class="h-9 text-[13px]"
              />
            {/snippet}
          </FormField>

          {#if checklistModalActionKind === 'followup'}
            <div class="flex items-end pb-2">
              <label class="flex items-center gap-2 text-[13px] text-ink cursor-pointer select-none">
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
