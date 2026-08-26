<script lang="ts">
  import { page } from '$app/state';
  import {
    api,
    ApiError,
    type ApiWorkflow,
    type ApiWorkflowSetupStage,
    type ApiWorkspaceMember
  } from '$lib/api/client';
  import {
    Button,
    IconButton,
    Checkbox,
    Input,
    Skeleton,
    Badge,
    Avatar,
    Textarea
  } from '$lib/components/atoms/index.js';
  import {
    FormField,
    Breadcrumb,
    AlertInline,
    MultiSelectCombobox,
    SelectMenu,
    type MultiSelectOption,
    toast
  } from '$lib/components/molecules/index.js';
  import { Dialog, ConfirmDialog } from '$lib/components/organisms/index.js';
  import { HugeiconsIcon } from '@hugeicons/svelte';
  import {
    Add01Icon,
    Delete02Icon,
    Edit02Icon,
    Settings01Icon,
    KanbanIcon,
    ArrowUp01Icon,
    ArrowDown01Icon,
    Clock01Icon,
    Alert02Icon,
    Tick02Icon,
    PlayIcon,
    WhatsappIcon,
  } from '@hugeicons/core-free-icons';
  import { dashboardText } from '$lib/i18n/dashboard.js';
  import { locale } from '$lib/i18n/index.js';
  import type { LayoutData } from '../../../$types';

  let { data }: { data: LayoutData } = $props();

  const tr = (key: string, values?: Record<string, string | number>) =>
    dashboardText($locale, key, values);

  type StageAutomationDraft = {
    onReplyNotify: boolean;
    overdueReminderHours: string;
  };

  const workflowId = $derived(page.params.workflowId);

  // Core Data
  let loadingData = $state(true);
  let workflow = $state<ApiWorkflow | null>(null);
  let allWorkflows = $state<ApiWorkflow[]>([]);
  let stages = $state<ApiWorkflowSetupStage[]>([]);
  let members = $state<ApiWorkspaceMember[]>([]);

  // Workflow Settings Modal
  let settingsOpen = $state(false);
  let workflowName = $state('');
  let defaultAssigneeIds = $state<string[]>([]);
  let defaultAssigneeId = $state<string | null>(null);
  let savingWorkflow = $state(false);

  let stageAutomationDraft = $state<Record<string, StageAutomationDraft>>({});
  let checklistRequiredDraft = $state<Record<string, boolean>>({});
  let savingSetupChanges = $state(false);

  const memberOptions = $derived<MultiSelectOption[]>(
    members.map((m) => ({
      value: m.id,
      label: m.name,
      description: m.email,
      avatarUrl: m.avatarUrl ?? undefined,
      role: m.role === 'owner' ? tr('common.owner') : tr('common.member')
    }))
  );

  const assignedMembers = $derived<ApiWorkspaceMember[]>(
    defaultAssigneeIds
      .map((id) => members.find((m) => m.id === id))
      .filter(Boolean) as ApiWorkspaceMember[]
  );

  // New Stage Modal
  let createStageOpen = $state(false);
  let newStageName = $state('');
  let newStageColor = $state('indigo');
  let creatingStage = $state(false);

  // Edit Stage Modal
  let stageToEdit = $state<ApiWorkflowSetupStage | null>(null);
  let editStageOpen = $state(false);
  let editStageName = $state('');
  let editStageColor = $state('indigo');
  let editOnReplyNotify = $state(false);
  let editOverdueHours = $state('');
  let editNextWorkflowId = $state('');
  let updatingStage = $state(false);

  // Stage Delete Confirmation
  let stageToDelete = $state<ApiWorkflowSetupStage | null>(null);
  let deletingStage = $state(false);

  // Checklist Delete Confirmation
  let checklistToDelete = $state<{
    stageId: string;
    templateId: string;
    label: string;
  } | null>(null);
  let deletingChecklist = $state(false);

  // Checklist Inputs per Stage (keyed by stageId)
  let checklistInputs = $state<Record<string, { label: string; required: boolean }>>({});
  let addingChecklistStageId = $state<string | null>(null);

  // Inline Checklist Editing
  let editingChecklistId = $state<string | null>(null);
  let editChecklistLabel = $state('');
  let editChecklistRequired = $state(true);
  let updatingChecklist = $state(false);

  // Checklist action editor
  let actionDialogOpen = $state(false);
  let actionStageId = $state('');
  let actionTemplateId = $state('');
  let actionKind = $state<'none' | 'send' | 'followup'>('none');
  let actionMessage = $state('');
  let actionDelayMinutes = $state('0');
  let actionFollowupIfNoReply = $state(true);
  let savingAction = $state(false);

  // Stage Reordering
  let reordering = $state(false);

  const actionKindOptions = $derived([
    { value: 'none', label: tr('setup.manualNoWa') },
    { value: 'send', label: tr('setup.sendOnce') },
    { value: 'followup', label: tr('setup.followup') }
  ]);

  // Feedback Alerts
  let alertMessage = $state<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  let alertTimer: ReturnType<typeof setTimeout> | null = null;

  function showAlert(text: string, type: 'success' | 'error' | 'info' = 'success') {
    if (alertTimer) clearTimeout(alertTimer);
    alertMessage = { text, type };
    alertTimer = setTimeout(() => {
      alertMessage = null;
    }, 4500);
  }

  const canManage = $derived(
    data.workspace?.role === 'owner' || (workflow && workflow.ownerId === data.user?.id)
  );

  const checklistIsRequired = (template: ApiWorkflowSetupStage['templates'][number]) =>
    checklistRequiredDraft[template.id] ?? template.required;

  const hasUnsavedSetupChanges = $derived.by(() => {
    for (const stage of stages) {
      const draft = stageAutomationDraft[stage.id];
      if (draft) {
        const rawHours = draft.overdueReminderHours.trim();
        const reminderHours = rawHours ? Number(rawHours) : null;
        if (
          draft.onReplyNotify !== Boolean(stage.onReplyNotify) ||
          reminderHours !== (stage.overdueReminderHours ?? null)
        ) {
          return true;
        }
      }

      for (const template of stage.templates ?? []) {
        const required = checklistRequiredDraft[template.id];
        if (required !== undefined && required !== template.required) return true;
      }
    }
    return false;
  });

  const parseReminderHours = (value: string): number | null | undefined => {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = Number(trimmed);
    return Number.isInteger(parsed) && parsed >= 1 && parsed <= 720 ? parsed : undefined;
  };

  const stageColorMeta = $derived<Record<string, { name: string; description: string; color: string; bgSoft: string; icon: any }>>({
    indigo: {
      name: 'Indigo',
      description: tr('setup.colorIndigo'),
      color: '#4f46e5',
      bgSoft: '#eef2ff',
      icon: Clock01Icon
    },
    amber: {
      name: 'Amber',
      description: tr('setup.colorAmber'),
      color: '#f59e0b',
      bgSoft: '#fffbeb',
      icon: PlayIcon
    },
    rose: {
      name: 'Rose',
      description: tr('setup.colorRose'),
      color: '#f43f5e',
      bgSoft: '#fff1f2',
      icon: Alert02Icon
    },
    emerald: {
      name: tr('setup.colorEmerald'),
      description: tr('setup.colorEmeraldDescription'),
      color: '#22c55e',
      bgSoft: '#f0fdf4',
      icon: Tick02Icon
    }
  });

  const stageColorOptions = ['indigo', 'amber', 'rose', 'emerald'] as const;

  async function loadSetupData() {
    if (!data.workspace?.id || !workflowId) return;
    loadingData = true;
    try {
      const [setupRes, workflowsRes, membersRes] = await Promise.all([
        api.getWorkflowSetup(data.workspace.id, workflowId),
        api.listWorkflows(data.workspace.id),
        api.listWorkspaceMembers(data.workspace.id).catch(() => ({ members: [] }))
      ]);
      const nextStages = setupRes.stages ?? [];
      const nextStageAutomationDraft: Record<string, StageAutomationDraft> = {};
      const nextChecklistRequiredDraft: Record<string, boolean> = {};
      for (const stage of nextStages) {
        nextStageAutomationDraft[stage.id] = {
          onReplyNotify: stage.onReplyNotify ?? false,
          overdueReminderHours:
            stage.overdueReminderHours != null ? String(stage.overdueReminderHours) : ''
        };
        for (const template of stage.templates ?? []) {
          nextChecklistRequiredDraft[template.id] = template.required;
        }
      }
      stageAutomationDraft = nextStageAutomationDraft;
      checklistRequiredDraft = nextChecklistRequiredDraft;
      stages = nextStages;
      allWorkflows = workflowsRes.workflows ?? [];
      const updatedInputs: Record<string, { label: string; required: boolean }> = { ...checklistInputs };
      for (const s of nextStages) {
        if (!updatedInputs[s.id]) {
          updatedInputs[s.id] = { label: '', required: true };
        }
      }
      checklistInputs = updatedInputs;

      workflow = workflowsRes.workflows?.find((w) => w.id === workflowId) ?? null;
      members = membersRes.members ?? [];

      if (workflow) {
        workflowName = workflow.name;

        defaultAssigneeIds =
          workflow.defaultAssigneeIds && workflow.defaultAssigneeIds.length > 0
            ? workflow.defaultAssigneeIds
            : workflow.defaultAssigneeId
              ? [workflow.defaultAssigneeId]
              : [];
        defaultAssigneeId = workflow.defaultAssigneeId ?? (defaultAssigneeIds[0] ?? null);
      }
    } catch (err) {
      console.error('Failed to load setup data:', err);
      showAlert(err instanceof ApiError ? err.message : tr('setup.loadError'), 'error');
    } finally {
      loadingData = false;
    }
  }
  async function saveSetupChanges(showSuccess = true): Promise<boolean> {
    if (
      !canManage ||
      !data.workspace?.id ||
      !workflowId ||
      !hasUnsavedSetupChanges ||
      savingSetupChanges
    ) {
      return false;
    }

    const stageUpdates: Array<{
      stageId: string;
      onReplyNotify: boolean;
      overdueReminderHours: number | null;
    }> = [];

    for (const stage of stages) {
      const draft = stageAutomationDraft[stage.id];
      if (!draft) continue;

      const reminderHours = parseReminderHours(draft.overdueReminderHours);
      if (reminderHours === undefined) {
        toast.error(tr('setup.reminderInvalid'));
        return false;
      }

      if (
        draft.onReplyNotify !== Boolean(stage.onReplyNotify) ||
        reminderHours !== (stage.overdueReminderHours ?? null)
      ) {
        stageUpdates.push({
          stageId: stage.id,
          onReplyNotify: draft.onReplyNotify,
          overdueReminderHours: reminderHours
        });
      }
    }

    savingSetupChanges = true;
    try {
      for (const update of stageUpdates) {
        await api.updateStage(data.workspace.id, workflowId, update.stageId, {
          onReplyNotify: update.onReplyNotify,
          overdueReminderHours: update.overdueReminderHours
        });
      }

      for (const stage of stages) {
        for (const template of stage.templates ?? []) {
          const required = checklistRequiredDraft[template.id];
          if (required === undefined || required === template.required) continue;
          await api.updateChecklistTemplate(
            data.workspace.id,
            workflowId,
            stage.id,
            template.id,
            { required }
          );
        }
      }

      await loadSetupData();
      if (showSuccess) toast.success(tr('setup.changesSaved'));
      return true;
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : tr('setup.changesError'));
      return false;
    } finally {
      savingSetupChanges = false;
    }
  }

  async function ensureSetupChangesSaved(): Promise<boolean> {
    if (!hasUnsavedSetupChanges) return true;
    return saveSetupChanges(false);
  }

  $effect(() => {
    if (data.workspace?.id && workflowId) {
      loadSetupData();
    }
  });

  // --- Workflow Settings ---
  async function saveWorkflowSettings() {
    if (!canManage || !data.workspace?.id || !workflowId || !workflowName.trim()) return;
    savingWorkflow = true;
    try {
      const res = await api.updateWorkflow(data.workspace.id, workflowId, {
        name: workflowName.trim(),
        defaultAssigneeIds,
        defaultAssigneeId: defaultAssigneeId ?? (defaultAssigneeIds[0] ?? null)
      });
      if (res.workflow) {
        workflow = {
          ...workflow,
          ...res.workflow,
          name: res.workflow.name,
          defaultAssigneeId: res.workflow.defaultAssigneeId,
          defaultAssigneeIds: res.workflow.defaultAssigneeIds ?? defaultAssigneeIds
        };
      }
      settingsOpen = false;
      toast.success(tr('setup.settingsSaved'));
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : tr('setup.settingsError'));
    } finally {
      savingWorkflow = false;
    }
  }

  // --- Stage Management ---
  async function createStage() {
    if (!newStageName.trim() || !canManage || !data.workspace?.id || !workflowId) return;
    if (!(await ensureSetupChangesSaved())) return;
    creatingStage = true;
    try {
      await api.createStage(data.workspace.id, workflowId, {
        name: newStageName.trim(),
        color: newStageColor
      });
      newStageName = '';
      newStageColor = 'indigo';
      createStageOpen = false;
      await loadSetupData();
      toast.success(tr('setup.stageCreated'));
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : tr('setup.stageCreateError'));
    } finally {
      creatingStage = false;
    }
  }

  function startEditStage(stage: ApiWorkflowSetupStage) {
    stageToEdit = stage;
    editStageName = stage.name;
    editStageColor = stage.color || 'indigo';
    const draft = stageAutomationDraft[stage.id];
    editOnReplyNotify = draft?.onReplyNotify ?? stage.onReplyNotify ?? false;
    editOverdueHours =
      draft?.overdueReminderHours ??
      (stage.overdueReminderHours != null ? String(stage.overdueReminderHours) : '');
    editNextWorkflowId = stage.nextWorkflowId ?? '';
    editStageOpen = true;
  }

  function closeEditStage() {
    editStageOpen = false;
    stageToEdit = null;
  }

  async function saveEditStage() {
    if (!stageToEdit || !editStageName.trim() || !canManage || !data.workspace?.id || !workflowId) return;
    if (!(await ensureSetupChangesSaved())) return;
    const reminderHours = parseReminderHours(editOverdueHours);
    if (reminderHours === undefined) {
      toast.error(tr('setup.reminderInvalid'));
      return;
    }
    updatingStage = true;
    try {
      await api.updateStage(data.workspace.id, workflowId, stageToEdit.id, {
        name: editStageName.trim(),
        color: editStageColor,
        onReplyNotify: editOnReplyNotify,
        overdueReminderHours: reminderHours,
        nextWorkflowId: editNextWorkflowId || null
      });
      closeEditStage();
      await loadSetupData();
      toast.success(tr('setup.stageUpdated'));
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : tr('setup.stageUpdateError'));
    } finally {
      updatingStage = false;
    }
  }

  async function deleteStageConfirmed() {
    if (!stageToDelete || !canManage || !data.workspace?.id || !workflowId) return;
    if (!(await ensureSetupChangesSaved())) return;
    deletingStage = true;
    const stageName = stageToDelete.name;
    try {
      await api.deleteStage(data.workspace.id, workflowId, stageToDelete.id);
      stageToDelete = null;
      await loadSetupData();
      toast.success(tr('setup.stageDeleted', { name: stageName }));
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : tr('setup.stageDeleteError'));
    } finally {
      deletingStage = false;
    }
  }

  async function moveStage(index: number, direction: 'up' | 'down') {
    if (!canManage || !data.workspace?.id || !workflowId || reordering) return;
    if (!(await ensureSetupChangesSaved())) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= stages.length) return;

    const newStages = [...stages];
    const temp = newStages[index];
    newStages[index] = newStages[targetIndex];
    newStages[targetIndex] = temp;

    stages = newStages;
    reordering = true;

    try {
      await api.reorderStages(data.workspace.id, workflowId, {
        stageIds: newStages.map((s) => s.id)
      });
      toast.success(tr('setup.stagesReordered'));
    } catch (err) {
      await loadSetupData();
      toast.error(err instanceof ApiError ? err.message : tr('setup.stagesReorderError'));
    } finally {
      reordering = false;
    }
  }

  // --- Checklist Management ---
  async function addChecklist(stageId: string) {
    if (!canManage || !data.workspace?.id || !workflowId) return;
    if (!(await ensureSetupChangesSaved())) return;
    const current = checklistInputs[stageId] ?? { label: '', required: true };
    const label = current.label.trim();
    const required = current.required;

    if (!label) return;

    addingChecklistStageId = stageId;
    try {
      await api.createChecklistTemplate(data.workspace.id, workflowId, stageId, {
        label,
        required
      });
      checklistInputs[stageId] = { label: '', required: true };
      await loadSetupData();
      toast.success(tr('setup.checklistAdded'));
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : tr('setup.checklistAddError'));
    } finally {
      addingChecklistStageId = null;
    }
  }

  function toggleChecklistRequired(template: ApiWorkflowSetupStage['templates'][number]) {
    if (!canManage) return;
    checklistRequiredDraft[template.id] = !checklistIsRequired(template);
  }

  function startEditChecklist(template: ApiWorkflowSetupStage['templates'][number]) {
    editingChecklistId = template.id;
    editChecklistLabel = template.label;
    editChecklistRequired = checklistIsRequired(template);
  }

  async function saveEditChecklist(stageId: string, templateId: string) {
    if (!editChecklistLabel.trim() || !canManage || !data.workspace?.id || !workflowId) return;
    if (!(await ensureSetupChangesSaved())) return;
    updatingChecklist = true;
    try {
      await api.updateChecklistTemplate(data.workspace.id, workflowId, stageId, templateId, {
        label: editChecklistLabel.trim(),
        required: editChecklistRequired
      });
      editingChecklistId = null;
      await loadSetupData();
      toast.success(tr('setup.checklistUpdated'));
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : tr('setup.checklistUpdateError'));
    } finally {
      updatingChecklist = false;
    }
  }

  function promptDeleteChecklist(
    stageId: string,
    template: ApiWorkflowSetupStage['templates'][number]
  ) {
    checklistToDelete = {
      stageId,
      templateId: template.id,
      label: template.label
    };
  }

  function openActionEditor(
    stageId: string,
    template: ApiWorkflowSetupStage['templates'][number]
  ) {
    actionStageId = stageId;
    actionTemplateId = template.id;
    actionKind = template.action?.kind ?? 'none';
    actionMessage = template.action?.messageTemplate ?? '';
    actionDelayMinutes = String(template.action?.delayMinutes ?? 0);
    actionFollowupIfNoReply = template.action?.followupIfNoReply ?? true;
    actionDialogOpen = true;
  }

  async function saveChecklistAction() {
    if (!canManage || !data.workspace?.id || !workflowId || !actionStageId || !actionTemplateId) return;
    if (!(await ensureSetupChangesSaved())) return;
    savingAction = true;
    try {
      await api.updateChecklistAction(
        data.workspace.id,
        workflowId,
        actionStageId,
        actionTemplateId,
        {
          kind: actionKind,
          messageTemplate: actionKind === 'none' ? null : actionMessage.trim(),
          delayMinutes: Number(actionDelayMinutes) || 0,
          followupIfNoReply: actionFollowupIfNoReply
        }
      );
      actionDialogOpen = false;
      await loadSetupData();
      toast.success(tr('setup.actionSaved'));
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : tr('setup.actionError'));
    } finally {
      savingAction = false;
    }
  }

  async function deleteChecklistConfirmed() {
    if (!checklistToDelete || !canManage || !data.workspace?.id || !workflowId) return;
    if (!(await ensureSetupChangesSaved())) return;
    deletingChecklist = true;
    const { stageId, templateId, label } = checklistToDelete;
    try {
      await api.deleteChecklistTemplate(data.workspace.id, workflowId, stageId, templateId);
      checklistToDelete = null;
      await loadSetupData();
      toast.success(tr('setup.checklistDeleted', { label }));
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : tr('setup.checklistDeleteError'));
    } finally {
      deletingChecklist = false;
    }
  }
