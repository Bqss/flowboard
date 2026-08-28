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
    Settings02Icon,
    KanbanIcon,
    DashboardSquare02Icon,
    Layers01Icon,
    ArrowUp01Icon,
    ArrowDown01Icon,
    ArrowRight01Icon,
    ArrowLeft01Icon,
    Clock01Icon,
    Alert02Icon,
    Tick02Icon,
    PlayIcon,
    WhatsappIcon,
    BubbleChatNotificationIcon,
    FlowConnectionIcon,
    CheckmarkBadge01Icon,
    CircleIcon
  } from '@hugeicons/core-free-icons';
  import { dashboardText } from '$lib/i18n/dashboard.js';
  import { locale } from '$lib/i18n/index.js';
  import { cn } from '$lib/utils.js';
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

  // Workflow Settings (inline tab)
  let activeSetupTab = $state<'stages' | 'settings'>('stages');

  // Auto-select settings tab if URL has ?tab=settings
  $effect(() => {
    if (page.url.searchParams.get('tab') === 'settings') {
      activeSetupTab = 'settings';
    }
  });
  let workflowName = $state('');
  let workflowDescription = $state('');
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

  let createStageOpen = $state(false);
  let newStageName = $state('');
  let newStageColor = $state('indigo');
  let newStageCustomColor = $state<string | null>(null);
  let creatingStage = $state(false);

  // Edit Stage Modal
  let stageToEdit = $state<ApiWorkflowSetupStage | null>(null);
  let editStageOpen = $state(false);
  let editStageColor = $state('indigo');
  let editStageName = $state('');
  let editStageCustomColor = $state<string | null>(null);
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

  // Unified Checklist Modal State (Add & Edit with WhatsApp automation)
  let checklistModalOpen = $state(false);
  let checklistModalMode = $state<'create' | 'edit'>('create');
  let checklistModalStageId = $state('');
  let checklistModalTemplateId = $state<string | null>(null);
  let checklistModalLabel = $state('');
  let checklistModalRequired = $state(true);
  let checklistModalActionKind = $state<'none' | 'send' | 'followup'>('none');
  let checklistModalMessage = $state('');
  let checklistModalDelay = $state('0');
  let checklistModalFollowupIfNoReply = $state(true);
  let savingChecklistModal = $state(false);
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

  const stageColorMeta = $derived<
    Record<
      string,
      {
        name: string;
        description: string;
        color: string;
        bgBadge: string;
        textBadge: string;
        borderBadge: string;
        topBorder: string;
        icon: any;
      }
    >
  >({
    indigo: {
      name: 'Indigo',
      description: tr('setup.colorIndigo'),
      color: '#4f46e5',
      bgBadge: 'bg-primary-soft',
      textBadge: 'text-primary-ink',
      borderBadge: 'border-primary-border/70',
      topBorder: '#4f46e5',
      icon: Clock01Icon
    },
    amber: {
      name: 'Amber',
      description: tr('setup.colorAmber'),
      color: '#f59e0b',
      bgBadge: 'bg-status-progress-soft',
      textBadge: 'text-status-progress-ink',
      borderBadge: 'border-amber-200',
      topBorder: '#f59e0b',
      icon: PlayIcon
    },
    rose: {
      name: 'Rose',
      description: tr('setup.colorRose'),
      color: '#f43f5e',
      bgBadge: 'bg-status-urgent-soft',
      textBadge: 'text-status-urgent-ink',
      borderBadge: 'border-rose-200',
      topBorder: '#f43f5e',
      icon: Alert02Icon
    },
    emerald: {
      name: tr('setup.colorEmerald'),
      description: tr('setup.colorEmeraldDescription'),
      color: '#22c55e',
      bgBadge: 'bg-status-done-soft',
      textBadge: 'text-status-done-ink',
      borderBadge: 'border-emerald-200',
      topBorder: '#22c55e',
      icon: Tick02Icon
    }
  });

  const stageColorOptions = ['indigo', 'amber', 'rose', 'emerald'] as const;

  // Check if a color value is a custom hex (not one of the template keys)
  const isCustomColor = (color: string) => !stageColorOptions.includes(color as any);

  // Resolve color meta — use template meta or generate from hex
  const resolveColorMeta = (color: string) => {
    if (stageColorMeta[color]) return stageColorMeta[color];
    // Custom hex color — generate meta
    return {
      name: 'Custom',
      description: 'Custom color',
      color,
      bgBadge: 'bg-lane',
      textBadge: 'text-ink',
      borderBadge: 'border-hairline',
      topBorder: color,
      icon: CircleIcon
    };
  };

  // Preset custom colors for quick pick
  const customColorPresets = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f59e0b', '#eab308', '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6', '#64748b', '#0f172a'];

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

      workflow = workflowsRes.workflows?.find((w) => w.id === workflowId) ?? null;
      members = membersRes.members ?? [];

      if (workflow) {
        workflowName = workflow.name;
        workflowDescription = workflow.description ?? '';

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
        description: workflowDescription.trim() || null,
        defaultAssigneeIds,
        defaultAssigneeId: defaultAssigneeId ?? (defaultAssigneeIds[0] ?? null)
      });
      if (res.workflow) {
        workflow = {
          ...workflow,
          ...res.workflow,
          name: res.workflow.name,
          description: res.workflow.description ?? null,
          defaultAssigneeId: res.workflow.defaultAssigneeId,
          defaultAssigneeIds: res.workflow.defaultAssigneeIds ?? defaultAssigneeIds
        };
      }
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
      newStageCustomColor = null;
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
    const draft = stageAutomationDraft[stage.id];
    editStageColor = stage.color || 'indigo';
    editStageCustomColor = isCustomColor(editStageColor) ? editStageColor : null;
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

  // --- Checklist Management via Modal ---
  function openCreateChecklistModal(stageId: string) {
    checklistModalStageId = stageId;
    checklistModalTemplateId = null;
    checklistModalMode = 'create';
    checklistModalLabel = '';
    checklistModalRequired = true;
    checklistModalActionKind = 'none';
    checklistModalMessage = '';
    checklistModalDelay = '0';
    checklistModalFollowupIfNoReply = true;
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
    checklistModalActionKind = template.action?.kind ?? 'none';
    checklistModalMessage = template.action?.messageTemplate ?? '';
    checklistModalDelay = String(template.action?.delayMinutes ?? 0);
    checklistModalFollowupIfNoReply = template.action?.followupIfNoReply ?? true;
    checklistModalOpen = true;
  }

  function insertVariable(variable: string) {
    checklistModalMessage = checklistModalMessage ? `${checklistModalMessage} ${variable}` : variable;
  }

  async function saveChecklistModal() {
    if (!canManage || !data.workspace?.id || !workflowId || !checklistModalStageId) return;
    if (!(await ensureSetupChangesSaved())) return;
    const label = checklistModalLabel.trim();
    if (!label) return;

    savingChecklistModal = true;
    try {
      if (checklistModalMode === 'create') {
        const res = await api.createChecklistTemplate(
          data.workspace.id,
          workflowId,
          checklistModalStageId,
          {
            label,
            required: checklistModalRequired
          }
        );
        const templateId = res.template?.id;
        if (templateId && checklistModalActionKind !== 'none') {
          await api.updateChecklistAction(
            data.workspace.id,
            workflowId,
            checklistModalStageId,
            templateId,
            {
              kind: checklistModalActionKind,
              messageTemplate: checklistModalMessage.trim(),
              delayMinutes: Number(checklistModalDelay) || 0,
              followupIfNoReply: checklistModalFollowupIfNoReply
            }
          );
        }
        toast.success(tr('setup.checklistAdded'));
      } else if (checklistModalTemplateId) {
        await api.updateChecklistTemplate(
          data.workspace.id,
          workflowId,
          checklistModalStageId,
          checklistModalTemplateId,
          {
            label,
            required: checklistModalRequired
          }
        );
        await api.updateChecklistAction(
          data.workspace.id,
          workflowId,
          checklistModalStageId,
          checklistModalTemplateId,
          {
            kind: checklistModalActionKind,
            messageTemplate: checklistModalActionKind === 'none' ? null : checklistModalMessage.trim(),
            delayMinutes: Number(checklistModalDelay) || 0,
            followupIfNoReply: checklistModalFollowupIfNoReply
          }
        );
        toast.success(tr('setup.checklistUpdated'));
      }
      checklistModalOpen = false;
      await loadSetupData();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : tr('setup.checklistAddError'));
    } finally {
      savingChecklistModal = false;
    }
  }

  function toggleChecklistRequired(template: ApiWorkflowSetupStage['templates'][number]) {
    if (!canManage) return;
    checklistRequiredDraft[template.id] = !checklistIsRequired(template);
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
  <title>{workflow?.name ?? tr('board.title')} — Flowboard</title>
</svelte:head>

<div class="space-y-6 pb-12">
  <!-- Top Navigation & Header -->
  <header class="space-y-3">
    <Breadcrumb
      items={[
        { label: tr('common.workflows'), href: '/dashboard/workflows' },
        { label: workflow?.name ?? tr('board.title') }
      ]}
      showHomeIcon
    />

    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div class="space-y-1">
        <h1 class="ds-page-title text-ink tracking-tight">
          {workflow?.name ?? tr('board.title')}
        </h1>
        <p class="ds-caption text-mute">
          {tr('board.description')}{#if workflow?.ownerName} · {tr('common.pic')}: <span class="font-medium text-ink-soft">{workflow.ownerName}</span>{/if}
        </p>
      </div>

      <!-- Action Buttons -->
      <div class="flex flex-wrap items-center gap-2.5">
        {#if canManage}
          {#if hasUnsavedSetupChanges}
            <Button
              variant="primary"
              size="sm"
              loading={savingSetupChanges}
              onclick={() => saveSetupChanges()}
              class="shadow-xs"
            >
              <HugeiconsIcon icon={Tick02Icon} size={16} strokeWidth={1.8} />
              <span>{tr('setup.saveChanges')}</span>
            </Button>
          {/if}



          <Button
            variant="primary"
            size="sm"
            onclick={() => (createStageOpen = true)}
            class="shadow-xs"
          >
            <HugeiconsIcon icon={Add01Icon} size={16} strokeWidth={1.8} />
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

  <!-- PRIMARY 4-TAB BAR -->
  <div class="flex items-center justify-between border-b border-hairline">
    <div class="flex items-center gap-1 -mb-px overflow-x-auto">
      <!-- Tab 1: Statistik -->
      <a
        href="/dashboard/workflows/{workflowId}"
        class="flex items-center gap-2 px-4 py-2.5 text-base font-semibold border-b-2 border-transparent text-mute hover:text-ink hover:border-hairline-strong transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)] whitespace-nowrap"
      >
        <HugeiconsIcon icon={DashboardSquare02Icon} size={16} strokeWidth={1.8} />
        <span>{tr('board.stats')}</span>
      </a>

      <!-- Tab 2: Kanban Board -->
      <a
        href="/dashboard/workflows/{workflowId}?tab=kanban"
        class="flex items-center gap-2 px-4 py-2.5 text-base font-semibold border-b-2 border-transparent text-mute hover:text-ink hover:border-hairline-strong transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)] whitespace-nowrap"
      >
        <HugeiconsIcon icon={KanbanIcon} size={16} strokeWidth={1.8} />
        <span>{tr('board.kanban')}</span>
      </a>

      <!-- Tab 3: Table List -->
      <a
        href="/dashboard/workflows/{workflowId}?tab=table"
        class="flex items-center gap-2 px-4 py-2.5 text-base font-semibold border-b-2 border-transparent text-mute hover:text-ink hover:border-hairline-strong transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)] whitespace-nowrap"
      >
        <HugeiconsIcon icon={Layers01Icon} size={16} strokeWidth={1.8} />
        <span>{tr('board.table')}</span>
      </a>

      <!-- Tab 4: Setup Stages -->
      <button
        type="button"
        onclick={() => (activeSetupTab = 'stages')}
        class={cn(
          'flex items-center gap-2 px-4 py-2.5 text-base font-semibold border-b-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)] whitespace-nowrap',
          activeSetupTab === 'stages'
            ? 'border-primary text-primary'
            : 'border-transparent text-mute hover:text-ink hover:border-hairline-strong'
        )}
      >
        <HugeiconsIcon icon={Settings01Icon} size={16} strokeWidth={1.8} />
        <span>{tr('board.setupStages')}</span>
      </button>

      <!-- Tab 5: Workflow Settings -->
      <button
        type="button"
        onclick={() => (activeSetupTab = 'settings')}
        class={cn(
          'flex items-center gap-2 px-4 py-2.5 text-base font-semibold border-b-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)] whitespace-nowrap',
          activeSetupTab === 'settings'
            ? 'border-primary text-primary'
            : 'border-transparent text-mute hover:text-ink hover:border-hairline-strong'
        )}
      >
        <HugeiconsIcon icon={Settings02Icon} size={16} strokeWidth={1.8} />
        <span>{tr('setup.workflowSettings')}</span>
      </button>
    </div>
  </div>

  {#if activeSetupTab === 'stages'}
  {#if loadingData}
    <!-- Skeleton Loading Screen (matching 320px lanes) -->
    <div class="flex gap-4 overflow-x-auto pb-4">
      {#each [1, 2, 3] as _i}
        <div class="w-80 shrink-0 rounded-2xl bg-card p-4 space-y-3 border border-hairline">
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
    <div class="flex flex-col items-center justify-center rounded-2xl bg-card p-12 text-center border border-hairline shadow-xs">
      <h2 class="ds-section-title text-ink">{tr('setup.emptyTitle')}</h2>
      <p class="ds-body text-mute mt-1 max-w-md text-base">
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
    <!-- Horizontal Kanban Lane Trays (Modernized 2026 Light Design) -->
    <div class="flex gap-4 overflow-x-auto pb-8 pt-1 items-start">
      {#each stages as stage, index (stage.id)}
        {@const meta = resolveColorMeta(stage.color)}
        {@const stageDraft = stageAutomationDraft[stage.id]}
        {@const targetWf = allWorkflows.find((w) => w.id === stage.nextWorkflowId)}
        {@const requiredCount = (stage.templates?.filter((t) => checklistIsRequired(t)).length ?? 0)}
        {@const totalItems = stage.templates?.length ?? 0}

        <!-- 330px Lane Tray -->
        <section
          id={`stage-lane-${stage.id}`}
          class="w-[330px] shrink-0 rounded-2xl bg-canvas-sunken p-3 flex flex-col space-y-3 shadow-xs border border-hairline"
        >
          <!-- Lane Header Card -->
          <div class="relative rounded-xl bg-card p-3.5 shadow-card space-y-2.5 overflow-hidden border border-hairline">

            <!-- Top Row: Stage Step, Color Badge & Controls -->
            <div class="flex items-center justify-between gap-2 pt-0.5">
              <div class="flex items-center gap-1.5 min-w-0">
                <span class="inline-flex h-6 w-6 items-center justify-center rounded-full bg-lane text-[13px] font-bold text-ink-soft shrink-0 ">
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
                <div class="flex items-center gap-0.5 shrink-0 text-mute">
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
              <div class="flex items-center gap-1.5 mt-1.5 flex-wrap text-[13px]">
                <span class="inline-flex items-center rounded-md bg-lane px-2 py-0.5 text-[13px] font-medium text-mute">
                  {totalItems} {totalItems === 1 ? 'item' : 'items'}
                </span>
                {#if requiredCount > 0}
                  <span class="inline-flex items-center rounded-md bg-primary-soft bg-primary-soft px-2 py-0.5 px-2 py-0.5 text-[12px] font-semibold text-primary-ink">
                    {requiredCount} {tr('setup.required').toLowerCase()}
                  </span>
                {/if}
              </div>
            </div>

            <!-- Stage Automation Status Pills -->
            {#if stageDraft?.onReplyNotify || stageDraft?.overdueReminderHours || targetWf}
              <div class="flex flex-wrap items-center gap-1 pt-1.5 border-t border-hairline/60 text-[12px]">
                {#if stageDraft?.onReplyNotify}
                  <span
                    class="inline-flex items-center gap-1 rounded-md bg-primary-soft  px-1.5 py-0.5 font-medium text-primary-ink"
                    title={tr('setup.replyNotifyAssignee')}
                  >
                    <HugeiconsIcon icon={BubbleChatNotificationIcon} size={11} strokeWidth={2} />
                    <span>{tr('setup.replyNotify')}</span>
                  </span>
                {/if}
                {#if stageDraft?.overdueReminderHours}
                  <span
                    class="inline-flex items-center gap-1 rounded-md bg-lane px-1.5 py-0.5 font-medium text-body "
                    title={tr('setup.overdueReminder')}
                  >
                    <HugeiconsIcon icon={Clock01Icon} size={11} strokeWidth={2} />
                    <span>{stageDraft.overdueReminderHours}h</span>
                  </span>
                {/if}
                {#if targetWf}
                  <span
                    class="inline-flex items-center gap-1 rounded-md bg-lane px-1.5 py-0.5 font-medium text-body  max-w-[130px] truncate"
                    title={`${tr('setup.nextWorkflow')}: ${targetWf.name}`}
                  >
                    <HugeiconsIcon icon={FlowConnectionIcon} size={11} strokeWidth={2} />
                    <span class="truncate">→ {targetWf.name}</span>
                  </span>
                {/if}
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
              {#each stage.templates as template (template.id)}
                {@const isRequired = checklistIsRequired(template)}
                {@const hasAction = template.action?.kind && template.action.kind !== 'none'}

                <div
                  class="group relative rounded-xl bg-card p-3 shadow-card border border-hairline hover:border-hairline-strong hover:shadow-card-hover transition-all duration-150 space-y-1.5"
                >

                  <!-- Checklist Card Content -->
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
                            class="inline-flex items-center gap-1 rounded-full bg-status-done-soft text-status-done-ink  px-2 py-0.2 text-[12px] font-semibold hover:opacity-80 transition-opacity cursor-pointer"
                            title={tr('setup.actionWa')}
                          >
                            <HugeiconsIcon icon={WhatsappIcon} size={11} strokeWidth={2} />
                            <span>{template.action?.kind === 'send' ? tr('setup.sendOnce') : tr('setup.followup')}</span>
                          </button>
                        {/if}
                      </div>

                      <!-- Hover Actions Cluster -->
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
              class="w-full flex items-center justify-center gap-1.5 rounded-xl bg-card py-2.5 px-3 text-[13px] font-bold text-ink-soft shadow-control hover:border-primary hover:bg-primary-soft hover:text-primary transition-all cursor-pointer group active:scale-[0.99]"
            >
              <HugeiconsIcon icon={Add01Icon} size={15} strokeWidth={2.2} class="text-mute group-hover:text-primary transition-colors" />
              <span>{tr('setup.addChecklistItem')}</span>
            </button>
          {/if}
        </section>
      {/each}

      <!-- Rightmost "Add Stage" Ghost Lane -->
      {#if canManage}
        <button
          type="button"
          onclick={() => (createStageOpen = true)}
          class="w-[280px] shrink-0 min-h-[160px] rounded-2xl border-2 border-dashed border-hairline-strong hover:border-primary hover:bg-primary-soft/30 flex flex-col items-center justify-center p-6 text-center transition-all cursor-pointer group"
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
  {/if}

  {:else if activeSetupTab === 'settings'}
    <!-- Workflow Settings Tab -->
    <div class="space-y-6">
      <div class="space-y-1">
        <h2 class="ds-section-title text-ink">{tr('setup.workflowSettings')}</h2>
        <p class="ds-caption text-mute">{tr('setup.workflowSettingsDescription')}</p>
      </div>

        <div class="rounded-2xl border border-hairline bg-card shadow-card p-6 space-y-4">
        <form
          onsubmit={(e) => {
            e.preventDefault();
            saveWorkflowSettings();
          }}
          class="space-y-4"
        >
          <FormField label={tr('setup.workflowName')} required>
            {#snippet control(args)}
              <Input
                {...args}
                bind:value={workflowName}
                disabled={!canManage}
                placeholder={tr('setup.workflowNamePlaceholder')}
                class="h-10 text-base"
              />
            {/snippet}
          </FormField>

          <FormField
            label={tr('setup.workflowDescription')}
            helper={tr('setup.workflowDescriptionHelper')}
          >
            {#snippet control(args)}
              <textarea
                {...args}
                bind:value={workflowDescription}
                disabled={!canManage}
                placeholder={tr('setup.workflowDescriptionPlaceholder')}
                rows={3}
                class="w-full rounded-lg border border-line bg-surface px-3 py-2 text-base text-ink placeholder:text-mute focus:border-ink focus:outline-none disabled:opacity-50"
              ></textarea>
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

          {#if canManage}
            <div class="flex justify-end gap-2 pt-2 border-t border-hairline">
              <Button
                variant="primary"
                type="submit"
                loading={savingWorkflow}
                disabled={!workflowName.trim()}
              >
                <HugeiconsIcon icon={Tick02Icon} size={16} strokeWidth={1.8} />
                <span>{tr('setup.saveSettings')}</span>
              </Button>
            </div>
          {/if}
        </form>
        </div>
    </div>
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
      <!-- Template colors -->
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
        <!-- Preset swatches -->
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
    <FormField label={tr('setup.stageName')} required helper={tr('setup.stageNameHelper')}>
      {#snippet control(args)}
        <Input
          {...args}
          bind:value={editStageName}
          placeholder={tr('setup.stageNamePlaceholder')}
          class="h-10 text-base"
          autofocus
        />
      {/snippet}
    </FormField>

    <div class="space-y-3">
      <div>
        <span class="ds-label text-ink font-semibold text-[13px] block">{tr('setup.colorIcon')}</span>
        <p class="text-[13px] text-mute mt-0.5">{tr('setup.colorIconDescription')}</p>
      </div>
      <!-- Template colors -->
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

      <!-- Custom color picker -->
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
        <!-- Preset swatches -->
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
    <div class="space-y-3 rounded-xl bg-canvas-sunken/50 ring-1 ring-hairline/30 p-4">
      <div>
        <span class="ds-label text-ink font-semibold text-[13px] block">{tr('setup.stageRules')}</span>
        <p class="text-[13px] text-mute mt-0.5">{tr('setup.stageRulesDescription')}</p>
      </div>
      <label class="flex items-center gap-2 text-base text-ink cursor-pointer">
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
            class="h-10 text-base"
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
            class="h-10 w-full rounded-full border border-hairline bg-card px-4 text-base text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
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
    <!-- Checklist Label Input -->
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
        <div class="flex h-6 w-6 items-center justify-center rounded-full bg-status-done-soft text-status-done-ink  shrink-0">
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
                    class="inline-flex items-center rounded-md bg-lane  px-1.5 py-0.5 text-[12px] font-mono font-semibold text-primary hover:bg-primary-soft hover:border-primary-border/60 transition-colors cursor-pointer"
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

    <!-- Dialog Footer Actions -->
    <div class="flex justify-end gap-2 pt-2">
      <Button variant="secondary" onclick={() => (checklistModalOpen = false)}>
        {tr('setup.cancel')}
      </Button>
      <Button
        variant="primary"
        type="submit"
        loading={savingChecklistModal}
        disabled={!checklistModalLabel.trim() || (checklistModalActionKind !== 'none' && !checklistModalMessage.trim())}
      >
        <HugeiconsIcon icon={Tick02Icon} size={16} strokeWidth={1.8} />
        <span>{checklistModalMode === 'create' ? tr('setup.createChecklistItem') : tr('setup.saveChecklistItem')}</span>
      </Button>
    </div>
  </form>
</Dialog>
