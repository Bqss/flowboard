<script lang="ts">
  import { api, type ApiAdminWorkspace } from '$lib/api/client';
  import { dashboardText } from '$lib/i18n/dashboard.js';
  import { locale } from '$lib/i18n/index.js';
  import { DataTable } from '$lib/components/organisms/index.js';
  import type { TableColumn } from '$lib/components/organisms/shared.js';
  import { dashboardIntlLocale } from '$lib/i18n/dashboard.js';

  const tr = (key: string, values?: Record<string, string | number>) =>
    dashboardText($locale, key, values);

  let workspaces = $state<ApiAdminWorkspace[]>([]);
  let loading = $state(true);

  let initialized = $state(false);
  $effect(() => {
    if (initialized) return;
    initialized = true;
    load();
  });

  async function load() {
    loading = true;
    try {
      const res = await api.adminListWorkspaces();
      workspaces = res.workspaces;
    } catch {
      workspaces = [];
    } finally {
      loading = false;
    }
  }

  const formatDate = (dateStr: string) =>
    new Intl.DateTimeFormat(dashboardIntlLocale($locale), {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(new Date(dateStr));

  const columns = $derived<TableColumn<ApiAdminWorkspace & Record<string, unknown>>[]>([
    { key: 'name', label: tr('admin.workspaces.name'), sortable: true },
    { key: 'slug', label: tr('admin.workspaces.slug') },
    {
      key: 'createdAt',
      label: tr('admin.workspaces.created'),
      render: (row) => formatDate(row.createdAt)
    }
  ]);
</script>

<svelte:head><title>{tr('admin.workspaces.title')} — actjom</title></svelte:head>

<div class="space-y-6 sm:space-y-8">
  <header class="space-y-3">
    <h1 class="ds-page-title text-ink">{tr('admin.workspaces.title')}</h1>
    <p class="ds-caption text-mute">{tr('admin.workspaces.description')}</p>
  </header>

  <DataTable
    {columns}
    rows={workspaces as (ApiAdminWorkspace & Record<string, unknown>)[]}
    {loading}
    rowKey="id"
    emptyTitle={tr('admin.workspaces.empty')}
    emptyDescription={tr('admin.workspaces.emptyDesc')}
  />
</div>
