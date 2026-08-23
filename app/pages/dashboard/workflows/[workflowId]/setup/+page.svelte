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
    WhatsappIcon
  } from '@hugeicons/core-free-icons';
  import type { LayoutData } from '../../../$types';

  let { data }: { data: LayoutData } = $props();

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

  const memberOptions = $derived<MultiSelectOption[]>(
    members.map((m) => ({
      value: m.id,
      label: m.name,
      description: m.email,
      avatarUrl: m.avatarUrl ?? undefined,
      role: m.role === 'owner' ? 'Owner' : 'Member'
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

  const actionKindOptions = [
    { value: 'none', label: 'Manual (tanpa WA)' },
    { value: 'send', label: 'Kirim WA sekali' },
    { value: 'followup', label: 'Follow-up WA' }
  ];

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

  const stageColorMeta: Record<string, { name: string; description: string; color: string; bgSoft: string; icon: any }> = {
    indigo: {
      name: 'Indigo',
      description: 'Antrean / Masuk',
      color: '#4f46e5',
      bgSoft: '#eef2ff',
      icon: Clock01Icon
    },
    amber: {
      name: 'Amber',
      description: 'Pengerjaan / Proses',
      color: '#f59e0b',
      bgSoft: '#fffbeb',
      icon: PlayIcon
    },
    rose: {
      name: 'Rose',
      description: 'Perhatian / Tertahan',
      color: '#f43f5e',
      bgSoft: '#fff1f2',
      icon: Alert02Icon
    },
    emerald: {
      name: 'Hijau',
      description: 'Selesai / Closing',
      color: '#22c55e',
      bgSoft: '#f0fdf4',
      icon: Tick02Icon
    }
  };

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
      stages = setupRes.stages ?? [];
      allWorkflows = workflowsRes.workflows ?? [];
      const updatedInputs: Record<string, { label: string; required: boolean }> = { ...checklistInputs };
      for (const s of stages) {
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
      showAlert(err instanceof ApiError ? err.message : 'Gagal memuat konfigurasi workflow.', 'error');
    } finally {
      loadingData = false;
    }
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
      toast.success('Pengaturan workflow berhasil disimpan.');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Gagal menyimpan pengaturan workflow.');
    } finally {
      savingWorkflow = false;
    }
  }

  // --- Stage Management ---
  async function createStage() {
    if (!newStageName.trim() || !canManage || !data.workspace?.id || !workflowId) return;
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
      toast.success('Tahapan baru berhasil ditambahkan.');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Gagal menambah tahapan.');
    } finally {
      creatingStage = false;
    }
  }

  function startEditStage(stage: ApiWorkflowSetupStage) {
    stageToEdit = stage;
    editStageName = stage.name;
    editStageColor = stage.color || 'indigo';
    editOnReplyNotify = stage.onReplyNotify ?? false;
    editOverdueHours =
      stage.overdueReminderHours != null ? String(stage.overdueReminderHours) : '';
    editNextWorkflowId = stage.nextWorkflowId ?? '';
    editStageOpen = true;
  }

  function closeEditStage() {
    editStageOpen = false;
    stageToEdit = null;
  }

  async function saveEditStage() {
    if (!stageToEdit || !editStageName.trim() || !canManage || !data.workspace?.id || !workflowId) return;
    updatingStage = true;
    try {
      await api.updateStage(data.workspace.id, workflowId, stageToEdit.id, {
        name: editStageName.trim(),
        color: editStageColor,
        onReplyNotify: editOnReplyNotify,
        overdueReminderHours: editOverdueHours.trim()
          ? Number(editOverdueHours)
          : null,
        nextWorkflowId: editNextWorkflowId || null
      });
      closeEditStage();
      await loadSetupData();
      toast.success('Tahapan berhasil diperbarui.');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Gagal memperbarui tahapan.');
    } finally {
      updatingStage = false;
    }
  }

  async function deleteStageConfirmed() {
    if (!stageToDelete || !canManage || !data.workspace?.id || !workflowId) return;
    deletingStage = true;
    const stageName = stageToDelete.name;
    try {
      await api.deleteStage(data.workspace.id, workflowId, stageToDelete.id);
      stageToDelete = null;
      await loadSetupData();
      toast.success(`Tahapan "${stageName}" berhasil dihapus.`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Gagal menghapus tahapan.');
    } finally {
      deletingStage = false;
    }
  }

  async function moveStage(index: number, direction: 'up' | 'down') {
    if (!canManage || !data.workspace?.id || !workflowId || reordering) return;
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
      toast.success('Urutan tahapan berhasil diperbarui.');
    } catch (err) {
      await loadSetupData();
      toast.error(err instanceof ApiError ? err.message : 'Gagal mengubah urutan tahapan.');
    } finally {
      reordering = false;
    }
  }

  // --- Checklist Management ---
  async function addChecklist(stageId: string) {
    if (!canManage || !data.workspace?.id || !workflowId) return;
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
      toast.success('Item checklist berhasil ditambahkan.');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Gagal menambah item checklist.');
    } finally {
      addingChecklistStageId = null;
    }
  }

  async function toggleChecklistRequired(
    stageId: string,
    template: ApiWorkflowSetupStage['templates'][number]
  ) {
    if (!canManage || !data.workspace?.id || !workflowId) return;
    try {
      await api.updateChecklistTemplate(data.workspace.id, workflowId, stageId, template.id, {
        required: !template.required
      });
      await loadSetupData();
      toast.success(`Aturan checklist diubah menjadi ${!template.required ? 'Wajib' : 'Opsional'}.`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Gagal mengubah status checklist.');
    }
  }

  function startEditChecklist(template: ApiWorkflowSetupStage['templates'][number]) {
    editingChecklistId = template.id;
    editChecklistLabel = template.label;
    editChecklistRequired = template.required;
  }

  async function saveEditChecklist(stageId: string, templateId: string) {
    if (!editChecklistLabel.trim() || !canManage || !data.workspace?.id || !workflowId) return;
    updatingChecklist = true;
    try {
      await api.updateChecklistTemplate(data.workspace.id, workflowId, stageId, templateId, {
        label: editChecklistLabel.trim(),
        required: editChecklistRequired
      });
      editingChecklistId = null;
      await loadSetupData();
      toast.success('Item checklist berhasil diperbarui.');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Gagal memperbarui item checklist.');
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
      toast.success('Action checklist disimpan.');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Gagal menyimpan action.');
    } finally {
      savingAction = false;
    }
  }

  async function deleteChecklistConfirmed() {
    if (!checklistToDelete || !canManage || !data.workspace?.id || !workflowId) return;
    deletingChecklist = true;
    const { stageId, templateId, label } = checklistToDelete;
    try {
      await api.deleteChecklistTemplate(data.workspace.id, workflowId, stageId, templateId);
      checklistToDelete = null;
      await loadSetupData();
      toast.success(`Checklist "${label}" berhasil dihapus.`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Gagal menghapus item checklist.');
    } finally {
      deletingChecklist = false;
    }
  }
</script>

<svelte:head>
  <title>Setup {workflow?.name ?? 'Workflow'} — Flowboard</title>
</svelte:head>

<div data-theme="app" class="space-y-6 pb-12">
  <!-- Top Navigation & Header -->
  <header class="space-y-4">
    <Breadcrumb
      items={[
        { label: 'Workflows', href: '/dashboard/workflows' },
        { label: workflow?.name ?? 'Workflow', href: `/dashboard/workflows/${workflowId}` },
        { label: 'Setup Tahapan & Checklist' }
      ]}
      showHomeIcon
    />

    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div class="space-y-1">
        <h1 class="ds-page-title text-ink font-extrabold tracking-tight">
          {workflow?.name ?? 'Setup Workflow'}
        </h1>
        <p class="ds-caption text-mute max-w-2xl text-sm">
          Konfigurasi kolom tahapan kanban dan syarat checklist yang harus dipenuhi sebelum kartu berpindah.
        </p>

        {#if assignedMembers.length > 0}
          <div class="flex flex-wrap items-center gap-2 pt-1">
            <span class="text-xs font-semibold text-mute">PIC Otomatis ({assignedMembers.length}):</span>
            <div class="flex flex-wrap items-center gap-1.5">
              {#each assignedMembers as member (member.id)}
                {@const isPrimary = defaultAssigneeId === member.id}
                <span class="inline-flex items-center gap-1.5 rounded-full bg-card border border-hairline/80 px-2.5 py-0.5 text-xs font-medium text-ink shadow-xs">
                  <Avatar name={member.name} src={member.avatarUrl ?? undefined} size={16} />
                  <span>{member.name}</span>
                  {#if isPrimary && assignedMembers.length > 1}
                    <span class="rounded bg-primary/10 px-1 text-[9px] font-bold text-primary">
                      Utama
                    </span>
                  {/if}
                </span>
              {/each}
              {#if assignedMembers.length > 1}
                <Badge tone="queued" variant="soft" class="text-[10px] font-semibold py-0.5">
                  Round-Robin Aktif
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
          <span>Lihat Board</span>
        </Button>

        {#if canManage}
          <Button
            variant="secondary"
            size="md"
            onclick={() => (settingsOpen = true)}
          >
            <HugeiconsIcon icon={Settings01Icon} size={18} strokeWidth={1.8} />
            <span>Pengaturan</span>
          </Button>

          <Button
            variant="primary"
            size="md"
            onclick={() => (createStageOpen = true)}
          >
            <HugeiconsIcon icon={Add01Icon} size={18} strokeWidth={1.8} />
            <span>Tambah Tahapan</span>
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
      <h2 class="ds-section-title text-ink">Belum Ada Tahapan</h2>
      <p class="ds-body text-mute mt-1 max-w-md text-sm">
        Workflow ini belum memiliki tahapan kolom kanban. Tambahkan tahapan pertama untuk memulai.
      </p>
      {#if canManage}
        <div class="mt-4">
          <Button variant="primary" onclick={() => (createStageOpen = true)}>
            <HugeiconsIcon icon={Add01Icon} size={18} strokeWidth={1.8} />
            <span>Tambah Tahapan Pertama</span>
          </Button>
        </div>
      {/if}
    </div>
  {:else}
    <!-- Horizontal Kanban Lane Trays (Flowboard Canonical System) -->
    <div class="flex gap-4 overflow-x-auto pb-6 pt-1 items-start">
      {#each stages as stage, index (stage.id)}
        {@const meta = stageColorMeta[stage.color] || stageColorMeta.indigo}

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
                    label="Geser ke kiri"
                    variant="ghost"
                    size="sm"
                    disabled={index === 0 || reordering}
                    onclick={() => moveStage(index, 'up')}
                    class="h-7 w-7 text-mute hover:text-ink hover:bg-lane disabled:opacity-25"
                  >
                    <HugeiconsIcon icon={ArrowUp01Icon} size={14} strokeWidth={1.8} class="-rotate-90" />
                  </IconButton>

                  <IconButton
                    label="Geser ke kanan"
                    variant="ghost"
                    size="sm"
                    disabled={index === stages.length - 1 || reordering}
                    onclick={() => moveStage(index, 'down')}
                    class="h-7 w-7 text-mute hover:text-ink hover:bg-lane disabled:opacity-25"
                  >
                    <HugeiconsIcon icon={ArrowDown01Icon} size={14} strokeWidth={1.8} class="-rotate-90" />
                  </IconButton>

                  <IconButton
                    label="Edit Tahapan"
                    variant="ghost"
                    size="sm"
                    onclick={() => startEditStage(stage)}
                    class="h-7 w-7 text-mute hover:text-primary hover:bg-primary-soft"
                  >
                    <HugeiconsIcon icon={Edit02Icon} size={14} strokeWidth={1.8} />
                  </IconButton>

                  <IconButton
                    label="Hapus Tahapan"
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
                <span>{stage.templates?.length ?? 0} item checklist</span>
                {#if stage.onReplyNotify}
                  <span class="text-faint">•</span>
                  <span class="text-primary font-semibold">Reply → notify</span>
                {/if}
                {#if stage.overdueReminderHours}
                  <span class="text-faint">•</span>
                  <span>Reminder {stage.overdueReminderHours}j</span>
                {/if}
                {#if (stage.templates?.filter((t) => t.required).length ?? 0) > 0}
                  <span class="text-faint">•</span>
                  <span class="text-status-urgent-ink font-semibold">
                    {stage.templates?.filter((t) => t.required).length} wajib
                  </span>
                {/if}
              </div>
            </div>
          </div>

          <!-- Quick Add Checklist Input inside Lane -->
          {#if canManage && checklistInputs[stage.id]}
            <div class="space-y-2 pt-0.5">
              <div class="relative">
                <Input
                  bind:value={checklistInputs[stage.id].label}
                  placeholder="Tambah checklist... (Enter)"
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
                    Tambah
                  </Button>
                </div>
              </div>

              <div class="flex items-center justify-between px-1">
                <label class="flex items-center gap-1.5 text-xs text-mute cursor-pointer select-none">
                  <Checkbox bind:checked={checklistInputs[stage.id].required} />
                  <span>Wajib diselesaikan</span>
                </label>
                <span class="text-[11px] text-faint">Syarat pindah stage</span>
              </div>
            </div>
          {/if}

          <!-- Floating White Cards List (NO BORDER - Pure Flowboard Elevation) -->
          <div class="space-y-3 pt-1">
            {#if (stage.templates?.length ?? 0) === 0}
              <div class="rounded-xl border border-dashed border-hairline-strong bg-card/40 p-4 text-center">
                <p class="text-xs text-mute font-medium">Belum ada checklist</p>
                <p class="text-[11px] text-faint mt-0.5">Ketik di atas untuk menambah syarat</p>
              </div>
            {:else}
              {#each stage.templates as template (template.id)}
                {@const isEditingThisChecklist = editingChecklistId === template.id}

                <div class="rounded-xl bg-card p-3 shadow-card space-y-2 relative transition-shadow hover:shadow-card-hover">
                  <!-- 4px Label Bar at Top Edge (Signature Flowboard Detail) -->
                  <div
                    class="h-1 w-7 rounded-full"
                    style="background-color: {template.required ? '#4f46e5' : '#94a3b8'};"
                  ></div>

                  {#if isEditingThisChecklist}
                    <!-- Edit Checklist Form -->
                    <div class="space-y-2 pt-1">
                      <Input
                        bind:value={editChecklistLabel}
                        placeholder="Label checklist..."
                        class="h-8 text-xs"
                      />
                      <div class="flex items-center justify-between pt-1">
                        <label class="flex items-center gap-1.5 text-xs text-ink cursor-pointer select-none">
                          <Checkbox bind:checked={editChecklistRequired} />
                          <span>Wajib</span>
                        </label>
                        <div class="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onclick={() => (editingChecklistId = null)}
                            class="h-7 px-2 text-xs"
                          >
                            Batal
                          </Button>
                          <Button
                            variant="primary"
                            size="sm"
                            loading={updatingChecklist}
                            onclick={() => saveEditChecklist(stage.id, template.id)}
                            class="h-7 px-2 text-xs"
                          >
                            Simpan
                          </Button>
                        </div>
                      </div>
                    </div>
                  {:else}
                    <!-- Checklist Card Content -->
                    <p class="text-sm font-semibold text-ink leading-snug break-words">
                      {template.label}
                    </p>

                    <div class="flex items-center justify-between pt-1 text-xs">
                      <div class="flex items-center gap-1.5">
                      {#if canManage}
                        <button
                          type="button"
                          title="Klik untuk mengubah aturan"
                          onclick={() => toggleChecklistRequired(stage.id, template)}
                          class="cursor-pointer focus:outline-none"
                        >
                          <Badge
                            tone={template.required ? 'urgent' : 'idle'}
                            variant="soft"
                            class="text-[11px] hover:opacity-80 transition-opacity"
                          >
                            {template.required ? 'Wajib' : 'Opsional'}
                          </Badge>
                        </button>
                        {#if template.action?.kind && template.action.kind !== 'none'}
                          <Badge tone="progress" variant="soft" class="text-[10px]">
                            WA {template.action.kind}
                          </Badge>
                        {/if}
                      {:else}
                        <Badge
                          tone={template.required ? 'urgent' : 'idle'}
                          variant="soft"
                          class="text-[11px]"
                        >
                          {template.required ? 'Wajib' : 'Opsional'}
                        </Badge>
                      {/if}
                      </div>

                      {#if canManage}
                        <div class="flex items-center gap-1 text-faint">
                          <IconButton
                            label="Atur action WA"
                            variant="bare"
                            size="sm"
                            onclick={() => openActionEditor(stage.id, template)}
                            class="hover:text-primary"
                          >
                            <HugeiconsIcon icon={WhatsappIcon} size={14} strokeWidth={1.8} />
                          </IconButton>
                          <IconButton
                            label="Edit item"
                            variant="bare"
                            size="sm"
                            onclick={() => startEditChecklist(template)}
                            class="hover:text-ink"
                          >
                            <HugeiconsIcon icon={Edit02Icon} size={14} strokeWidth={1.8} />
                          </IconButton>
                          <IconButton
                            label="Hapus item"
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

<!-- Modal: Pengaturan Workflow -->
<Dialog
  bind:open={settingsOpen}
  title="Pengaturan Workflow"
  description="Atur nama workflow dan penugasan PIC default untuk kartu baru."
  size="md"
>
  <form
    onsubmit={(e) => {
      e.preventDefault();
      saveWorkflowSettings();
    }}
    class="space-y-4 py-2"
  >
    <FormField label="Nama Workflow" required>
      {#snippet control(args)}
        <Input
          {...args}
          bind:value={workflowName}
          disabled={!canManage}
          placeholder="Contoh: Sales & Closing Pipeline"
          class="h-10 text-sm"
        />
      {/snippet}
    </FormField>

    <FormField
      label="PIC / Assignee Otomatis (Bisa Lebih dari 1)"
      helper="Pilih satu atau lebih PIC tim. Jika memilih lebih dari 1, kartu baru otomatis dibagikan secara bergilir (round-robin)."
    >
      {#snippet control()}
        <MultiSelectCombobox
          options={memberOptions}
          bind:values={defaultAssigneeIds}
          bind:primary={defaultAssigneeId}
          disabled={!canManage}
          showPrimaryBadge
          placeholder="Pilih satu atau beberapa PIC workflow…"
          emptyText="Tidak ada anggota tim ditemukan"
        />
      {/snippet}
    </FormField>

    <div class="flex justify-end gap-2 pt-2">
      <Button variant="secondary" onclick={() => (settingsOpen = false)}>
        Batal
      </Button>
      <Button
        variant="primary"
        type="submit"
        loading={savingWorkflow}
        disabled={!workflowName.trim()}
      >
        Simpan Pengaturan
      </Button>
    </div>
  </form>
</Dialog>

<!-- Modal: Tambah Stage Baru -->
<Dialog
  bind:open={createStageOpen}
  title="Tambah Tahapan Baru"
  description="Tambahkan kolom tahapan baru ke dalam alur pipeline workflow."
  size="md"
>
  <form
    onsubmit={(e) => {
      e.preventDefault();
      createStage();
    }}
    class="space-y-4 py-2"
  >
    <FormField label="Nama Tahapan" required helper="Nama kolom yang menjelaskan aktivitas tahapan.">
      {#snippet control(args)}
        <Input
          {...args}
          bind:value={newStageName}
          placeholder="Contoh: Verifikasi Dokumen"
          class="h-10 text-sm"
          autofocus
        />
      {/snippet}
    </FormField>

    <!-- Visual Color & Icon Badge Picker -->
    <div class="space-y-2">
      <div>
        <span class="ds-label text-ink font-semibold text-xs block">Warna & Ikon Indikator</span>
        <p class="text-xs text-mute mt-0.5">Pilih tema warna dan ikon untuk menandai visual kolom tahapan ini.</p>
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
        Batal
      </Button>
      <Button
        variant="primary"
        type="submit"
        loading={creatingStage}
        disabled={!newStageName.trim()}
      >
        <HugeiconsIcon icon={Add01Icon} size={18} strokeWidth={1.8} />
        <span>Tambah Tahapan</span>
      </Button>
    </div>
  </form>
</Dialog>

<!-- Modal: Edit Tahapan -->
<Dialog
  bind:open={editStageOpen}
  onclose={closeEditStage}
  title={`Edit Tahapan: ${stageToEdit?.name ?? ''}`}
  description="Ubah nama kolom tahapan atau tema warna dan ikon indikator."
  size="md"
>
  <form
    onsubmit={(e) => {
      e.preventDefault();
      saveEditStage();
    }}
    class="space-y-4 py-2"
  >
    <FormField label="Nama Tahapan" required helper="Nama kolom yang menjelaskan aktivitas tahapan.">
      {#snippet control(args)}
        <Input
          {...args}
          bind:value={editStageName}
          placeholder="Contoh: Verifikasi Dokumen"
          class="h-10 text-sm"
          autofocus
        />
      {/snippet}
    </FormField>

    <!-- Visual Color & Icon Badge Picker -->
    <div class="space-y-2">
      <div>
        <span class="ds-label text-ink font-semibold text-xs block">Warna & Ikon Indikator</span>
        <p class="text-xs text-mute mt-0.5">Pilih tema warna dan ikon untuk menandai visual kolom tahapan ini.</p>
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
        <span class="ds-label text-ink font-semibold text-xs block">Aturan Stage</span>
        <p class="text-xs text-mute mt-0.5">Handover ringan & reminder ke staff assignee.</p>
      </div>
      <label class="flex items-center gap-2 text-sm text-ink cursor-pointer">
        <Checkbox bind:checked={editOnReplyNotify} />
        <span>Pelanggan balas WA → notifikasi assignee</span>
      </label>
      <FormField label="Reminder overdue (jam)" helper="Kosongkan jika tidak perlu.">
        {#snippet control(args)}
          <Input
            {...args}
            type="number"
            min="1"
            max="720"
            bind:value={editOverdueHours}
            placeholder="Contoh: 24"
            class="h-10 text-sm"
          />
        {/snippet}
      </FormField>
      <FormField
        label="Estafet ke workflow berikutnya"
        helper="Saat card di stage ini, staff bisa lanjutkan pelanggan ke workflow tujuan (1 workflow)."
      >
        {#snippet control(args)}
          <select
            {...args}
            bind:value={editNextWorkflowId}
            class="h-10 w-full rounded-full border border-hairline bg-card px-4 text-sm text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
          >
            <option value="">Tidak ada estafet</option>
            {#each allWorkflows.filter((w) => w.id !== workflowId) as wf (wf.id)}
              <option value={wf.id}>{wf.name}</option>
            {/each}
          </select>
        {/snippet}
      </FormField>
    </div>

    <div class="flex justify-end gap-2 pt-2">
      <Button variant="secondary" onclick={closeEditStage}>
        Batal
      </Button>
      <Button
        variant="primary"
        type="submit"
        loading={updatingStage}
        disabled={!editStageName.trim()}
      >
        <HugeiconsIcon icon={Tick02Icon} size={18} strokeWidth={1.8} />
        <span>Simpan Perubahan</span>
      </Button>
    </div>
  </form>
</Dialog>

<!-- Modal: Konfirmasi Hapus Stage -->
<ConfirmDialog
  open={stageToDelete !== null}
  title={`Hapus Tahapan "${stageToDelete?.name}"?`}
  description="Tahapan hanya dapat dihapus jika tidak ada kartu aktif di dalamnya. Semua checklist template pada tahapan ini juga akan dihapus."
  confirmLabel="Hapus Tahapan"
  cancelLabel="Batal"
  destructive
  loading={deletingStage}
  onconfirm={deleteStageConfirmed}
  oncancel={() => (stageToDelete = null)}
/>

<!-- Modal: Konfirmasi Hapus Checklist -->
<ConfirmDialog
  open={checklistToDelete !== null}
  title={`Hapus Checklist "${checklistToDelete?.label ?? ''}"?`}
  description="Item checklist template ini akan dihapus dari tahapan workflow. Kartu kanban yang sedang aktif tidak akan terhapus."
  confirmLabel="Hapus Checklist"
  cancelLabel="Batal"
  destructive
  loading={deletingChecklist}
  onconfirm={deleteChecklistConfirmed}
  oncancel={() => (checklistToDelete = null)}
/>

<Dialog
  bind:open={actionDialogOpen}
  title="Action WhatsApp"
  description="Otomasi kirim pesan ke pelanggan saat card masuk stage ini."
  size="md"
>
  <form
    onsubmit={(e) => {
      e.preventDefault();
      saveChecklistAction();
    }}
    class="space-y-4 py-2"
  >
    <FormField label="Jenis action">
      {#snippet control()}
        <SelectMenu
          options={actionKindOptions}
          bind:value={actionKind}
        />
      {/snippet}
    </FormField>

    {#if actionKind !== 'none'}
      <FormField
        label="Template pesan"
        helper="Variabel: {'{{nama}}'}, {'{{wa}}'}, {'{{product}}'}, {'{{tag}}'}, {'{{link}}'}"
        required
      >
        {#snippet control(args)}
          <Textarea
            {...args}
            bind:value={actionMessage}
            rows={4}
            placeholder="Halo {'{{nama}}'}, reminder webinar besok jam 19:00."
          />
        {/snippet}
      </FormField>

      <FormField label="Delay (menit setelah masuk stage)">
        {#snippet control(args)}
          <Input {...args} type="number" min="0" bind:value={actionDelayMinutes} class="h-10 text-sm" />
        {/snippet}
      </FormField>

      {#if actionKind === 'followup'}
        <label class="flex items-center gap-2 text-sm text-ink cursor-pointer">
          <Checkbox bind:checked={actionFollowupIfNoReply} />
          <span>Hanya kirim jika pelanggan belum membalas</span>
        </label>
      {/if}
    {/if}

    <div class="flex justify-end gap-2 pt-2">
      <Button variant="secondary" onclick={() => (actionDialogOpen = false)}>Batal</Button>
      <Button variant="primary" type="submit" loading={savingAction}>Simpan Action</Button>
    </div>
  </form>
</Dialog>
