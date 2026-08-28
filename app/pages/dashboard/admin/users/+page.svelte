<script lang="ts">
  import { api, type ApiAdminUser, type ApiAdminSubscription } from '$lib/api/client';
  import { dashboardText, dashboardIntlLocale } from '$lib/i18n/dashboard.js';
  import { locale } from '$lib/i18n/index.js';
  import { Skeleton } from '$lib/components/atoms/index.js';
  import { SearchInput, StatCard, Tabs } from '$lib/components/molecules/index.js';
  import { DataTable } from '$lib/components/organisms/index.js';
  import type { TableColumn } from '$lib/components/organisms/shared.js';
  import type { TabItem } from '$lib/components/molecules/shared.js';
  import { HugeiconsIcon } from '@hugeicons/svelte';
  import { UserGroupIcon, UserSquareIcon, UserMultipleIcon } from '@hugeicons/core-free-icons';

  const tr = (key: string, values?: Record<string, string | number>) =>
    dashboardText($locale, key, values);

  let users = $state<ApiAdminUser[]>([]);
  let subscriptions = $state<ApiAdminSubscription[]>([]);
  let loading = $state(true);
  let query = $state('');
  let roleFilter = $state<'all' | 'admins' | 'regular'>('all');

  let initialized = $state(false);
  $effect(() => {
    if (initialized) return;
    initialized = true;
    load();
  });

  async function load() {
    loading = true;
    try {
      const [usersRes, subsRes] = await Promise.all([
        api.adminListUsers(),
        api.adminListSubscriptions().catch(() => ({ subscriptions: [] }))
      ]);
      users = usersRes.users;
      subscriptions = subsRes.subscriptions;
    } catch {
      users = [];
    } finally {
      loading = false;
    }
  }

  const adminCount = $derived(users.filter((u) => u.platformAdmin).length);
  const regularCount = $derived(users.length - adminCount);

  // Map workspaceId -> plan name for quick lookup
  const planByWorkspace = $derived(
    new Map(subscriptions.map((s) => [s.workspace.id, s.plan.name]))
  );

  function planForUser(user: ApiAdminUser): string {
    if (!user.activeWorkspaceId) return tr('admin.users.noPlan');
    return planByWorkspace.get(user.activeWorkspaceId) ?? tr('admin.users.noPlan');
  }

  const roleTabItems = $derived<TabItem[]>([
    { value: 'all', label: tr('admin.users.filterAll'), badge: users.length },
    { value: 'admins', label: tr('admin.users.filterAdmins'), badge: adminCount },
    { value: 'regular', label: tr('admin.users.filterRegular'), badge: regularCount }
  ]);

  const filtered = $derived.by(() => {
    let list = users;
    if (roleFilter === 'admins') list = list.filter((u) => u.platformAdmin);
    else if (roleFilter === 'regular') list = list.filter((u) => !u.platformAdmin);
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
      );
    }
    return list;
  });

  // Attach a 1-based index for the numbering column
  const rowsWithIndex = $derived(
    filtered.map((u, i) => ({ ...u, _rowNumber: i + 1 }))
  );

  const formatDate = (dateStr: string) =>
    new Intl.DateTimeFormat(dashboardIntlLocale($locale), {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(new Date(dateStr));

  const columns = $derived<TableColumn<(ApiAdminUser & { _rowNumber: number }) & Record<string, unknown>>[]>([
    {
      key: '_rowNumber',
      label: tr('admin.users.number'),
      align: 'center',
      render: (row) => String(row._rowNumber)
    },
    { key: 'name', label: tr('admin.users.name'), sortable: true },
    { key: 'email', label: tr('admin.users.email') },
    {
      key: 'platformAdmin',
      label: tr('admin.users.role'),
      render: (row) => (row.platformAdmin ? tr('admin.users.roleAdmin') : tr('admin.users.roleUser'))
    },
    {
      key: 'plan',
      label: tr('admin.users.plan'),
      render: (row) => planForUser(row)
    },
    {
      key: 'createdAt',
      label: tr('admin.users.joined'),
      render: (row) => formatDate(row.createdAt)
    }
  ]);
</script>

<svelte:head><title>{tr('admin.users.title')} — Flowboard</title></svelte:head>

{#snippet totalIcon()}
  <HugeiconsIcon icon={UserMultipleIcon} size={18} strokeWidth={1.8} />
{/snippet}

{#snippet adminsIcon()}
  <HugeiconsIcon icon={UserSquareIcon} size={18} strokeWidth={1.8} />
{/snippet}

{#snippet regularIcon()}
  <HugeiconsIcon icon={UserGroupIcon} size={18} strokeWidth={1.8} />
{/snippet}

<div class="space-y-6 sm:space-y-8">
  <header class="space-y-3">
    <h1 class="ds-page-title text-ink">{tr('admin.users.title')}</h1>
    <p class="ds-caption text-mute">{tr('admin.users.description')}</p>
  </header>

  <!-- Stat summary -->
  <section>
    {#if loading}
      <div class="grid grid-cols-3 gap-3 sm:gap-4">
        {#each [1, 2, 3] as _i}
          <div class="rounded-2xl border border-hairline bg-card p-5 space-y-3 shadow-card">
            <Skeleton shape="circle" class="h-9 w-9 rounded-lg" />
            <Skeleton shape="rect" class="h-4 w-20 rounded-md" />
            <Skeleton shape="rect" class="h-7 w-14 rounded-md" />
          </div>
        {/each}
      </div>
    {:else}
      <div class="grid grid-cols-3 gap-3 sm:gap-4">
        <StatCard
          label={tr('admin.stats.total')}
          value={String(users.length)}
          icon={totalIcon}
          class="rounded-2xl"
        />
        <StatCard
          label={tr('admin.stats.admins')}
          value={String(adminCount)}
          icon={adminsIcon}
          class="rounded-2xl"
        />
        <StatCard
          label={tr('admin.stats.regular')}
          value={String(regularCount)}
          icon={regularIcon}
          class="rounded-2xl"
        />
      </div>
    {/if}
  </section>

  <!-- Role filter + search -->
  <section class="space-y-4">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <Tabs
        items={roleTabItems}
        bind:value={roleFilter}
        variant="pills"
        size="md"
      />
      <div class="max-w-sm flex-1">
        <SearchInput
          bind:value={query}
          placeholder={tr('admin.search.users')}
          submit={false}
          size="md"
        />
      </div>
    </div>

    <DataTable
      {columns}
      rows={rowsWithIndex as ((ApiAdminUser & { _rowNumber: number }) & Record<string, unknown>)[]}
      loading={loading}
      rowKey="id"
      emptyTitle={query || roleFilter !== 'all' ? tr('admin.empty.noResults') : tr('admin.users.empty')}
      emptyDescription={query || roleFilter !== 'all' ? tr('admin.empty.noResultsDesc') : tr('admin.users.emptyDesc')}
    />
  </section>
</div>