</script>

<svelte:head>
  <title>{tr('setup.title')} {workflow?.name ?? tr('common.workflow')} — Flowboard</title>
</svelte:head>

<div data-theme="app" class="space-y-6 pb-12">
  <!-- Top Navigation & Header -->
  <header class="space-y-4">
    <Breadcrumb
      items={[
        { label: tr('common.workflows'), href: '/dashboard/workflows' },
        { label: workflow?.name ?? tr('common.workflow'), href: `/dashboard/workflows/${workflowId}` },
        { label: tr('setup.breadcrumb') }
      ]}
      showHomeIcon
    />

    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div class="space-y-1">
        <h1 class="ds-page-title text-ink font-extrabold tracking-tight">
          {workflow?.name ?? tr('setup.workflowFallback')}
        </h1>
        <p class="ds-caption text-mute max-w-2xl text-sm">
          {tr('setup.description')}
        </p>

        {#if assignedMembers.length > 0}
          <div class="flex flex-wrap items-center gap-2 pt-1">
            <span class="text-xs font-semibold text-mute">{tr('setup.autoAssignee', { count: assignedMembers.length })}:</span>
            <div class="flex flex-wrap items-center gap-1.5">
              {#each assignedMembers as member (member.id)}
                {@const isPrimary = defaultAssigneeId === member.id}
                <span class="inline-flex items-center gap-1.5 rounded-full bg-card border border-hairline/80 px-2.5 py-0.5 text-xs font-medium text-ink shadow-xs">
                  <Avatar name={member.name} src={member.avatarUrl ?? undefined} size={16} />
                  <span>{member.name}</span>
                  {#if isPrimary && assignedMembers.length > 1}
                    <span class="rounded bg-primary/10 px-1 text-[9px] font-bold text-primary">
                      {tr('setup.primary')}
                    </span>
                  {/if}
                </span>
              {/each}
              {#if assignedMembers.length > 1}
                <Badge tone="queued" variant="soft" class="text-[10px] font-semibold py-0.5">
                  {tr('setup.roundRobin')}
                </Badge>
              {/if}
            </div>
          </div>
        {/if}
      </div>

      <!-- Action Buttons -->
      <div class="flex items-center gap-2.5">
        <Button
          variant="secondary"
          size="md"
          href={`/dashboard/workflows/${workflowId}`}
        >
          <HugeiconsIcon icon={KanbanIcon} size={18} strokeWidth={1.8} />
          <span>{tr('setup.viewBoard')}</span>
        </Button>

        {#if canManage}
          <Button
            variant="primary"
            size="md"
            loading={savingSetupChanges}
            disabled={!hasUnsavedSetupChanges || savingSetupChanges}
            onclick={() => saveSetupChanges()}
          >
            <HugeiconsIcon icon={Tick02Icon} size={18} strokeWidth={1.8} />
            <span>{tr('setup.saveChanges')}</span>
          </Button>
          <Button
            variant="secondary"
            size="md"
            onclick={() => (settingsOpen = true)}
          >
            <HugeiconsIcon icon={Settings01Icon} size={18} strokeWidth={1.8} />
            <span>{tr('common.settings')}</span>
          </Button>

          <Button
            variant="primary"
            size="md"
            onclick={() => (createStageOpen = true)}
          >
            <HugeiconsIcon icon={Add01Icon} size={18} strokeWidth={1.8} />
            <span>{tr('setup.addStage')}</span>
          </Button>
        {/if}
      </div>
    </div>

    <!-- Alert Notification -->
    {#if alertMessage}
      <div class="pt-1">
        <AlertInline
          tone={alertMessage.type === 'error' ? 'negative' : alertMessage.type === 'info' ? 'info' : 'positive'}
          title={alertMessage.text}
        />
      </div>
    {/if}
  </header>

  {#if loadingData}
    <!-- Skeleton Loading Screen (matching 320px lanes) -->
    <div class="flex gap-4 overflow-x-auto pb-4">
      {#each [1, 2, 3] as _i}
        <div class="w-80 shrink-0 rounded-2xl bg-lane p-4 space-y-3">
          <div class="flex items-center justify-between">
            <Skeleton shape="rect" class="h-6 w-32 rounded-md" />
            <Skeleton shape="rect" class="h-6 w-16 rounded-full" />
          </div>
          <Skeleton shape="rect" class="h-11 w-full rounded-full" />
          <div class="space-y-3 pt-1">
            <Skeleton shape="rect" class="h-20 w-full rounded-xl" />
            <Skeleton shape="rect" class="h-20 w-full rounded-xl" />
          </div>
        </div>
      {/each}
    </div>
  {:else if stages.length === 0}
    <!-- Empty State -->
    <div class="flex flex-col items-center justify-center rounded-2xl bg-lane p-12 text-center">
      <h2 class="ds-section-title text-ink">{tr('setup.emptyTitle')}</h2>
      <p class="ds-body text-mute mt-1 max-w-md text-sm">
        {tr('setup.emptyDescription')}
      </p>
      {#if canManage}
        <div class="mt-4">
          <Button variant="primary" onclick={() => (createStageOpen = true)}>
            <HugeiconsIcon icon={Add01Icon} size={18} strokeWidth={1.8} />
            <span>{tr('setup.addFirstStage')}</span>
          </Button>
        </div>
      {/if}
    </div>
  {:else}
    <!-- Horizontal Kanban Lane Trays (Flowboard Canonical System) -->
    <div class="flex gap-4 overflow-x-auto pb-6 pt-1 items-start">
      {#each stages as stage, index (stage.id)}
        {@const meta = stageColorMeta[stage.color] || stageColorMeta.indigo}
        {@const stageDraft = stageAutomationDraft[stage.id]}

        <!-- 320px Lane Tray -->
        <section
          id={`stage-lane-${stage.id}`}
          class="w-80 shrink-0 rounded-2xl bg-lane p-3.5 flex flex-col space-y-3"
        >
          <!-- Lane Header Card -->
          <div class="rounded-xl bg-card p-3 shadow-card space-y-2 border border-hairline/60">
            <!-- Top meta row: Step Number, Status Category Badge, and Action Buttons -->
            <div class="flex items-center justify-between gap-2">
              <div class="flex items-center gap-1.5 min-w-0">
                <span class="inline-flex h-5 w-5 items-center justify-center rounded-full bg-lane text-[11px] font-bold text-ink-soft shrink-0">
                  {index + 1}
                </span>
                <span
                  class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold shrink-0"
                  style="background-color: {meta.bgSoft}; color: {meta.color};"
                >
                  <HugeiconsIcon icon={meta.icon} size={12} strokeWidth={2} />
                  <span>{meta.name}</span>
                </span>
              </div>

              {#if canManage}
                <div class="flex items-center gap-0.5 shrink-0 text-mute">
                  <IconButton
                    label={tr('setup.moveLeft')}
                    variant="ghost"
                    size="sm"
                    disabled={index === 0 || reordering}
                    onclick={() => moveStage(index, 'up')}
                    class="h-7 w-7 text-mute hover:text-ink hover:bg-lane disabled:opacity-25"
                  >
                    <HugeiconsIcon icon={ArrowUp01Icon} size={14} strokeWidth={1.8} class="-rotate-90" />
                  </IconButton>

                  <IconButton
                    label={tr('setup.moveRight')}
                    variant="ghost"
                    size="sm"
                    disabled={index === stages.length - 1 || reordering}
                    onclick={() => moveStage(index, 'down')}
                    class="h-7 w-7 text-mute hover:text-ink hover:bg-lane disabled:opacity-25"
                  >
                    <HugeiconsIcon icon={ArrowDown01Icon} size={14} strokeWidth={1.8} class="-rotate-90" />
                  </IconButton>

                  <IconButton
                    label={tr('setup.editStage')}
                    variant="ghost"
                    size="sm"
                    onclick={() => startEditStage(stage)}
                    class="h-7 w-7 text-mute hover:text-primary hover:bg-primary-soft"
                  >
                    <HugeiconsIcon icon={Edit02Icon} size={14} strokeWidth={1.8} />
                  </IconButton>

                  <IconButton
                    label={tr('setup.deleteStage')}
                    variant="ghost"
                    size="sm"
                    onclick={() => (stageToDelete = stage)}
                    class="h-7 w-7 text-mute hover:text-status-urgent-ink hover:bg-status-urgent-soft"
                  >
                    <HugeiconsIcon icon={Delete02Icon} size={14} strokeWidth={1.8} />
                  </IconButton>
                </div>
              {/if}
            </div>

            <!-- Stage Title & Subtitle -->
            <div class="pt-0.5">
              <h2 class="text-ink font-bold text-[15px] leading-snug break-words">
                {stage.name}
              </h2>
              <div class="flex items-center gap-1.5 mt-1 text-[11px] text-mute font-medium">
                <span>{tr('setup.checklistCount', { count: stage.templates?.length ?? 0 })}</span>
                {#if stageDraft?.onReplyNotify}
                  <span class="text-faint">•</span>
                  <span class="text-primary font-semibold">{tr('setup.replyNotify')}</span>
                {/if}
                {#if stageDraft?.overdueReminderHours}
                  <span class="text-faint">•</span>
                  <span>{tr('setup.reminder', { hours: stageDraft.overdueReminderHours })}</span>
                {/if}
                {#if (stage.templates?.filter((t) => checklistIsRequired(t)).length ?? 0) > 0}
                  <span class="text-faint">•</span>
                  <span class="text-status-urgent-ink font-semibold">
                    {tr('setup.requiredCount', { count: stage.templates?.filter((t) => checklistIsRequired(t)).length ?? 0 })}
                  </span>
                {/if}
              </div>
            </div>
            {#if canManage && stageDraft}
              <div class="mt-2 space-y-2 rounded-lg border border-hairline/70 bg-lane/50 px-2.5 py-2">
                <div class="flex items-start justify-between gap-2">
                  <label class="flex min-w-0 items-start gap-2 text-[11px] font-semibold leading-tight text-ink">
                    <Checkbox bind:checked={stageDraft.onReplyNotify} />
                    <span>{tr('setup.replyNotifyAssignee')}</span>
                  </label>
                  {#if hasUnsavedSetupChanges}
                    <span class="shrink-0 text-[10px] font-semibold text-primary">
                      {tr('setup.unsavedChanges')}
                    </span>
                  {/if}
                </div>
                <div class="flex items-center justify-between gap-2">
                  <div class="min-w-0">
                    <label for={`reminder-${stage.id}`} class="text-[11px] font-semibold text-ink">
                      {tr('setup.overdueReminder')}
                    </label>
                    <p class="text-[10px] leading-tight text-mute">{tr('setup.overdueHelper')}</p>
                  </div>
                  <Input
                    id={`reminder-${stage.id}`}
                    type="number"
                    min="1"
                    max="720"
                    step="1"
                    bind:value={stageDraft.overdueReminderHours}
                    placeholder="—"
                    class="h-8 w-20 shrink-0 bg-card text-xs"
                  />
                </div>
              </div>
            {/if}
          </div>

          <!-- Quick Add Checklist Input inside Lane -->
          {#if canManage && checklistInputs[stage.id]}
            <div class="space-y-2 pt-0.5">
              <div class="relative">
                <Input
                  bind:value={checklistInputs[stage.id].label}
                  placeholder={tr('setup.addChecklistPlaceholder')}
                  class="h-9 text-xs pr-16 bg-card"
                  onkeydown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addChecklist(stage.id);
                    }
                  }}
                />
                <div class="absolute right-1.5 top-1/2 -translate-y-1/2">
                  <Button
                    variant="ghost"
                    size="sm"
                    loading={addingChecklistStageId === stage.id}
                    disabled={!checklistInputs[stage.id].label.trim()}
                    onclick={() => addChecklist(stage.id)}
                    class="h-7 px-2 text-xs font-semibold text-primary hover:bg-primary-soft"
                  >
                    {tr('setup.add')}
                  </Button>
                </div>
              </div>

              <div class="flex items-center justify-between px-1">
                <label class="flex items-center gap-1.5 text-xs text-mute cursor-pointer select-none">
                  <Checkbox bind:checked={checklistInputs[stage.id].required} />
                  <span>{tr('setup.requiredComplete')}</span>
                </label>
                <span class="text-[11px] text-faint">{tr('setup.stageRequirement')}</span>
              </div>
            </div>
          {/if}

          <!-- Floating White Cards List (NO BORDER - Pure Flowboard Elevation) -->
          <div class="space-y-3 pt-1">
            {#if (stage.templates?.length ?? 0) === 0}
              <div class="rounded-xl border border-dashed border-hairline-strong bg-card/40 p-4 text-center">
                <p class="text-xs text-mute font-medium">{tr('setup.noChecklist')}</p>
                <p class="text-[11px] text-faint mt-0.5">{tr('setup.typeToAdd')}</p>
              </div>
            {:else}
              {#each stage.templates as template (template.id)}
                {@const isEditingThisChecklist = editingChecklistId === template.id}

                <div class="rounded-xl bg-card p-3 shadow-card space-y-2 relative transition-shadow hover:shadow-card-hover">
                  <!-- 4px Label Bar at Top Edge (Signature Flowboard Detail) -->
                  <div
                    class="h-1 w-7 rounded-full"
                    style="background-color: {checklistIsRequired(template) ? '#4f46e5' : '#94a3b8'};"
                  ></div>

                  {#if isEditingThisChecklist}
                    <!-- Edit Checklist Form -->
                    <div class="space-y-2 pt-1">
                      <Input
                        bind:value={editChecklistLabel}
                        placeholder={tr('setup.checklistLabelPlaceholder')}
                        class="h-8 text-xs"
                      />
                      <div class="flex items-center justify-between pt-1">
                        <label class="flex items-center gap-1.5 text-xs text-ink cursor-pointer select-none">
                          <Checkbox bind:checked={editChecklistRequired} />
                          <span>{tr('setup.required')}</span>
                        </label>
                        <div class="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onclick={() => (editingChecklistId = null)}
                            class="h-7 px-2 text-xs"
                          >
                            {tr('setup.cancel')}
                          </Button>
                          <Button
                            variant="primary"
                            size="sm"
                            loading={updatingChecklist}
                            onclick={() => saveEditChecklist(stage.id, template.id)}
                            class="h-7 px-2 text-xs"
                          >
                            {tr('common.save')}
                          </Button>
                        </div>
                      </div>
                    </div>
                  {:else}
                    <!-- Checklist Card Content -->
                    <p class="text-sm font-semibold text-ink leading-snug break-words">
                      {template.label}
                    </p>

                    <div class="flex flex-wrap items-center justify-between gap-x-2 gap-y-1.5 pt-1 text-xs">
                      <div class="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
                      {#if canManage}
                        <button
                          type="button"
                          title={tr('setup.toggleRule')}
                          onclick={() => toggleChecklistRequired(template)}
                          class="cursor-pointer focus:outline-none"
                        >
                          <Badge
                            tone={checklistIsRequired(template) ? 'urgent' : 'idle'}
                            variant="soft"
                            class="text-[11px] hover:opacity-80 transition-opacity"
                          >
                            {checklistIsRequired(template) ? tr('setup.required') : tr('common.optional')}
                          </Badge>
                        </button>
                        {#if template.action?.kind && template.action.kind !== 'none'}
                          <Badge tone="progress" variant="soft" class="text-[10px]">
                            {tr('setup.waAction', { kind: template.action.kind })}
                          </Badge>
                        {/if}
                      {:else}
                        <Badge
                          tone={checklistIsRequired(template) ? 'urgent' : 'idle'}
                          variant="soft"
                          class="text-[11px]"
                        >
                          {checklistIsRequired(template) ? tr('setup.required') : tr('common.optional')}
                        </Badge>
                      {/if}
                      </div>

                      {#if canManage}
                        <div class="ml-auto flex shrink-0 items-center gap-1 text-faint">
                          <Button
                            variant="ghost"
                            size="sm"
                            onclick={() => openActionEditor(stage.id, template)}
                            class="h-7 shrink-0 gap-1 whitespace-nowrap px-1.5 text-[10px] font-semibold text-faint hover:text-primary"
                          >
                            <HugeiconsIcon icon={WhatsappIcon} size={14} strokeWidth={1.8} />
                            <span>{tr('setup.actionWaShort')}</span>
                          </Button>
                          <IconButton
                            label={tr('setup.editItem')}
                            variant="bare"
                            size="sm"
                            onclick={() => startEditChecklist(template)}
                            class="hover:text-ink"
                          >
                            <HugeiconsIcon icon={Edit02Icon} size={14} strokeWidth={1.8} />
                          </IconButton>
                          <IconButton
                            label={tr('setup.deleteItem')}
                            variant="bare"
                            size="sm"
                            onclick={() => promptDeleteChecklist(stage.id, template)}
                            class="hover:text-status-urgent-ink"
                          >
                            <HugeiconsIcon icon={Delete02Icon} size={14} strokeWidth={1.8} />
                          </IconButton>
                        </div>
                      {/if}
                    </div>
                  {/if}
                </div>
              {/each}
            {/if}
          </div>
        </section>
      {/each}
    </div>
  {/if}
</div>

<!-- Modal: Workflow Settings -->
<Dialog
  bind:open={settingsOpen}
  title={tr('setup.workflowSettings')}
  description={tr('setup.workflowSettingsDescription')}
  size="md"
>
  <form
    onsubmit={(e) => {
      e.preventDefault();
      saveWorkflowSettings();
    }}
    class="space-y-4 py-2"
  >
    <FormField label={tr('setup.workflowName')} required>
      {#snippet control(args)}
        <Input
          {...args}
          bind:value={workflowName}
          disabled={!canManage}
          placeholder={tr('setup.workflowNamePlaceholder')}
          class="h-10 text-sm"
        />
      {/snippet}
    </FormField>

    <FormField
      label={tr('setup.assignees')}
      helper={tr('setup.assigneesHelper')}
    >
      {#snippet control()}
        <MultiSelectCombobox
          options={memberOptions}
          bind:values={defaultAssigneeIds}
          bind:primary={defaultAssigneeId}
          disabled={!canManage}
          showPrimaryBadge
          placeholder={tr('setup.assigneesPlaceholder')}
          emptyText={tr('setup.noMembers')}
        />
      {/snippet}
    </FormField>

    <div class="flex justify-end gap-2 pt-2">
      <Button variant="secondary" onclick={() => (settingsOpen = false)}>
        {tr('setup.cancel')}
      </Button>
      <Button
        variant="primary"
        type="submit"
        loading={savingWorkflow}
        disabled={!workflowName.trim()}
      >
        {tr('setup.saveSettings')}
      </Button>
    </div>
  </form>
</Dialog>

<!-- Modal: Add Stage -->
<Dialog
  bind:open={createStageOpen}
  title={tr('setup.newStage')}
  description={tr('setup.newStageDescription')}
  size="md"
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
          class="h-10 text-sm"
          autofocus
        />
      {/snippet}
    </FormField>

    <!-- Visual Color & Icon Badge Picker -->
    <div class="space-y-2">
      <div>
        <span class="ds-label text-ink font-semibold text-xs block">{tr('setup.colorIcon')}</span>
        <p class="text-xs text-mute mt-0.5">{tr('setup.colorIconDescription')}</p>
      </div>
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
        {#each stageColorOptions as colorKey}
          {@const kMeta = stageColorMeta[colorKey]}
          {@const isSelected = newStageColor === colorKey}
          <button
            type="button"
            onclick={() => (newStageColor = colorKey)}
            class="flex flex-col items-center gap-1.5 rounded-xl border p-2.5 text-center transition-all cursor-pointer {isSelected ? 'border-primary bg-primary-soft/40 ring-2 ring-primary shadow-sm' : 'border-hairline bg-card hover:bg-lane hover:border-hairline-strong'}"
          >
            <span
              class="flex h-8 w-8 items-center justify-center rounded-full text-white shadow-sm"
              style="background-color: {kMeta.color};"
            >
              <HugeiconsIcon icon={kMeta.icon} size={16} strokeWidth={2} />
            </span>
            <span class="text-xs font-semibold text-ink">{kMeta.name}</span>
            <span class="text-[10px] text-mute">{kMeta.description}</span>
          </button>
        {/each}
      </div>
    </div>

    <div class="flex justify-end gap-2 pt-2">
      <Button variant="secondary" onclick={() => (createStageOpen = false)}>
        {tr('setup.cancel')}
      </Button>
      <Button
        variant="primary"
        type="submit"
        loading={creatingStage}
        disabled={!newStageName.trim()}
      >
        <HugeiconsIcon icon={Add01Icon} size={18} strokeWidth={1.8} />
        <span>{tr('setup.addStage')}</span>
      </Button>
    </div>
  </form>
</Dialog>

<!-- Modal: Edit Stage -->
<Dialog
  bind:open={editStageOpen}
  onclose={closeEditStage}
  title={tr('setup.editStageTitle', { name: stageToEdit?.name ?? '' })}
  description={tr('setup.editStageDescription')}
  size="md"
>
  <form
    onsubmit={(e) => {
      e.preventDefault();
      saveEditStage();
    }}
    class="space-y-4 py-2"
  >
    <FormField label={tr('setup.stageName')} required helper={tr('setup.stageNameHelper')}>
      {#snippet control(args)}
        <Input
          {...args}
          bind:value={editStageName}
          placeholder={tr('setup.stageNamePlaceholder')}
          class="h-10 text-sm"
          autofocus
        />
      {/snippet}
    </FormField>

    <!-- Visual Color & Icon Badge Picker -->
    <div class="space-y-2">
      <div>
        <span class="ds-label text-ink font-semibold text-xs block">{tr('setup.colorIcon')}</span>
        <p class="text-xs text-mute mt-0.5">{tr('setup.colorIconDescription')}</p>
      </div>
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
        {#each stageColorOptions as colorKey}
          {@const kMeta = stageColorMeta[colorKey]}
          {@const isSelected = editStageColor === colorKey}
          <button
            type="button"
            onclick={() => (editStageColor = colorKey)}
            class="flex flex-col items-center gap-1.5 rounded-xl border p-2.5 text-center transition-all cursor-pointer {isSelected ? 'border-primary bg-primary-soft/40 ring-2 ring-primary shadow-sm' : 'border-hairline bg-card hover:bg-lane hover:border-hairline-strong'}"
          >
            <span
              class="flex h-8 w-8 items-center justify-center rounded-full text-white shadow-sm"
              style="background-color: {kMeta.color};"
            >
              <HugeiconsIcon icon={kMeta.icon} size={16} strokeWidth={2} />
            </span>
            <span class="text-xs font-semibold text-ink">{kMeta.name}</span>
            <span class="text-[10px] text-mute">{kMeta.description}</span>
          </button>
        {/each}
      </div>
    </div>

    <div class="space-y-3 rounded-xl border border-hairline bg-canvas-sunken/50 p-4">
      <div>
        <span class="ds-label text-ink font-semibold text-xs block">{tr('setup.stageRules')}</span>
        <p class="text-xs text-mute mt-0.5">{tr('setup.stageRulesDescription')}</p>
      </div>
      <label class="flex items-center gap-2 text-sm text-ink cursor-pointer">
        <Checkbox bind:checked={editOnReplyNotify} />
        <span>{tr('setup.replyNotifyAssignee')}</span>
      </label>
      <FormField label={tr('setup.overdueReminder')} helper={tr('setup.overdueHelper')}>
        {#snippet control(args)}
          <Input
            {...args}
            type="number"
            min="1"
            max="720"
            bind:value={editOverdueHours}
            placeholder={tr('setup.overduePlaceholder')}
            class="h-10 text-sm"
          />
        {/snippet}
      </FormField>
      <FormField
        label={tr('setup.nextWorkflow')}
        helper={tr('setup.nextWorkflowHelper')}
      >
        {#snippet control(args)}
          <select
            {...args}
            bind:value={editNextWorkflowId}
            class="h-10 w-full rounded-full border border-hairline bg-card px-4 text-sm text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
          >
            <option value="">{tr('setup.noHandoff')}</option>
            {#each allWorkflows.filter((w) => w.id !== workflowId) as wf (wf.id)}
              <option value={wf.id}>{wf.name}</option>
            {/each}
          </select>
        {/snippet}
      </FormField>
    </div>

    <div class="flex justify-end gap-2 pt-2">
      <Button variant="secondary" onclick={closeEditStage}>
        {tr('setup.cancel')}
      </Button>
      <Button
        variant="primary"
        type="submit"
        loading={updatingStage}
        disabled={!editStageName.trim()}
      >
        <HugeiconsIcon icon={Tick02Icon} size={18} strokeWidth={1.8} />
        <span>{tr('setup.saveChanges')}</span>
      </Button>
    </div>
  </form>
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
  title={tr('setup.deleteChecklistTitle', { label: checklistToDelete?.label ?? '' })}
  description={tr('setup.deleteChecklistDescription')}
  confirmLabel={tr('setup.deleteChecklistConfirm')}
  cancelLabel={tr('setup.cancel')}
  destructive
  loading={deletingChecklist}
  onconfirm={deleteChecklistConfirmed}
  oncancel={() => (checklistToDelete = null)}
/>

<Dialog
  bind:open={actionDialogOpen}
  title={tr('setup.whatsappAction')}
  description={tr('setup.whatsappActionDescription')}
  size="md"
>
  <form
    onsubmit={(e) => {
      e.preventDefault();
      saveChecklistAction();
    }}
    class="space-y-4 py-2"
  >
    <FormField label={tr('setup.actionType')}>
      {#snippet control()}
        <SelectMenu
          options={actionKindOptions}
          bind:value={actionKind}
        />
      {/snippet}
    </FormField>

    {#if actionKind !== 'none'}
      <FormField
        label={tr('setup.messageTemplate')}
        helper={tr('setup.templateHelper')}
        required
      >
        {#snippet control(args)}
          <Textarea
            {...args}
            bind:value={actionMessage}
            rows={4}
            placeholder={tr('setup.templatePlaceholder')}
          />
        {/snippet}
      </FormField>

      <FormField label={tr('setup.delay')}>
        {#snippet control(args)}
          <Input {...args} type="number" min="0" bind:value={actionDelayMinutes} class="h-10 text-sm" />
        {/snippet}
      </FormField>

      {#if actionKind === 'followup'}
        <label class="flex items-center gap-2 text-sm text-ink cursor-pointer">
          <Checkbox bind:checked={actionFollowupIfNoReply} />
          <span>{tr('setup.onlyIfNoReply')}</span>
        </label>
      {/if}
    {/if}

    <div class="flex justify-end gap-2 pt-2">
      <Button variant="secondary" onclick={() => (actionDialogOpen = false)}>{tr('setup.cancel')}</Button>
      <Button variant="primary" type="submit" loading={savingAction}>{tr('setup.saveAction')}</Button>
    </div>
  </form>
</Dialog>
