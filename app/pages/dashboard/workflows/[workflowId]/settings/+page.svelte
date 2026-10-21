<script lang="ts">
  import { page } from '$app/state';
  import {
    api,
    ApiError,
    type ApiWorkflow,
    type ApiWorkspaceMember,
    type ApiWorkspaceMemberGroup,
    type ApiSheetsConnection,
    type ApiSpreadsheetInfo,
    type ApiSheetTabInfo,
    type ApiDriveItem
  } from '$lib/api/client';
  import {
    Button,
    Input,
    Skeleton,
    Badge
  } from '$lib/components/atoms/index.js';
  import {
    FormField,
    Breadcrumb,
    MultiSelectCombobox,
    SelectMenu,
    Tabs,
    toast
  } from '$lib/components/molecules/index.js';
  import { Dialog } from '$lib/components/organisms/index.js';
  import { HugeiconsIcon } from '@hugeicons/svelte';
  import {
    ArrowLeft01Icon,
    ArrowRight01Icon,
    Settings02Icon,
    Tick02Icon,
    AiSheetsIcon,
    Folder01Icon,
    Link01Icon,
    Refresh01Icon,
    UserGroupIcon,
    Clock01Icon,
    SquareLock02Icon,
    SlidersHorizontalIcon
  } from '@hugeicons/core-free-icons';
  import { dashboardText } from '$lib/i18n/dashboard.js';
  import { locale } from '$lib/i18n/index.js';
  import type { LayoutData } from '../../../$types';

  let { data }: { data: LayoutData } = $props();

  const tr = (key: string, values?: Record<string, string | number>) =>
    dashboardText($locale, key, values);

  const workflowId = $derived(page.params.workflowId);

  // Core Data
  let loadingData = $state(true);
  let workflow = $state<ApiWorkflow | null>(null);
  let members = $state<ApiWorkspaceMember[]>([]);
  let groups = $state<ApiWorkspaceMemberGroup[]>([]);
  let workflowGroupId = $state<string>('');

  const canManage = $derived(data.workspace?.role === 'owner' || workflow?.ownerId === data.user?.id);

  const groupOptions = $derived([
    { value: '', label: 'Semua Pegawai (Publik Bisnis)' },
    ...groups.map((g) => ({ value: g.id, label: `Departemen: ${g.name}` }))
  ]);

  const memberOptions = $derived(
    members.map((m) => ({
      value: m.id,
      label: m.name,
      sublabel: m.role ? tr(`members.role_${m.role}`) : undefined
    }))
  );

  // Active settings tab
  let activeTab = $state<'general' | 'access' | 'schedule' | 'integrations'>('general');

  const settingsTabs = [
    { value: 'general', label: 'Umum', shortLabel: 'Umum' },
    { value: 'access', label: 'Akses & PIC', shortLabel: 'Akses & PIC' },
    { value: 'schedule', label: 'Had Masa & Peringatan', shortLabel: 'Had Masa' },
    { value: 'integrations', label: 'Integrasi Google Sheets', shortLabel: 'Google Sheets' }
  ];
  // Form Fields
  let workflowName = $state('');
  let workflowDescription = $state('');
  let defaultAssigneeIds = $state<string[]>([]);
  let defaultAssigneeId = $state<string | null>(null);
  let urgency = $state<'high' | 'medium' | 'low'>('medium');
  let deadlineValue = $state('');
  let deadlineUnit = $state<'hours' | 'days'>('days');
  let reminderBeforeValue = $state('');
  let reminderBeforeUnit = $state<'hours' | 'days'>('hours');
  let repeatRule = $state<'none' | 'daily' | 'weekly' | 'monthly'>('none');
  let closureBy = $state<'initiator' | 'assignee'>('initiator');
  let savingWorkflow = $state(false);

  // Google Sheets integration state
  let sheetsLoading = $state(false);
  let sheetsConnections = $state<ApiSheetsConnection[]>([]);
  let sheetsAssigned = $derived(sheetsConnections.filter((c) => c.workflowId === workflowId));
  let sheetsUnassigned = $derived(sheetsConnections.filter((c) => !c.workflowId));
  let sheetsModalOpen = $state(false);
  let configuringConn = $state<ApiSheetsConnection | null>(null);
  let driveLoading = $state(false);
  let drivePath = $state<Array<{ id: string; name: string }>>([]);
  let driveItems = $state<ApiDriveItem[]>([]);
  let selectedSpreadsheetId = $state('');
  let selectedSpreadsheetName = $state('');
  let sheetTabs = $state<ApiSheetTabInfo[]>([]);
  let selectedSheetName = $state('');
  let sheetHeaders = $state<string[]>([]);
  let columnMapping = $state<{
    name: string;
    wa: string;
    product?: string;
    tag?: string;
  }>({ name: '', wa: '', product: '', tag: '' });
  let sheetsSaving = $state(false);
  let sheetsSyncingId = $state<string | null>(null);

  async function loadData() {
    if (!data.workspace?.id || !workflowId) return;
    loadingData = true;
    try {
      const [wfRes, membersRes, groupsRes] = await Promise.all([
        api.listWorkflows(data.workspace.id),
        api.listWorkspaceMembers(data.workspace.id).catch(() => ({ members: [] })),
        api.listWorkspaceMemberGroups(data.workspace.id).catch(() => ({ groups: [] }))
      ]);

      const found = wfRes.workflows?.find((w) => w.id === workflowId);
      if (found) {
        workflow = found;
        workflowName = found.name;
        workflowDescription = found.description ?? '';
        defaultAssigneeId = found.defaultAssigneeId ?? null;
        defaultAssigneeIds = found.defaultAssigneeIds ?? (found.defaultAssigneeId ? [found.defaultAssigneeId] : []);
        urgency = (found.urgency as any) || 'medium';
        deadlineValue = found.deadlineValue == null ? '' : String(found.deadlineValue);
        deadlineUnit = (found.deadlineUnit as any) || 'days';
        reminderBeforeValue = found.reminderBeforeValue == null ? '' : String(found.reminderBeforeValue);
        reminderBeforeUnit = (found.reminderBeforeUnit as any) || 'hours';
        repeatRule = (found.repeatRule as any) || 'none';
        closureBy = (found.closureBy as any) || 'initiator';
        workflowGroupId = found.workspaceMemberGroupId ?? '';
      }
      members = membersRes.members ?? [];
      groups = groupsRes.groups ?? [];
      await loadSheetsConnections();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Gagal memuat tetapan aliran kerja');
    } finally {
      loadingData = false;
    }
  }

  $effect(() => {
    loadData();
  });

  async function saveWorkflowSettings() {
    if (!canManage || !data.workspace?.id || !workflowId || !workflowName.trim()) return;
    savingWorkflow = true;
    try {
      const res = await api.updateWorkflow(data.workspace.id, workflowId, {
        name: workflowName.trim(),
        description: workflowDescription.trim() || null,
        workspaceMemberGroupId: workflowGroupId ? workflowGroupId : null,
        defaultAssigneeIds,
        urgency,
        deadlineValue: deadlineValue.trim() ? Number(deadlineValue) : null,
        deadlineUnit,
        reminderBeforeValue: reminderBeforeValue.trim() ? Number(reminderBeforeValue) : null,
        reminderBeforeUnit,
        repeatRule,
        closureBy
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

  // Google Sheets Helpers
  async function loadSheetsConnections() {
    const workspaceId = data.workspace?.id;
    if (!workspaceId) return;
    sheetsLoading = true;
    try {
      const res = await api.listSheetsConnections(workspaceId);
      sheetsConnections = res.connections ?? [];
    } catch {
      sheetsConnections = [];
    } finally {
      sheetsLoading = false;
    }
  }

  async function browseDriveFolder(parentId?: string) {
    const workspaceId = data.workspace?.id;
    if (!workspaceId || !configuringConn) return;
    driveLoading = true;
    try {
      const res = await api.browseSheetsDrive(workspaceId, configuringConn.id, parentId);
      driveItems = res.items ?? [];
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to browse Google Drive');
      driveItems = [];
    } finally {
      driveLoading = false;
    }
  }

  function openDriveFolder(folderId: string, folderName: string) {
    drivePath = [...drivePath, { id: folderId, name: folderName }];
    browseDriveFolder(folderId);
  }

  function navigateToPath(index: number) {
    if (index < 0) {
      drivePath = [];
      browseDriveFolder();
    } else {
      drivePath = drivePath.slice(0, index + 1);
      browseDriveFolder(drivePath[drivePath.length - 1].id);
    }
  }

  async function onSpreadsheetSelected(id: string, name: string) {
    const workspaceId = data.workspace?.id;
    if (!workspaceId || !configuringConn) return;
    selectedSpreadsheetId = id;
    selectedSpreadsheetName = name;
    selectedSheetName = '';
    sheetHeaders = [];
    try {
      const res = await api.listSheetsTabs(workspaceId, id, configuringConn.id);
      sheetTabs = res.sheets ?? [];
      if (sheetTabs.length === 1) {
        onSheetSelected(sheetTabs[0].title);
      }
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to load spreadsheet tabs');
      sheetTabs = [];
    }
  }

  async function onSheetSelected(sheetName: string) {
    const workspaceId = data.workspace?.id;
    if (!workspaceId || !selectedSpreadsheetId || !configuringConn) return;
    selectedSheetName = sheetName;
    try {
      const res = await api.getSheetsHeaders(workspaceId, selectedSpreadsheetId, sheetName, configuringConn.id);
      sheetHeaders = res.headers?.[0] ?? [];
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to read sheet headers');
      sheetHeaders = [];
    }
  }

  function openSheetsConfigureModal(conn: ApiSheetsConnection) {
    configuringConn = conn;
    if (conn.spreadsheetId && conn.spreadsheetName && conn.columnMapping) {
      selectedSpreadsheetId = conn.spreadsheetId;
      selectedSpreadsheetName = conn.spreadsheetName;
      selectedSheetName = conn.sheetName ?? '';
      columnMapping = {
        name: conn.columnMapping.name != null ? String(conn.columnMapping.name) : '',
        wa: conn.columnMapping.wa != null ? String(conn.columnMapping.wa) : '',
        product: conn.columnMapping.product != null ? String(conn.columnMapping.product) : '',
        tag: conn.columnMapping.tag != null ? String(conn.columnMapping.tag) : ''
      };
      if (selectedSheetName) {
        api.getSheetsHeaders(data.workspace!.id, conn.spreadsheetId, selectedSheetName, conn.id)
          .then((res) => { sheetHeaders = res.headers?.[0] ?? []; })
          .catch(() => {});
        api.listSheetsTabs(data.workspace!.id, conn.spreadsheetId, conn.id)
          .then((res) => { sheetTabs = res.sheets ?? []; })
          .catch(() => {});
      }
    } else {
      selectedSpreadsheetId = '';
      selectedSpreadsheetName = '';
      selectedSheetName = '';
      sheetTabs = [];
      sheetHeaders = [];
      columnMapping = { name: '', wa: '', product: '', tag: '' };
      drivePath = [];
      browseDriveFolder();
    }
    sheetsModalOpen = true;
  }

  function closeSheetsModal() {
    if (sheetsSaving) return;
    sheetsModalOpen = false;
    configuringConn = null;
  }

  async function saveSheetsConfig() {
    const workspaceId = data.workspace?.id;
    if (!workspaceId || !configuringConn) return;
    if (!selectedSpreadsheetId || !selectedSheetName) {
      toast.error('Please select a spreadsheet and sheet tab');
      return;
    }
    if (columnMapping.name === '' || columnMapping.wa === '') {
      toast.error('Please map at least Name and WhatsApp columns');
      return;
    }
    sheetsSaving = true;
    try {
      await api.configureSheetsConnection(workspaceId, configuringConn.id, {
        workflowId,
        spreadsheetId: selectedSpreadsheetId,
        spreadsheetName: selectedSpreadsheetName,
        sheetName: selectedSheetName,
        columnMapping: {
          name: Number(columnMapping.name),
          wa: Number(columnMapping.wa),
          product: columnMapping.product !== '' && columnMapping.product !== undefined ? Number(columnMapping.product) : null,
          tag: columnMapping.tag !== '' && columnMapping.tag !== undefined ? Number(columnMapping.tag) : null
        }
      });
      toast.success('Google Sheets sync configured');
      sheetsModalOpen = false;
      await loadSheetsConnections();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to save configuration');
    } finally {
      sheetsSaving = false;
    }
  }

  async function unassignSheet(connId: string) {
    const workspaceId = data.workspace?.id;
    if (!workspaceId) return;
    try {
      await api.updateSheetsConnection(workspaceId, connId, { workflowId: null });
      toast.success('Connection unassigned');
      await loadSheetsConnections();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to unassign connection');
    }
  }

  async function manualSyncSheet(connId: string) {
    const workspaceId = data.workspace?.id;
    if (!workspaceId) return;
    sheetsSyncingId = connId;
    try {
      const res = await api.syncSheetsConnection(workspaceId, connId);
      toast.success(`Sync complete: ${res.result.created ?? 0} rows created, ${res.result.skipped ?? 0} skipped`);
      await loadSheetsConnections();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Sync failed');
    } finally {
      sheetsSyncingId = null;
    }
  }
</script>

<div class="space-y-4 sm:space-y-6 pb-16">
  <!-- Top Header with Back Button and Actions -->
  <header class="space-y-2 sm:space-y-3">
    <div class="flex items-center justify-between gap-2">
      <Button
        href="/dashboard/workflows/{workflowId}"
        variant="ghost"
        size="sm"
        class="gap-1 text-xs sm:text-sm text-mute hover:text-ink pl-0 -ml-1 sm:ml-0"
      >
        <HugeiconsIcon icon={ArrowLeft01Icon} size={16} strokeWidth={2} />
        <span>Kembali</span>
      </Button>

      {#if canManage}
        <div class="flex items-center gap-2 sm:hidden">
          <Button
            variant="primary"
            size="sm"
            onclick={saveWorkflowSettings}
            loading={savingWorkflow}
            disabled={!workflowName.trim()}
            class="shadow-xs font-semibold h-8 text-xs px-3"
          >
            <HugeiconsIcon icon={Tick02Icon} size={14} strokeWidth={2} />
            <span>Simpan</span>
          </Button>
        </div>
      {/if}
    </div>

    <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div class="space-y-0.5 sm:space-y-1 min-w-0">
        <h1 class="text-xl sm:text-2xl font-bold tracking-tight text-ink truncate">
          {workflow?.name ?? 'Tetapan Aliran Kerja'}
        </h1>
        <p class="text-xs sm:text-sm text-mute leading-relaxed">
          {tr('setup.workflowSettingsDescription')}
        </p>
      </div>

      {#if canManage}
        <div class="hidden sm:flex items-center gap-2 shrink-0">
          <Button
            variant="primary"
            size="md"
            onclick={saveWorkflowSettings}
            loading={savingWorkflow}
            disabled={!workflowName.trim()}
            class="shadow-primary font-bold"
          >
            <HugeiconsIcon icon={Tick02Icon} size={16} strokeWidth={2} />
            <span>{tr('setup.saveSettings')}</span>
          </Button>
        </div>
      {/if}
    </div>
  </header>

  {#if loadingData}
    <div class="rounded-2xl border border-hairline bg-card p-8 space-y-4 shadow-card">
      <Skeleton shape="rect" class="h-8 w-48 rounded-lg" />
      <Skeleton shape="rect" class="h-10 w-full rounded-xl" />
      <Skeleton shape="rect" class="h-24 w-full rounded-xl" />
    </div>
  {:else}
    <!-- Tabbed Settings Navigation (Flowboard Defrag Style) -->
    <div class="border-b border-hairline -mx-4 sm:mx-0 px-4 sm:px-0">
      <div class="flex items-center gap-1 sm:gap-2 -mb-px overflow-x-auto scrollbar-none pb-0.5">
        {#each settingsTabs as tabItem}
          <button
            type="button"
            onclick={() => (activeTab = tabItem.value as any)}
            class="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition-all whitespace-nowrap shrink-0 cursor-pointer {activeTab === tabItem.value ? 'border-primary text-primary' : 'border-transparent text-mute hover:text-ink hover:border-hairline-strong'}"
          >
            {#if tabItem.value === 'general'}
              <HugeiconsIcon icon={SlidersHorizontalIcon} size={15} strokeWidth={1.8} />
            {:else if tabItem.value === 'access'}
              <HugeiconsIcon icon={UserGroupIcon} size={15} strokeWidth={1.8} />
            {:else if tabItem.value === 'schedule'}
              <HugeiconsIcon icon={Clock01Icon} size={15} strokeWidth={1.8} />
            {:else if tabItem.value === 'integrations'}
              <HugeiconsIcon icon={AiSheetsIcon} size={15} strokeWidth={1.8} />
            {/if}
            {#if tabItem.shortLabel && tabItem.shortLabel !== tabItem.label}
              <span class="hidden sm:inline">{tabItem.label}</span>
              <span class="sm:hidden">{tabItem.shortLabel}</span>
            {:else}
              <span>{tabItem.label}</span>
            {/if}
          </button>
        {/each}
      </div>
    </div>

    <!-- Form Content Container -->
    <form
      onsubmit={(e) => {
        e.preventDefault();
        saveWorkflowSettings();
      }}
      class="space-y-6"
    >
      <!-- TAB 1: UMUM (GENERAL) -->
      {#if activeTab === 'general'}
        <div class="rounded-2xl border border-hairline bg-card shadow-card p-4 sm:p-6 space-y-4 sm:space-y-5">
          <div class="space-y-1 pb-2 border-b border-hairline">
            <h2 class="ds-section-title text-ink">Maklumat Asas</h2>
            <p class="ds-caption text-mute">Nama dan konteks perihalan untuk aliran kerja ini.</p>
          </div>

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
            helper="Deskripsi singkat yang dipakai sebagai konteks untuk agen AI melalui MCP."
          >
            {#snippet control(args)}
              <textarea
                {...args}
                bind:value={workflowDescription}
                disabled={!canManage}
                placeholder={tr('setup.workflowDescriptionPlaceholder')}
                rows={4}
                class="w-full rounded-lg border border-line bg-surface px-3 py-2 text-base text-ink placeholder:text-mute focus:border-ink focus:outline-none disabled:opacity-50"
              ></textarea>
            {/snippet}
          </FormField>

          <FormField label={tr('setup.urgency')} helper={tr('setup.urgencyHelper')}>
            {#snippet control(args)}
              <SelectMenu
                {...args}
                bind:value={urgency}
                disabled={!canManage}
                options={[
                  { value: 'high', label: tr('setup.urgencyHigh') },
                  { value: 'medium', label: tr('setup.urgencyMedium') },
                  { value: 'low', label: tr('setup.urgencyLow') }
                ]}
              />
            {/snippet}
          </FormField>
        </div>
      {/if}

      <!-- TAB 2: AKSES & PIC -->
      {#if activeTab === 'access'}
        <div class="rounded-2xl border border-hairline bg-card shadow-card p-4 sm:p-6 space-y-4 sm:space-y-5">
          <div class="space-y-1 pb-2 border-b border-hairline">
            <h2 class="ds-section-title text-ink">Hak Akses & Agihan PIC</h2>
            <p class="ds-caption text-mute">Kawal akses ahli dan tetapkan agihan tugasan pelanggan secara automatik.</p>
          </div>

          <FormField
            label="Hak Akses Alur Kerja"
            helper="Pilih departemen pemegang alur kerja ini atau jadikan publik untuk semua pegawai."
          >
            {#snippet control(args)}
              <SelectMenu
                {...args}
                bind:value={workflowGroupId}
                disabled={!canManage}
                options={groupOptions}
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

          <FormField label={tr('setup.closureBy')} helper={tr('setup.closureByHelper')}>
            {#snippet control(args)}
              <SelectMenu
                {...args}
                bind:value={closureBy}
                disabled={!canManage}
                options={[
                  { value: 'initiator', label: tr('setup.closureInitiator') },
                  { value: 'assignee', label: tr('setup.closureAssignee') }
                ]}
              />
            {/snippet}
          </FormField>
        </div>
      {/if}

      <!-- TAB 3: HAD MASA & PERINGATAN -->
      {#if activeTab === 'schedule'}
        <div class="rounded-2xl border border-hairline bg-card shadow-card p-4 sm:p-6 space-y-4 sm:space-y-5">
          <div class="space-y-1 pb-2 border-b border-hairline">
            <h2 class="ds-section-title text-ink">Had Masa & Peringatan Automatik</h2>
            <p class="ds-caption text-mute">Tetapkan jangka masa sasaran untuk setiap tugasan pelanggan.</p>
          </div>

          <FormField label={tr('setup.deadline')} helper={tr('setup.deadlineHelper')}>
            {#snippet control()}
              <div class="flex gap-3">
                <Input
                  type="number"
                  bind:value={deadlineValue}
                  disabled={!canManage}
                  placeholder={tr('setup.deadlineValue')}
                  min={1}
                  max={365}
                  class="h-10 text-base w-32"
                />
                <div class="flex-1">
                  <SelectMenu
                    bind:value={deadlineUnit}
                    disabled={!canManage}
                    options={[
                      { value: 'hours', label: tr('setup.deadlineUnitHours') },
                      { value: 'days', label: tr('setup.deadlineUnitDays') }
                    ]}
                  />
                </div>
              </div>
            {/snippet}
          </FormField>

          <FormField label={tr('setup.reminderBefore')} helper={tr('setup.reminderHelper')}>
            {#snippet control()}
              <div class="flex gap-3">
                <Input
                  type="number"
                  bind:value={reminderBeforeValue}
                  disabled={!canManage}
                  placeholder={tr('setup.reminderValue')}
                  min={1}
                  max={720}
                  class="h-10 text-base w-32"
                />
                <div class="flex-1">
                  <SelectMenu
                    bind:value={reminderBeforeUnit}
                    disabled={!canManage}
                    options={[
                      { value: 'hours', label: tr('setup.reminderUnitHours') },
                      { value: 'days', label: tr('setup.reminderUnitDays') }
                    ]}
                  />
                </div>
              </div>
            {/snippet}
          </FormField>

          <FormField label={tr('setup.repeat')} helper={tr('setup.repeatHelper')}>
            {#snippet control(args)}
              <SelectMenu
                {...args}
                bind:value={repeatRule}
                disabled={!canManage}
                options={[
                  { value: 'none', label: tr('setup.repeatNone') },
                  { value: 'daily', label: tr('setup.repeatDaily') },
                  { value: 'weekly', label: tr('setup.repeatWeekly') },
                  { value: 'monthly', label: tr('setup.repeatMonthly') }
                ]}
              />
            {/snippet}
          </FormField>
        </div>
      {/if}

      <!-- TAB 4: INTEGRASI GOOGLE SHEETS -->
      {#if activeTab === 'integrations'}
        <div class="space-y-6">
          <div class="rounded-2xl border border-hairline bg-card shadow-card p-4 sm:p-6 space-y-4">
            <div class="space-y-1 pb-2 border-b border-hairline">
              <h2 class="ds-section-title text-ink">Google Sheets Sync</h2>
              <p class="ds-caption text-mute">Pautkan akaun Google yang bersambung untuk menyegerakkan baris hamparan ke dalam aliran kerja ini secara berterusan.</p>
            </div>

            {#if sheetsLoading}
              <p class="text-sm text-mute">Memuatkan integrasi…</p>
            {:else}
              {#if sheetsAssigned.length > 0}
                <div class="space-y-3">
                  {#each sheetsAssigned as conn (conn.id)}
                    <div class="rounded-xl border border-hairline bg-canvas px-4 py-3">
                      <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                        <div class="min-w-0 flex-1 space-y-1">
                          <div class="flex items-center gap-2">
                            <HugeiconsIcon icon={AiSheetsIcon} size={16} strokeWidth={1.8} class="text-primary" />
                            <span class="ds-label truncate text-ink">{conn.name}</span>
                            <Badge tone={conn.enabled ? 'done' : 'idle'}>
                              {conn.enabled ? 'Aktif' : 'Dinyahaktifkan'}
                            </Badge>
                          </div>
                          <p class="ds-caption text-mute">{conn.spreadsheetName} · {conn.sheetName}</p>
                          {#if conn.lastSyncedAt}
                            <p class="text-xs text-mute">Segerak terakhir: {new Date(conn.lastSyncedAt).toLocaleString()}</p>
                          {/if}
                        </div>
                        {#if canManage}
                          <div class="flex shrink-0 flex-wrap items-center gap-1">
                            <Button variant="ghost" size="sm" onclick={() => manualSyncSheet(conn.id)} disabled={sheetsSyncingId === conn.id}>
                              <HugeiconsIcon icon={Refresh01Icon} size={15} strokeWidth={1.8} />
                              Segerak
                            </Button>
                            <Button variant="ghost" size="sm" onclick={() => openSheetsConfigureModal(conn)}>Sunting</Button>
                            <Button variant="ghost" size="sm" onclick={() => unassignSheet(conn.id)}>Nyahpaut</Button>
                          </div>
                        {/if}
                      </div>
                    </div>
                  {/each}
                </div>
              {/if}

              {#if sheetsUnassigned.length > 0}
                <div class="space-y-2 pt-2">
                  <p class="ds-label text-ink">Sambungan Tersedia</p>
                  <div class="space-y-2">
                    {#each sheetsUnassigned as conn (conn.id)}
                      <div class="flex items-center justify-between rounded-xl border border-dashed border-hairline-strong bg-canvas-sunken px-4 py-3">
                        <div class="flex items-center gap-2 min-w-0">
                          <HugeiconsIcon icon={AiSheetsIcon} size={16} strokeWidth={1.8} class="text-mute" />
                          <span class="ds-label truncate text-ink">{conn.name}</span>
                        </div>
                        {#if canManage}
                          <Button variant="secondary" size="sm" onclick={() => openSheetsConfigureModal(conn)}>
                            <HugeiconsIcon icon={Link01Icon} size={15} strokeWidth={1.8} />
                            Pautkan
                          </Button>
                        {/if}
                      </div>
                    {/each}
                  </div>
                </div>
              {/if}

              {#if sheetsAssigned.length === 0 && sheetsUnassigned.length === 0}
                <div class="rounded-xl border border-dashed border-hairline-strong bg-canvas-sunken px-4 py-8 text-center">
                  <HugeiconsIcon icon={AiSheetsIcon} size={28} strokeWidth={1.8} class="mx-auto text-mute" />
                  <p class="text-sm text-mute mt-2">Tiada sambungan Google Sheets tersedia. Sambungkan akaun Google dari menu Tetapan Integrasi terlebih dahulu.</p>
                </div>
              {/if}
            {/if}
          </div>
        </div>
      {/if}

      <!-- Bottom Save Action Bar -->
      {#if canManage}
        <div class="flex items-center justify-between gap-3 pt-4 border-t border-hairline">
          <Button href="/dashboard/workflows/{workflowId}" variant="secondary" size="md" class="flex-1 sm:flex-none justify-center">
            Batal
          </Button>

          <Button
            variant="primary"
            size="md"
            type="submit"
            loading={savingWorkflow}
            disabled={!workflowName.trim()}
            class="flex-1 sm:flex-none justify-center shadow-primary font-bold"
          >
            <HugeiconsIcon icon={Tick02Icon} size={16} strokeWidth={2} />
            <span>{tr('setup.saveSettings')}</span>
          </Button>
        </div>
      {/if}
    </form>
  {/if}
</div>

<!-- Modal: Configure Google Sheets Connection -->
<Dialog
  bind:open={sheetsModalOpen}
  title="Konfigurasi Google Sheets Sync"
  description="Pilih hamparan dan petakan lajur ke medan aliran kerja."
  size="lg"
  onclose={closeSheetsModal}
>
  <div class="space-y-4">
    {#if configuringConn}
      <div class="rounded-xl border border-hairline bg-canvas-sunken px-4 py-3 flex items-center gap-2">
        <HugeiconsIcon icon={AiSheetsIcon} size={16} strokeWidth={1.8} class="text-primary" />
        <span class="ds-label text-ink">{configuringConn.name}</span>
      </div>
    {/if}

    <div>
      <label class="ds-label text-ink mb-2 block">Pilih Hamparan (Spreadsheet)</label>
      {#if selectedSpreadsheetId}
        <div class="rounded-xl border border-primary bg-primary-soft px-4 py-3 flex items-center justify-between gap-2">
          <div class="flex items-center gap-2 min-w-0">
            <HugeiconsIcon icon={AiSheetsIcon} size={16} strokeWidth={1.8} class="text-primary shrink-0" />
            <span class="ds-label text-ink truncate">{selectedSpreadsheetName}</span>
          </div>
          <button type="button" onclick={() => { selectedSpreadsheetId = ''; selectedSpreadsheetName = ''; sheetTabs = []; sheetHeaders = []; selectedSheetName = ''; }} class="text-sm text-mute hover:text-ink shrink-0 cursor-pointer">Tukar</button>
        </div>
      {:else}
        {#if drivePath.length > 0}
          <button type="button" onclick={() => navigateToPath(drivePath.length - 2)} class="flex items-center gap-1 mb-3 text-sm text-mute hover:text-ink transition-colors cursor-pointer">
            <HugeiconsIcon icon={ArrowLeft01Icon} size={14} strokeWidth={1.8} />
            <span>{drivePath[drivePath.length - 1].name}</span>
          </button>
        {/if}

        <div class="rounded-xl border border-hairline bg-canvas-sunken overflow-hidden">
          {#if driveLoading}
            <div class="divide-y divide-hairline">
              {#each Array(5) as _}
                <div class="flex items-center gap-3 px-4 py-2.5">
                  <Skeleton class="h-[18px] w-[18px] rounded-md shrink-0" />
                  <Skeleton class="h-4 flex-1 rounded-lg" />
                  <Skeleton class="h-[14px] w-[14px] rounded shrink-0" />
                </div>
              {/each}
            </div>
          {:else if driveItems.length === 0}
            <div class="px-4 py-8 text-center">
              <p class="text-sm text-mute">Tiada folder atau hamparan di sini.</p>
            </div>
          {:else}
            <div class="max-h-64 overflow-y-auto divide-y divide-hairline">
              {#each driveItems as item (item.id)}
                <button
                  type="button"
                  onclick={() => item.isFolder ? openDriveFolder(item.id, item.name) : onSpreadsheetSelected(item.id, item.name)}
                  class="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-lane cursor-pointer"
                >
                  {#if item.isFolder}
                    <HugeiconsIcon icon={Folder01Icon} size={18} strokeWidth={1.8} class="text-primary shrink-0" />
                  {:else}
                    <HugeiconsIcon icon={AiSheetsIcon} size={18} strokeWidth={1.8} class="text-mute shrink-0" />
                  {/if}
                  <span class="text-sm text-ink truncate flex-1">{item.name}</span>
                  {#if item.isFolder}
                    <HugeiconsIcon icon={ArrowRight01Icon} size={14} strokeWidth={1.8} class="text-mute shrink-0" />
                  {/if}
                </button>
              {/each}
            </div>
          {/if}
        </div>
      {/if}
    </div>

    {#if selectedSpreadsheetId && sheetTabs.length > 0}
      <div>
        <label class="ds-label text-ink mb-2 block">Pilih Tab Lembaran</label>
        <SelectMenu
          options={sheetTabs.map((t) => ({ value: t.title, label: t.title }))}
          bind:value={selectedSheetName}
          onchange={(val) => onSheetSelected(val)}
        />
      </div>
    {/if}

    {#if selectedSheetName && sheetHeaders.length > 0}
      <div class="space-y-3 pt-2 border-t border-hairline">
        <label class="ds-label text-ink block">Pemetaan Lajur (Column Mapping)</label>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FormField label="Nama Pelanggan" required>
            {#snippet control()}
              <SelectMenu
                options={[{ value: '', label: 'Pilih lajur…' }, ...sheetHeaders.map((h, i) => ({ value: String(i), label: h }))]}
                bind:value={columnMapping.name}
              />
            {/snippet}
          </FormField>

          <FormField label="Nombor WhatsApp" required>
            {#snippet control()}
              <SelectMenu
                options={[{ value: '', label: 'Pilih lajur…' }, ...sheetHeaders.map((h, i) => ({ value: String(i), label: h }))]}
                bind:value={columnMapping.wa}
              />
            {/snippet}
          </FormField>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FormField label="Produk (Pilihan)">
            {#snippet control()}
              <SelectMenu
                options={[{ value: '', label: 'Tiada' }, ...sheetHeaders.map((h, i) => ({ value: String(i), label: h }))]}
                bind:value={columnMapping.product}
              />
            {/snippet}
          </FormField>

          <FormField label="Tag (Pilihan)">
            {#snippet control()}
              <SelectMenu
                options={[{ value: '', label: 'Tiada' }, ...sheetHeaders.map((h, i) => ({ value: String(i), label: h }))]}
                bind:value={columnMapping.tag}
              />
            {/snippet}
          </FormField>
        </div>
      </div>
    {/if}
  </div>

  {#snippet footer()}
    <div class="flex justify-end gap-2">
      <Button variant="secondary" onclick={closeSheetsModal}>Batal</Button>
      <Button
        variant="primary"
        onclick={saveSheetsConfig}
        loading={sheetsSaving}
        disabled={!selectedSpreadsheetId || !selectedSheetName || columnMapping.name === '' || columnMapping.wa === ''}
      >
        <HugeiconsIcon icon={Tick02Icon} size={16} strokeWidth={2} />
        <span>Simpan Konfigurasi</span>
      </Button>
    </div>
  {/snippet}
</Dialog>
